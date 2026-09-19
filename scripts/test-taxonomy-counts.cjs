// Run: node scripts/test-taxonomy-counts.cjs (Node with node:sqlite)
const {DatabaseSync}=require("node:sqlite");
const fs=require("node:fs"),assert=require("node:assert/strict");
const db=new DatabaseSync(":memory:");
db.exec("CREATE TABLE posts_categories(posts_category_id,code,is_active,sort_order); CREATE TABLE posts_category_translations(posts_category_id,locale,name,description); CREATE TABLE posts_subcategories(posts_subcategory_id,posts_category_id,code,is_active,sort_order); CREATE TABLE posts_subcategory_translations(posts_subcategory_id,locale,name,description); CREATE TABLE posts(post_id INTEGER PRIMARY KEY,visibility,locale); CREATE TABLE posts_subcategory_assignments(post_id,posts_subcategory_id);");
db.exec("INSERT INTO posts_categories VALUES(1,'news',1,1),(2,'empty',1,2),(3,'hidden',0,3); INSERT INTO posts_category_translations VALUES(1,'en','News','Description'); INSERT INTO posts_subcategories VALUES(1,1,'cars',1,1),(2,1,'other',1,2),(3,1,'hidden-sub',0,3); INSERT INTO posts_subcategory_translations VALUES(1,'en','Cars','Cars description'),(1,'zh','汽車','中文描述');");
const fixtures=[["public","en-US"],["public","en_GB"],["public","en-UK"],["public","zh_HK"],["private","zh-HK"],["public","zh-TW"],["public","ja"],["public","ja-JP"],["share","en-us"]];
fixtures.forEach(([visibility,locale],i)=>{
  db.prepare("INSERT INTO posts VALUES(?,?,?)").run(i+1,visibility,locale);
  db.prepare("INSERT INTO posts_subcategory_assignments VALUES(?,1)").run(i+1);
});
const source=fs.readFileSync("src/app/page.tsx","utf8").split("const [taxonomyLabels, taxonomyCounts]")[1];
const sqls=Array.from(source.matchAll(/db.prepare\(\x60([\s\S]*?)\x60\)/g),m=>m[1]);
assert.equal(sqls.length,2);
for(const [locales,expected] of [[["en-us"],1],[["en-uk","en-gb"],2],[["zh-hk"],1],[["zh-tw"],1],[["ja-jp","ja"],2]]){
  const labels=db.prepare(sqls[0]).all("zh","zh");
  const sql=sqls[1].replace("$"+"{countryLocalePlaceholders}",locales.map(()=>"?").join(", "));
  const counts=db.prepare(sql).all(...locales);
  const byId=new Map(counts.map(r=>[r.posts_subcategory_id,r.post_count]));
  const rows=labels.map(r=>({...r,post_count:byId.get(r.posts_subcategory_id)||0}));
  assert.equal(rows.length,3);assert.equal(rows[0].post_count,expected);
  assert.equal(rows[0].category_name,"News");assert.equal(rows[0].subcategory_name,"汽車");
  assert.equal(rows[1].post_count,0);assert.equal(rows[2].post_count,0);
  assert.ok(rows.every(r=>r.category_code!=="hidden"&&r.subcategory_code!=="hidden-sub"));
}
db.close();console.log("PASS: country counts, normalized locales, private exclusion, translation fallback and empty categories");
