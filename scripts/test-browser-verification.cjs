const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),ts=require("typescript");
const output=ts.transpileModule(fs.readFileSync("src/lib/browser-verification.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const moduleObject={exports:{}},navigations=[];
vm.runInNewContext(output,{module:moduleObject,exports:moduleObject.exports,window:{location:{
  pathname:"/feed",search:"?tag=car",assign:url=>navigations.push(url)
}}});
const handle=moduleObject.exports.handleVerificationRequired;
assert.equal(handle({status:200},{code:"verification_required"}),false);
assert.equal(handle({status:429},{code:"different"}),false);
assert.equal(handle({status:429},null),false);
assert.equal(handle({status:429},{code:"verification_required",verification_url:"https://evil.invalid"}),true);
assert.deepEqual(navigations,["/verify-search?returnTo=%2Ffeed%3Ftag%3Dcar"]);
console.log("PASS: browser recovery only for challenge responses, current-page return target, untrusted URL ignored");
