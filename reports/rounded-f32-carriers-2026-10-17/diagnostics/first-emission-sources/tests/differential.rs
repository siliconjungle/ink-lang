use ink_core::{
    core::CheckedModule,
    eval,
    syntax::{parse, Type},
};
use serde_json::{json, Value};
use std::{fs, process::Command};
fn wire(v: Value, t: &Type, p: &ink_core::syntax::Program) -> Value {
    match t {
        Type::U64 => json!(v.as_u64().unwrap().to_string()),
        Type::List(t) | Type::Vector(t, _) => Value::Array(
            v.as_array()
                .unwrap()
                .iter()
                .map(|v| wire(v.clone(), t, p))
                .collect(),
        ),
        Type::Named(n) => p.records[n]
            .iter()
            .map(|(n, t)| (n.clone(), wire(v[n].clone(), t, p)))
            .collect(),
        _ => v,
    }
}
#[test]
fn generated_javascript_matches_reference_for_trusted_native_inputs() {
    let source = format!(
        "{}\n{}",
        include_str!("../examples/particles.ink"),
        r#"
fn mul(x:u32,y:u32)->u32{return x*y;}
fn signed(x:i32,y:i32)->i32{return x*y+x-y;}
fn wide(x:u64,y:u64)->u64{return x*y+x-y;}
fn wide_scan(xs:List<u64>)->List<u64>{return xs.scan();}
fn wide_sort(xs:List<u64>)->List<u64>{return xs.sort();}
fn scalar_div(x:i32,y:i32)->i32{return quot_or(x,y,-99);}
fn remainder(x:i32,y:i32)->i32{return rem_or(x,y,-99);}
fn wide_div(x:u64,y:u64)->u64{return quot_or(x,y,99);}
fn wide_rem(x:u64,y:u64)->u64{return rem_or(x,y,99);}
fn narrow_div(x:u32,y:u32)->u32{return quot_or(x,y,99);}
fn count_flags(xs:List<Bool>)->u64{return count(xs);}
fn identity_words(xs:List<u32>)->List<u32>{return xs;}
fn typed_flags(xs:List<u32>)->List<Bool>{return xs.map(fn(x)=>x>0);}
fn typed_wide(xs:List<u32>)->List<u64>{return xs.map(fn(x)=>count_flags(xs.map(fn(y)=>y==x)));}
fn typed_index(xs:List<u32>)->List<Bool>{return xs.map_indexed(fn(i)=>fn(x)=>i==x);}
fn float_flags(xs:List<f32>)->List<Bool>{return xs.map(fn(x)=>x>0.0);}
fn float_pass(xs:List<f32>)->List<f32>{return xs;}
fn join_words(xs:List<u32>,ys:List<u32>)->List<u32>{return xs.concat(ys);}
fn join_context(xs:List<u32>,ys:List<u32>)->List<u32>{return xs.map(fn(x)=>0).concat(ys);}
fn join_signed(xs:List<i32>,ys:List<i32>)->List<i32>{return xs.concat(ys);}
fn join_wide(xs:List<u64>,ys:List<u64>)->List<u64>{return xs.concat(ys);}
fn join_flags(xs:List<Bool>,ys:List<Bool>)->List<Bool>{return xs.concat(ys);}
fn join_floats(xs:List<f32>,ys:List<f32>)->List<f32>{return xs.concat(ys);}
fn join_nested(xs:List<List<u32>>,ys:List<List<u32>>)->List<List<u32>>{return xs.concat(ys);}
fn join_vectors(xs:List<Vec3<f32>>,ys:List<Vec3<f32>>)->List<Vec3<f32>>{return xs.concat(ys);}
fn join_records(xs:List<Particle>,ys:List<Particle>)->List<Particle>{return xs.concat(ys);}
fn join_sum(xs:List<f32>,ys:List<f32>)->f32{return sum(xs.concat(ys));}

fn negate(x:f32)->f32{return -x;}
fn fadd(x:f32,y:f32)->f32{return x+y;}
fn fmul(x:f32,y:f32)->f32{return x*y;}
fn compare(x:f32,y:f32)->Bool{return x==y;}
fn less(x:u64,y:u64)->Bool{return x<y;}
fn lazy(x:u32)->u32{return choose(true,x,repeat(65536,x,fn(i)=>fn(a)=>repeat(65536,a,fn(j)=>fn(b)=>b+1)));}
fn lazy_at(xs:List<u32>)->u32{return xs.at_or(0,repeat(65536,0,fn(i)=>fn(a)=>repeat(65536,a,fn(j)=>fn(b)=>b+1)));}
fn lazy_div(x:u32)->u32{return quot_or(x,1,repeat(65536,0,fn(i)=>fn(a)=>repeat(65536,a,fn(j)=>fn(b)=>b+1)));}
fn bool_lazy()->Bool{return false && (repeat(65536,0,fn(i)=>fn(a)=>repeat(65536,a,fn(j)=>fn(b)=>b+1))==0);}
fn nested(xs:List<List<u32>>)->List<u32>{return xs.map(fn(xs)=>sum(xs));}
fn extrahelper(x:u32)->u32{return x+1;}
fn shadow(xs:List<u32>)->List<u32>{return xs.map(fn(x)=>choose(x>0,extrahelper(x),0));}
fn binding(x:u32)->u32{let x:u32=x+1; return x*3;}
fn fold(xs:List<u32>)->u32{return foldr(xs,0,fn(x)=>fn(rest)=>x-rest);}
fn dangerous()->u32{return repeat(65536,0,fn(i)=>fn(a)=>repeat(65536,a,fn(j)=>fn(b)=>b+1));}
fn default(x:u32)->u32{return x;}
fn __in(x:u32)->u32{return x+1;}
"#
    );
    let p = parse(&source).unwrap();
    let module = CheckedModule::from_source(p.clone()).unwrap();
    let emitted = ink_lowering_js::lower(&module).unwrap();
    // Checked wire entrypoints validate at their own explicit boundary. The
    // trusted generated functions still omit ingress checking machinery.
    assert!(emitted.javascript.contains(ink_abi::VALUE_WIRE_JS_SOURCE));
    let trusted = emitted.javascript.split(ink_abi::VALUE_WIRE_JS_SOURCE).next().unwrap();
    for forbidden in [
        "__in(",
        "__out(",
        "__tick",
        "ctx.fuel",
        "budget.cells",
        "Number.isInteger",
        "__fail",
        "capture(",
    ] {
        assert!(
            !trusted.contains(forbidden),
            "unexpected runtime checker machinery: {forbidden}"
        );
    }
    let mut inputs = vec![];
    let mut add = |name: &str, args: Value| {
        let f = p.functions.iter().find(|f| f.name == name).unwrap();
        let values = args
            .as_array()
            .unwrap()
            .iter()
            .zip(&f.params)
            .map(|(v, (_, t))| eval::Value::from_program_json(v, t, &p).unwrap())
            .collect();
        let expected = eval::call(&p, name, values, &mut 10_000_000)
            .unwrap()
            .json();
        let args = Value::Array(
            args.as_array()
                .unwrap()
                .iter()
                .zip(&f.params)
                .map(|(v, (_, t))| wire(v.clone(), t, &p))
                .collect(),
        );
        inputs.push(json!({"name":name,"args":args,"expected":wire(expected,&f.result,&p)}));
    };
    for x in [0, 1, 65535, 65536, 2147483647, 2147483648, 4294967295u32] {
        for y in [0, 1, 65535, 65536, 2147483648, 4294967295u32] {
            add("mul", json!([x, y]));
            add("signed", json!([x as i32, y as i32]));
            add("scalar_div", json!([x as i32, y as i32]));
            add("remainder", json!([x as i32, y as i32]));
            add("narrow_div", json!([x, y]));
        }
    }
    for x in [
        0,
        1,
        9007199254740991,
        9007199254740993,
        18446744073709551615u64,
    ] {
        for y in [0, 1, 2, 18446744073709551615u64] {
            for name in ["wide", "wide_div", "wide_rem", "less"] {
                add(name, json!([x, y]));
            }
        }
    }
    let mut seed = 23u64;
    for _ in 0..200 {
        seed ^= seed << 13;
        seed ^= seed >> 7;
        seed ^= seed << 17;
        let x = seed;
        seed ^= seed << 13;
        seed ^= seed >> 7;
        seed ^= seed << 17;
        let y = seed;
        add("wide", json!([x, y]));
        add("mul", json!([x as u32, y as u32]));
        add("signed", json!([x as i32, y as i32]));
    }
    for xs in [
        json!([]),
        json!([0, 1, 2147483647, -2147483648i64, -1]),
        json!([-4, 7, 9]),
    ] {
        for n in ["indexed", "iterate", "prefix", "ordered"] {
            add(n, json!([xs]));
        }
        add("gather", json!([xs, [0, 1, 2, 999, 4294967295u32]]));
    }
    add(
        "wide_scan",
        json!([[18446744073709551615u64, 1, 9007199254740993u64]]),
    );
    add(
        "wide_sort",
        json!([[18446744073709551615u64, 1, 9007199254740993u64]]),
    );
    add("count_flags", json!([[true, false]]));
    for name in ["identity_words", "typed_flags", "typed_wide", "typed_index"] {
        add(name, json!([[0, 1, 4294967295u32]]));
    }
    for (left, right) in [
        (json!([]), json!([])),
        (json!([0, 4294967295u32]), json!([])),
        (json!([]), json!([2, 1])),
        (json!([0, 1, 4294967295u32]), json!([7, 2])),
    ] {
        add("join_words", json!([left, right]));
    }
    add("join_context", json!([[1, 4294967295u32], [2, 3]]));
    add(
        "join_signed",
        json!([[-2147483648i64, -1], [0, 2147483647]]),
    );
    add(
        "join_wide",
        json!([[18446744073709551615u64, 9007199254740993u64], [0, 1]]),
    );
    add("join_flags", json!([[false, true], [true, false]]));
    add(
        "join_floats",
        json!([[{"F32Bits":2143363909u32},{"F32Bits":2147483648u32}],[{"F32Bits":1},{"F32Bits":2139095040u32}]]),
    );
    add("join_nested", json!([[[0, 1], []], [[4294967295u32]]]));
    add("join_vectors", json!([[[1, 2, 3]], [[4, 5, 6]]]));
    add(
        "join_records",
        json!([[{"position":[1,2,3],"velocity":[2,-2,1],"mass":5}],[{"position":[4,5,6],"velocity":[0,1,0],"mass":2}]]),
    );
    add("join_sum", json!([[16777216.0, 1.0], [-16777216.0]]));
    add("float_flags", json!([[-1.0, -0.0, 1.0]]));
    add(
        "float_pass",
        json!([[{"F32Bits":2147483648u32},{"F32Bits":2143363909u32}]]),
    );
    add("kick", json!([[[1, 2, 3], [4, 5, 6]], 0.5, [0, -2, 0]]));
    add(
        "particles",
        json!([[{"position":[1,2,3],"velocity":[2,-2,1],"mass":5}],0.5]),
    );
    add("ordered_sum", json!([[16777216.0, 1.0, -16777216.0]]));
    add("ordered_sum", json!([[]]));
    for bits in [
        0,
        0x80000000,
        1,
        0x007fffff,
        0x00800000,
        0x7f800000,
        0xff800000,
        0x7fc12345u32,
    ] {
        add("negate", json!([{"F32Bits":bits}]));
        add("compare", json!([{"F32Bits":bits},{"F32Bits":bits}]));
    }
    for (a, b) in [
        (1.0000001192092896, 1.0000001192092896),
        (3.4028234663852886e38, 2.0),
        (1.401298464324817e-45, 0.5),
        (-0.0, 0.0),
    ] {
        add("fadd", json!([a, b]));
        add("fmul", json!([a, b]));
    }
    add("lazy", json!([7]));
    add("lazy_at", json!([[7]]));
    add("lazy_div", json!([7]));
    add("bool_lazy", json!([]));
    add("nested", json!([[[1, 2], [], [4294967295u32, 1]]]));
    add("shadow", json!([[0, 1, 4294967295u32]]));
    add("binding", json!([4294967295u32]));
    add("fold", json!([[1, 2, 3]]));
    add("default", json!([7]));
    add("__in", json!([7]));
    let dir = std::env::temp_dir().join(format!("ink-js-differential-{}", std::process::id()));
    fs::create_dir_all(&dir).unwrap();
    fs::write(dir.join("program.mjs"), &emitted.javascript).unwrap();
    fs::write(dir.join("cases.json"), serde_json::to_vec(&inputs).unwrap()).unwrap();
    fs::write(dir.join("test.mjs"),r#"
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {call,functions,metadata} from './program.mjs';
const cases=JSON.parse(readFileSync(new URL('./cases.json',import.meta.url)));
function native(v,t) { switch(t.kind) {case 'u64':return BigInt(v);case 'list':case 'vector':return v.map(x=>native(x,t.element));case 'record':return Object.fromEntries(t.fields.map(f=>[f.name,native(v[f.name],f.type)]));default:return v;} }
const json=v=>JSON.stringify(v,(_,v)=>typeof v==='bigint'?v.toString():v);
for (const {name,args,expected} of cases) { const f=metadata.functions.find(f=>f.name===name); const values=args.map((v,i)=>native(v,f.params[i].type)); assert.deepEqual(JSON.parse(json(functions[name](...values))),JSON.parse(json(expected)),`${name}: ${json(args)}`); assert.deepEqual(JSON.parse(json(call(name,values))),JSON.parse(json(expected))); }
assert.throws(()=>{metadata.functions[0].name='bad';});
assert.equal(functions.default(7),7);
assert.equal(functions.__in(7),8);
assert.ok(Object.is(call('negate',[0]),-0));
const xs=[3,1,2];call('ordered',[xs]);assert.deepEqual(xs,[3,1,2]);
const typed=new Uint32Array([0,1,4294967295]);
assert.equal(functions.identity_words(typed),typed); // Trusted native identity does not capture/copy.
assert.deepEqual(functions.typed_flags(typed),[false,true,true]);
assert.deepEqual(functions.typed_wide(typed),[3n,3n,3n]);
assert.deepEqual(functions.typed_index(typed),[true,true,false]);
assert.deepEqual(typed,new Uint32Array([0,1,4294967295]));
const fs=new Float32Array([16777216,1,-16777216]);
assert.equal(functions.ordered_sum(fs),0);
assert.deepEqual(functions.float_flags(fs),[true,true,false]);
const fpass=functions.float_pass([{F32Bits:2147483648},{F32Bits:2143363909}]);
assert.ok(Object.is(fpass[0],-0));assert.deepEqual(fpass[1],{F32Bits:2143363909});
const tail=new Uint32Array([7,2]), joined=functions.join_words(typed,tail);
assert.ok(Array.isArray(joined));assert.deepEqual(joined,[0,1,4294967295,7,2]);
assert.notEqual(joined,typed);assert.notEqual(joined,tail);
joined[0]=99;assert.equal(typed[0],0);assert.deepEqual(tail,new Uint32Array([7,2]));
const empty=[];assert.notEqual(functions.join_words(empty,empty),empty);
const inner=[1,2], nestedJoined=functions.join_nested([inner],[[]]);
assert.equal(nestedJoined[0],inner);assert.deepEqual(nestedJoined,[[1,2],[]]);
assert.deepEqual(functions.join_wide(new BigUint64Array([18446744073709551615n]),[1n]),[18446744073709551615n,1n]);
assert.deepEqual(functions.join_signed(new Int32Array([-2147483648,-1]),new Int32Array([0,2147483647])),[-2147483648,-1,0,2147483647]);
assert.equal(functions.join_sum(new Float32Array([16777216,1]),new Float32Array([-16777216])),0);
const special=functions.join_floats([{F32Bits:2143363909},-0],[{F32Bits:1},{F32Bits:2139095040}]);
assert.deepEqual(special[0],{F32Bits:2143363909});assert.ok(Object.is(special[1],-0));
assert.equal(special[2],1.401298464324817e-45);assert.deepEqual(special[3],{F32Bits:2139095040});
assert.equal(metadata.abi,'ink-javascript-trusted-values-v2');
console.log(`${cases.length} reference comparisons and native caller regressions passed`);
"#).unwrap();
    let output = Command::new("node")
        .arg(dir.join("test.mjs"))
        .output()
        .expect("Node.js required for JavaScript execution tests");
    assert!(
        output.status.success(),
        "{}{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
    println!("{}", String::from_utf8_lossy(&output.stdout));
    fs::remove_dir_all(dir).unwrap();
}
#[test]
fn admits_stateful_and_opaque_values_without_changing_core_types() {
    for source in ["module X;fn f(x:Int)->Int{return x;}", "module X;state T:Table<String,u64> =Table.empty();query get()->List<u64> reads(T){return T.values();}"] {
  let module=CheckedModule::from_source(parse(source).unwrap()).unwrap();assert!(ink_lowering_js::lower(&module).is_ok());
 }
}

#[test]
fn compile_time_checking_still_rejects_ill_typed_functions() {
    for source in [
        "module X;fn f(x:u32)->Bool{return x;}",
        "module X;fn f(x:List<u32>)->List<Bool>{return x.map(fn(y)=>y+1);}",
        "module X;fn f(x:u32)->u32{return x+true;}",
        "module X;fn f(xs:List<u32>,ys:List<Bool>)->List<u32>{return xs.concat(ys);}",
        "module X;fn f(xs:List<u32>)->List<u32>{return xs.concat();}",
        "module X;fn f(xs:List<u32>)->List<u32>{return xs.concat(1);}",
    ] {
        let p = parse(source).unwrap();
        assert!(CheckedModule::from_source(p).is_err());
    }
}

#[test]
fn word_only_output_binds_direct_functions_and_omits_unused_runtime_helpers() {
    let module = CheckedModule::from_source(parse("module X;fn f(x:u32,y:u32)->u32{return x*y+x;}fn id(xs:List<u32>)->List<u32>{return xs;}").unwrap()).unwrap();
    let emitted = ink_lowering_js::lower(&module).unwrap();
    let trusted = emitted.javascript.split(ink_abi::VALUE_WIRE_JS_SOURCE).next().unwrap();
    assert!(emitted.javascript.contains("function __fn0(v0,v1){"));
    assert!(!trusted.contains("(()=>"));
    assert!(emitted
        .javascript
        .contains("[f.name,__implementations[f.index]]"));
    for forbidden in [
        "DataView",
        "__representation",
        "__div",
        "__map",
        "__repeat",
        "__tick",
        "budget",
    ] {
        assert!(
            !trusted.contains(forbidden),
            "unused machinery: {forbidden}"
        );
    }
    assert!(emitted.javascript.contains("Math.imul"));
}
