use std::{fs, process::Command};

#[test]
fn compiled_capture_matches_validation_and_preserves_owned_boundaries() {
    let helper = include_str!("../src/values.mjs").split("// @helper __u64").next().unwrap();
    let script = r#"
const assert=require('node:assert/strict');
const __namedTypes={Node:{kind:'record',fields:[{name:'value',type:{kind:'u32'}},{name:'next',type:{kind:'option',element:{kind:'ref',name:'Node'}}}]}};
const cases=[
 [{kind:'u32'},[0,4294967295,-1,1.5,'1',NaN]],
 [{kind:'i32'},[-2147483648,2147483647,-0,2147483648]],
 [{kind:'u64'},[0n,18446744073709551615n,'18446744073709551615',-1n,9007199254740992]],
 [{kind:'f32'},[-0,1.5,{F32Bits:0x7fc12345},{F32Bits:0x80000000},{F32Bits:-1},Infinity]],
 [{kind:'int'},[{Int:'-12345678901234567890'},3n,'3',{Int:'x'}]],
 [{kind:'bool'},[true,false,0]], [{kind:'unit'},[null,undefined]],
 [{kind:'string'},['ok','\ud800',12]],
 [{kind:'option',element:{kind:'u32'}},[{None:null},{Some:7},{Some:-1},{Some:1,extra:2}]],
 [{kind:'result',ok:{kind:'u32'},error:{kind:'string'}},[{Ok:7},{Err:'bad'},{Err:2},{Ok:1,Err:'bad'}]],
 [{kind:'vector',size:2,element:{kind:'u32'}},[[1,2],[1],[1,-2],new Uint32Array([1,2]),new DataView(new ArrayBuffer(8))]],
 [{kind:'list',element:{kind:'u32'}},[[],[0,1,4294967295],[1,-1],new Uint32Array([1,2])]],
];
cases.push([{kind:'ref',name:'Node'},[
 {value:7,next:{Some:{value:9,next:{None:null}}}},
 {value:7,next:{Some:{value:-1,next:{None:null}}}},
 {value:7,next:{None:null}},
]]);
const row={kind:'record',name:'Row',fields:[{name:'values',type:{kind:'list',element:{kind:'f32'}}},{name:'__proto__',type:{kind:'string'}}]};
const host={values:[-0,{F32Bits:0x7fc12345}],['__proto__']:'own'};
cases.push([row,[host,{values:[]},{values:[],['__proto__']:'own',extra:1},null]]);
const outcome=(fn,value,budget,depth)=>{try{return {value:fn(value,budget,depth)};}catch(e){return {error:e.message};}};
for(const [type,values]of cases){
 const capture=__stateCapture(type);assert.strictEqual(capture,__stateCapture(type));
 for(const value of values)for(const cells of [1,2,1000000])for(const depth of [0,64,65]){
  assert.deepStrictEqual(outcome(capture,value,{cells},depth),outcome((v,b,d)=>__stateInput(v,type,b,d),value,{cells},depth));
 }
}
const capture=__stateCapture(row),owned=capture(host);host.values[0]=9;host.__proto__='changed';
assert.equal(owned.values[0],0x80000000);assert.equal(owned.__proto__,'own');assert.equal(Object.getPrototypeOf(owned),Object.prototype);
assert.deepStrictEqual(Object.getOwnPropertyDescriptor(owned,'__proto__'),{value:'own',writable:true,enumerable:true,configurable:true});
const next=capture(host);assert.equal(next.values[0],0x41100000);assert.notStrictEqual(next,owned);assert.notStrictEqual(next.values,owned.values);
assert.throws(()=>capture({values:[-1]}),/invalid record/);assert.equal(capture(host).__proto__,'changed');
"#;
    let path=std::env::temp_dir().join(format!("ink-state-capture-{}.cjs",std::process::id()));
    fs::write(&path,format!("{helper}\n{script}")).unwrap();
    let output=Command::new("node").arg(&path).output().unwrap();fs::remove_file(path).unwrap();
    assert!(output.status.success(),"{}",String::from_utf8_lossy(&output.stderr));
}
