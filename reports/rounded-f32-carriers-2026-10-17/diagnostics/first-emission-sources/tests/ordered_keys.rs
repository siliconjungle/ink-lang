use std::{fs, process::Command};

#[test]
fn retained_key_view_matches_utf8_order_through_mutation_and_rollback() {
    let script = r#"
const assert=require('node:assert/strict');
const __stateRootEquals=[(a,b)=>a===b];
const utf8=(a,b)=>Buffer.compare(Buffer.from(a),Buffer.from(b));
const strings=['','a','a\0','a雪','雪','é','e\u0301','\ud7ff','\ue000','𐀀','😀','\u{10ffff}'];
for(const a of strings)for(const b of strings)assert.equal(Math.sign(__keyCompare(a,b,{kind:'string'})),Math.sign(utf8(a,b)));
let seed=1234567;const random=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
for(const [type,keys,compare]of [[{kind:'string'},strings,utf8],[{kind:'u32'},[0,1,2,97,4294967295],(a,b)=>a-b],[{kind:'u64'},[0n,1n,97n,18446744073709551615n],(a,b)=>a<b?-1:a>b?1:0]]){
 const rt={tables:[new Map()],meta:{roots:[{key:type}]},seen:[new Set()],undo:[],viewsByRoot:[[]],activeViewRoots:new Uint8Array(1),cell:null,cellMode:false};
 const check=()=>{const expected=[...rt.tables[0].keys()].sort(compare);assert.deepEqual(__orderedKeys(rt,0),expected);assert.deepEqual(__table(rt,0,'values',[]),expected.map(k=>rt.tables[0].get(k)));};
 for(let turn=0;turn<1000;turn++){
  const before=new Map(rt.tables[0]);
  for(let step=0;step<5;step++){const key=keys[random(keys.length)];if(random(2))__table(rt,0,'put',[key,turn*5+step]);else __table(rt,0,'remove',[key]);if(random(3)===0)check();}
  if(random(3)===0){__rollback(rt,0);assert.deepEqual([...rt.tables[0]].sort((a,b)=>compare(a[0],b[0])),[...before].sort((a,b)=>compare(a[0],b[0])));}
  check();rt.undo.length=0;rt.seen[0].clear();
 }
 const key=keys[0];__table(rt,0,'put',[key,1]);check();rt.undo.length=0;rt.seen[0].clear();
 const prior=__orderedKeys(rt,0);__table(rt,0,'remove',[key]);__table(rt,0,'put',[key,2]);
 assert.strictEqual(__orderedKeys(rt,0),prior);assert.equal(__tableOrder.get(rt.tables[0]).pending.size,0);check();
}
"#;
    let path = std::env::temp_dir().join(format!("ink-key-view-{}.cjs", std::process::id()));
    fs::write(&path, format!("{}\n{script}", include_str!("../src/state.mjs"))).unwrap();
    let result = Command::new("node").arg(&path).output().unwrap();
    fs::remove_file(path).unwrap();
    assert!(result.status.success(), "{}", String::from_utf8_lossy(&result.stderr));
}
