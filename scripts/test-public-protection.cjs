// Run: node scripts/test-public-protection.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const ts = require("typescript");
const { NextRequest, NextResponse } = require("next/server");
const jose = require("jose");
const root = path.resolve(__dirname, "..");
let ctx = {}, env = {}, edge, now = 0, fetcher;
class Clock extends Date { static now() { return Date.now() + now; } }
const modules = new Map();
function load(file) {
  file = path.resolve(root, file);
  if (modules.has(file)) return modules.get(file);
  const out = { exports: {} };
  const sandbox = { module: out, exports: out.exports, Request, Response, Headers,
    URL, URLSearchParams, TextEncoder, TextDecoder, crypto, AbortSignal, Date: Clock,
    fetch: (...a) => fetcher(...a), get caches() { return { default: edge }; },
    require(id) {
      if (id === "jose") return jose;
      if (id === "next/server") return { NextRequest, NextResponse };
      if (id === "@opennextjs/cloudflare") return { getCloudflareContext: () => ({ ctx, env }) };
      const target = id.startsWith("@/") ? "src/" + id.slice(2) :
        path.relative(root, path.resolve(path.dirname(file), id));
      return load(target + ".ts");
    }
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText, sandbox, { filename: file });
  modules.set(file, out.exports);
  return out.exports;
}
(async () => {
  const { safeSearchReturn, SEARCH_COOKIE } = load("src/lib/search-verification.ts");
  const origin = fs.readFileSync(path.join(root,"src/lib/search-grant.ts"),"utf8").match(/SITE_ORIGIN = "([^"]+)"/)[1];
  for (const bad of ["https://evil.invalid/p", "//evil.invalid/", "/api/feed", "/verify-search", "/_next/a"]) assert.equal(safeSearchReturn(bad), "/");
  assert.equal(safeSearchReturn("/p/example?x=1"), "/p/example?x=1");
  assert.equal(safeSearchReturn(origin + "//evil.invalid/"), "/");
  const { issueSearchGrant, verifySearchGrant } = load("src/lib/search-grant.ts");
  const secret = "test-only-secret-not-production", ip = "192.0.2.1";
  const token = await issueSearchGrant(secret, ip);
  assert.ok(await verifySearchGrant(token, secret, ip));
  assert.equal(await verifySearchGrant(token, secret, "192.0.2.2"), null);
  assert.equal(await verifySearchGrant(token, "wrong", ip), null);
  assert.equal(await verifySearchGrant(token.slice(0,-5)+"xxxxx", secret, ip), null);
  const expired = await new jose.SignJWT({ip}).setProtectedHeader({alg:"HS256"})
    .setIssuer("public-search-v2").setAudience(origin).setJti("expired")
    .setIssuedAt(Math.floor(Date.now()/1000)-7200).setExpirationTime(Math.floor(Date.now()/1000)-3600)
    .sign(new TextEncoder().encode("public-search-v2\0"+secret));
  assert.equal(await verifySearchGrant(expired, secret, ip), null);
  const { guardPublicPageRequest } = load("src/lib/request-guard.ts");
  let pageAllow = false, apiAllow = true, searchAllow = true, aggregateAllow = true;
  let riskAllow = true, verifiedAllow = true, verifyAllow = true, failureCalls = 0;
  env = { TURNSTILE_SECRET_KEY: secret,
    ABUSE_RISK_LIMIT: { limit: async()=>({success:riskAllow}) },
    ABUSE_VERIFIED_LIMIT: { limit: async()=>({success:verifiedAllow}) },
    ABUSE_VERIFY_LIMIT: { limit: async()=>({success:verifyAllow}) },
    ABUSE_FAILURE_LIMIT: { limit: async()=>({success:++failureCalls<=5}) },
    ABUSE_PAGE_LIMIT: { limit: async()=>({success:pageAllow}) },
    ABUSE_API_LIMIT: { limit: async()=>({success:apiAllow}) },
    ABUSE_SEARCH_LIMIT: { limit: async()=>({success:searchAllow}) },
    ABUSE_AGGREGATE_LIMIT: { limit: async()=>({success:aggregateAllow}) } };
  const req = (p,verified=false,method="GET")=>new NextRequest(origin+p,{method,headers:{
    "cf-connecting-ip":ip,...(verified?{cookie:SEARCH_COOKIE+"="+token}:{})}});
  assert.equal((await guardPublicPageRequest(req("/p/example"))).status,307);
  assert.equal((await guardPublicPageRequest(req("/p/example.txt"))).status,307);
  assert.equal(await guardPublicPageRequest(req("/p/example",true)),null);
  assert.equal((await guardPublicPageRequest(req("/?q=car"))).status,307);
  assert.equal(await guardPublicPageRequest(req("/?q=car",true)),null);
  searchAllow=false;
  assert.equal((await guardPublicPageRequest(req("/?q=car",true))).status,429);
  searchAllow=true; apiAllow=false;
  assert.equal((await guardPublicPageRequest(req("/api/feed"))).headers.get("retry-after"),"60");
  assert.equal(await guardPublicPageRequest(req("/auth/login")),null);
  assert.equal(await guardPublicPageRequest(req("/api/private")),null);
  assert.equal(await guardPublicPageRequest(req("/api/posts/like",false,"POST")),null);
  apiAllow=true;
  const { POST }=load("src/app/api/search-verification/route.ts");
  fetcher=async()=>Response.json({success:true,hostname:new URL(origin).hostname,action:"public-search"});
  const vr=()=>new Request(origin+"/api/search-verification",{method:"POST",headers:{
    origin,"cf-connecting-ip":ip,"content-type":"application/json"},body:JSON.stringify({token:"turnstile-mock",returnTo:"/p/example"})});
  const verified=await POST(vr());
  assert.equal(verified.status,200);
  assert.equal((await verified.json()).returnTo,"/p/example");
  const issued=verified.cookies.get(SEARCH_COOKIE).value;
  assert.ok(await verifySearchGrant(issued,secret,ip)); // No Cache API grant needed.
  verifyAllow=false; assert.equal((await POST(vr())).status,429); verifyAllow=true;
  fetcher=async()=>Response.json({success:true,hostname:"evil.invalid",action:"public-search"});
  assert.equal((await POST(vr())).status,403);

  // A solved challenge is no longer an unlimited browsing exemption.
  verifiedAllow=false;
  assert.equal((await guardPublicPageRequest(req("/p/example",true))).status,429);
  verifiedAllow=true;
  // IP ceilings survive new signed grants.
  const aggregate=env.ABUSE_AGGREGATE_LIMIT;
  env.ABUSE_AGGREGATE_LIMIT={limit:async({key})=>({success:!key.includes("verified-ip:")})};
  assert.equal((await guardPublicPageRequest(req("/p/example",true))).status,429);
  const rotated=await issueSearchGrant(secret,ip);
  assert.equal((await guardPublicPageRequest(new NextRequest(origin+"/",{headers:{
    "cf-connecting-ip":ip,cookie:SEARCH_COOKIE+"="+rotated
  }}))).status,429);
  env.ABUSE_AGGREGATE_LIMIT=aggregate;
  // Native counters are mocked, but markers use the actual expiring-state helper.
  const markers=new Map();
  edge={match:async r=>markers.get(r.url)?.clone(),put:async(r,v)=>markers.set(r.url,v.clone())};
  pageAllow=true; riskAllow=false;
  assert.equal((await guardPublicPageRequest(req("/?category=news"))).status,307);
  riskAllow=true;
  assert.equal((await guardPublicPageRequest(req("/"))).status,307); // sticky across URLs
  assert.equal(await guardPublicPageRequest(req("/",true)),null); // shared-IP recovery
  const apiChallenge=await guardPublicPageRequest(req("/api/feed"));
  assert.equal(apiChallenge.status,429);
  assert.equal((await apiChallenge.json()).code,"verification_required");
  assert.equal(apiChallenge.headers.get("location"),null); // no HTML redirect for APIs
  assert.equal(await guardPublicPageRequest(req("/api/mobile/posts")),null); // Native API remains usable behind a browser flag.
  apiAllow=false;
  const mobileLimit=await guardPublicPageRequest(req("/api/mobile/posts"));
  assert.equal(mobileLimit.status,429);assert.equal((await mobileLimit.json()).code,undefined);
  apiAllow=true;
  now+=901000;
  assert.equal(await guardPublicPageRequest(req("/")),null); // expires without extending on read
  now=0; markers.clear();
  // Expired/duplicate tokens and provider failures never count as hostile submissions.
  fetcher=async()=>Response.json({success:false,"error-codes":["timeout-or-duplicate"]});
  assert.equal((await POST(vr())).status,403); assert.equal(failureCalls,0);
  fetcher=async()=>Response.json({success:false,"error-codes":["internal-error"]});
  assert.equal((await POST(vr())).status,503); assert.equal(failureCalls,0);
  fetcher=async()=>Response.json({success:false,"error-codes":["invalid-input-secret"]});
  assert.equal((await POST(vr())).status,503); assert.equal(failureCalls,0);
  fetcher=async()=>Response.json({success:false,"error-codes":["invalid-input-response"]});
  for(let i=0;i<5;i++)assert.equal((await POST(vr())).status,403);
  assert.equal((await POST(vr())).status,429);
  let siteverifyCalls=0;
  fetcher=async()=>{siteverifyCalls++;return Response.json({success:true,hostname:new URL(origin).hostname,action:"public-search"});};
  assert.equal((await POST(vr())).status,429);assert.equal(siteverifyCalls,0);
  now+=61000;
  assert.equal((await POST(vr())).status,200);assert.equal(siteverifyCalls,1);
  now=0; markers.clear(); edge=undefined;
  const oversized=new Request(origin+"/api/search-verification",{method:"POST",headers:{
    origin,"cf-connecting-ip":ip,"content-type":"application/json"},body:"x".repeat(8193)});
  assert.equal((await POST(oversized)).status,413);
  const foreign=new Request(origin+"/api/search-verification",{method:"POST",headers:{
    origin:"https://evil.invalid","content-type":"application/json"},body:"{}"});
  assert.equal((await POST(foreign)).status,403);

  const { cachePublicJson }=load("src/lib/server-cache.ts");
  let reads=0, release;
  const loader=async()=>{reads++;await new Promise(r=>release=r);return {n:1};};
  const a=cachePublicJson("test",[],1,loader);
  const b=cachePublicJson("test",[],1,loader);
  await Promise.resolve(); release();
  const [av,bv]=await Promise.all([a,b]); assert.equal(reads,1);
  av.n=9; assert.equal(bv.n,1);
  ctx={}; assert.equal((await cachePublicJson("test",[],1,loader)).n,1); assert.equal(reads,1);
  now+=1100;
  assert.equal((await cachePublicJson("test",[],1,async()=>{reads++;return {n:2};})).n,2);
  assert.equal(reads,2);
  for(let i=0;i<2;i++)await cachePublicJson("skip",[],1,async()=>{reads++;return 1;},()=>false);
  assert.equal(reads,4);
  await assert.rejects(cachePublicJson("error",[],1,async()=>{throw Error("test");}));
  assert.equal(await cachePublicJson("error",[],1,async()=>7),7);
  let releases=[], separateReads=0;
  const slow=()=>new Promise(resolve=>{separateReads++;releases.push(()=>resolve(1));});
  ctx={}; const c=cachePublicJson("separate",[],1,slow);
  ctx={}; const d=cachePublicJson("separate",[],1,slow);
  await Promise.resolve(); releases.forEach(r=>r()); await Promise.all([c,d]);
  assert.equal(separateReads,2); // Never share I/O promises across requests.
  edge={match:async()=>{throw Error("cache unavailable");},put:async()=>{throw Error("cache unavailable");}};
  assert.equal(await cachePublicJson("outage",[],1,async()=>8),8);
  let edgeHits=0;
  edge={match:async()=>{edgeHits++;return new Response("9",{headers:{"x-data-expires":String(Clock.now()+100)}});}};
  assert.equal(await cachePublicJson("edge",[],60,async()=>10),9);
  assert.equal(await cachePublicJson("edge",[],60,async()=>10),9);
  assert.equal(edgeHits,1);
  now+=200; edge={match:async()=>undefined,put:async()=>{}};
  assert.equal(await cachePublicJson("edge",[],60,async()=>10),10); // Keep edge's original TTL.
  console.log("PASS: safe redirects, signed grants, expiry, IP binding, challenge recovery, API/search limits, verification route, cache TTL, deduplication and request isolation");
})().catch(e=>{console.error(e);process.exitCode=1;});
