use std::{fs, process::Command};
#[test]
fn schema_memoization_is_local_exact_and_preserves_record_data_properties() {
    let helper = include_str!("../src/values.mjs")
        .split("// @helper state-validation")
        .next()
        .unwrap();
    let script = r#"
const assert=require('node:assert/strict');
const __namedTypes={};
const record={kind:'record',name:'Row',fields:[{name:'score',type:{kind:'u32'}},{name:'value',type:{kind:'f32'}},{name:'__proto__',type:{kind:'string'}}]};
const other={kind:'record',name:'Other',fields:[{name:'value',type:{kind:'u32'}}]};
const first=__representation(record,false),same=__representation(structuredClone(record),false),different=__representation(other,false),output=__representation(record,true);
let gets=0,number=1.5;
const host={score:7,get value(){gets++;return number;}};
Object.defineProperty(host,'__proto__',{value:'field',writable:true,enumerable:true,configurable:true});
const context=new WeakMap(),a=first(host,context),b=same(host,context);
assert.strictEqual(a,b);assert.equal(gets,1);assert.equal(a.value,0x3fc00000);
assert.strictEqual(Object.getPrototypeOf(a),Object.prototype);assert.ok(Object.hasOwn(a,'__proto__'));assert.equal(a.__proto__,'field');
assert.deepStrictEqual(Object.getOwnPropertyDescriptor(a,'__proto__'),{value:'field',writable:true,enumerable:true,configurable:true});
const c=different(host,context);assert.notStrictEqual(c,a);assert.equal(c.value,1.5);assert.equal(gets,2);
// Input and output namespaces remain separate even in a shared context.
assert.equal(output(a,context).value,1.5);
number=2.25;assert.equal(first(host,new WeakMap()).value,0x40100000);assert.equal(gets,3);
const list=__representation({kind:'list',element:record},false),next=list([host,host],new WeakMap());assert.strictEqual(next[0],next[1]);assert.equal(gets,4);
// Exact non-finite payloads and negative zero survive the fixed boundary.
for(const bits of [0x80000000,0x7fc12345,0x7f800000]){const value={score:0,value:{F32Bits:bits},['__proto__']:'x'},encoded=first(value,new WeakMap()),decoded=output(encoded);assert.equal(encoded.value,bits);if(bits===0x80000000)assert.ok(Object.is(decoded.value,-0));else assert.deepStrictEqual(decoded.value,{F32Bits:bits});}
assert.equal(host.__proto__,'field');assert.equal(host.score,7);
"#;
    let path =
        std::env::temp_dir().join(format!("ink-conversion-cache-{}.cjs", std::process::id()));
    fs::write(&path, format!("{helper}\n{script}")).unwrap();
    let result = Command::new("node").arg(&path).output().unwrap();
    fs::remove_file(path).unwrap();
    assert!(
        result.status.success(),
        "{}",
        String::from_utf8_lossy(&result.stderr)
    );
}
