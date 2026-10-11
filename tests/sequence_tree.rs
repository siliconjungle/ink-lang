use std::{collections::BTreeMap, fs, path::PathBuf, process::Command};
use verified_language::{definition, logic::Term, registry};

#[path = "../lowerings/js/src/definition_literal.rs"]
mod literal_js;

fn command(c: &mut Command) {
    let o = c.output().unwrap();
    assert!(
        o.status.success(),
        "{}\n{}",
        String::from_utf8_lossy(&o.stdout),
        String::from_utf8_lossy(&o.stderr)
    );
}

#[test]
fn knowledge_sequence_tree_definitions_preserve_order_and_duplicates() {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let work = root.join("build/sequence-tree-test");
    fs::create_dir_all(&work).unwrap();
    command(
        Command::new("python3")
            .arg(root.join("knowledge/producers/sequence_tree_fixture.py"))
            .arg("--output")
            .arg(&work),
    );
    let bundle: registry::Bundle =
        serde_json::from_slice(&fs::read(work.join("view.json")).unwrap()).unwrap();
    let names: BTreeMap<String, String> =
        serde_json::from_slice(&fs::read(work.join("names.json")).unwrap()).unwrap();
    let exports = [
        "encode",
        "decode",
        "get",
        "insert",
        "replace",
        "remove",
        "height",
        "measure",
        "decorate",
        "copy_shape",
    ]
    .map(|n| names[n].clone());
    let checked = definition::check_registry(&bundle, &exports).unwrap();
    let context = registry::CheckedBundle::check(&bundle)
        .unwrap()
        .first_order_context()
        .unwrap();
    // Check a full word boundary and an unsorted duplicate list through the
    // independently implemented evaluator before native execution.
    let construct = |id: &str, c, arguments| Term::Construct {
        datatype: id.into(),
        constructor: c,
        arguments,
    };
    let mut rows = construct(&names["table"], 0, vec![]);
    for (k, v) in [(u64::MAX, 91), (3, 72), (3, 16), (0, 55)]
        .into_iter()
        .rev()
    {
        rows = construct(&names["table"], 1, vec![Term::U64(k), Term::U64(v), rows]);
    }
    let call = |id: &str, arguments| Term::Call {
        function: id.into(),
        arguments,
    };
    let tree = call(&names["encode"], vec![rows.clone()]);
    assert_eq!(
        context
            .evaluate(&[], &call(&names["decode"], vec![tree.clone()]))
            .unwrap(),
        rows
    );
    assert_eq!(
        context
            .evaluate(&[], &call(&names["get"], vec![tree, Term::U64(3)]))
            .unwrap(),
        construct(&names["option"], 1, vec![Term::U64(72)])
    );

    let mut rust = ink_lowering_rust::definition_native::lower(&checked)
        .unwrap()
        .source;
    rust.push_str(&format!(r#"
fn rows(xs:&[(u64,u64)])->Value{{let mut t=Value::Data{{datatype:{table:?}.into(),constructor:0,arguments:vec![]}};for &(k,v) in xs.iter().rev(){{t=Value::Data{{datatype:{table:?}.into(),constructor:1,arguments:vec![Value::U64(k),Value::U64(v),t]}};}}t}}
fn main(){{
 let mut seed=718431u64;let mut random=||{{seed^=seed<<13;seed^=seed>>7;seed^=seed<<17;seed}};
 for ordered in [false,true]{{let mut xs=(0..24).map(|_|(random()%16,random())).collect::<Vec<_>>();if ordered{{xs.sort_by_key(|x|x.0);}}
 let mut tree=invoke({encode:?},&[rows(&xs)]).unwrap();
 for i in 0..180{{let old=tree.clone();let key=if i%19==0{{u64::MAX}}else{{random()%20}};let value=random();
 let found=xs.iter().find(|x|x.0==key).map(|x|x.1);
 let expected=Value::Data{{datatype:{option:?}.into(),constructor:usize::from(found.is_some()),arguments:found.into_iter().map(Value::U64).collect()}};
 assert_eq!(invoke({get:?},&[tree.clone(),Value::U64(key)]).unwrap(),expected);
 assert_eq!(invoke({decode:?},&[tree.clone()]).unwrap(),rows(&xs));
 let before=rows(&xs);match i%3{{
 0=>{{tree=invoke({insert:?},&[tree,Value::U64(key),Value::U64(value)]).unwrap();let p=xs.iter().position(|x|key<x.0).unwrap_or(xs.len());xs.insert(p,(key,value));}},
 1=>{{tree=invoke({replace:?},&[tree,Value::U64(key),Value::U64(value)]).unwrap();for x in &mut xs{{if x.0==key{{x.1=value;}}}}}},
 _=>{{tree=invoke({remove:?},&[tree,Value::U64(key)]).unwrap();xs.retain(|x|x.0!=key);}}}}
 assert_eq!(invoke({decode:?},&[old]).unwrap(),before);
 assert_eq!(invoke({decode:?},&[tree.clone()]).unwrap(),rows(&xs));
 assert_eq!(invoke({measure:?},&[tree.clone()]).unwrap(),Value::U64(xs.len()as u64));
 assert_eq!(invoke({decorate:?},&[tree.clone()]).unwrap(),tree);
 }} }} println!("360 native sequence-tree histories passed");
}}
"#, table=names["table"],option=names["option"],encode=names["encode"],decode=names["decode"],get=names["get"],insert=names["insert"],replace=names["replace"],remove=names["remove"],measure=names["measure"],decorate=names["decorate"]));
    let native_driver = rust.split("fn rows(").last().unwrap();
    let native_driver = format!("fn rows({native_driver}")
        .replace("fn main()", "#[no_mangle] pub extern \"C\" fn run_checks()");
    fs::write(
        work.join("wasm.rs"),
        format!(
            "{}\n{native_driver}",
            ink_lowering_rust::definition_native::lower(&checked)
                .unwrap()
                .source
        ),
    )
    .unwrap();
    command(
        Command::new("rustc")
            .args([
                "--edition=2021",
                "-O",
                "--target",
                "wasm32-unknown-unknown",
                "--crate-type",
                "cdylib",
                "-C",
                "panic=abort",
            ])
            .arg(work.join("wasm.rs"))
            .arg("-o")
            .arg(work.join("rust.wasm")),
    );
    fs::write(work.join("wasm.cjs"),"const fs=require('node:fs');WebAssembly.instantiate(fs.readFileSync(process.argv[2]),{}).then(({instance})=>instance.exports.run_checks()).catch(e=>{console.error(e);process.exitCode=1;});").unwrap();
    command(
        Command::new("node")
            .arg(work.join("wasm.cjs"))
            .arg(work.join("rust.wasm")),
    );
    fs::write(work.join("check.rs"), rust).unwrap();
    command(
        Command::new("rustc")
            .args(["--edition=2021", "-O"])
            .arg(work.join("check.rs"))
            .arg("-o")
            .arg(work.join("native")),
    );
    command(&mut Command::new(work.join("native")));

    let mut shared = ink_lowering_rust::definition_native::lower_typed_shared(&checked)
        .unwrap()
        .source;
    shared.push_str(&format!(r#"
use std::sync::{{Arc,atomic::{{AtomicUsize,Ordering}}}};
struct Alloc;static REQUESTS:AtomicUsize=AtomicUsize::new(0);
unsafe impl std::alloc::GlobalAlloc for Alloc{{unsafe fn alloc(&self,l:std::alloc::Layout)->*mut u8{{REQUESTS.fetch_add(1,Ordering::Relaxed);std::alloc::System.alloc(l)}}unsafe fn dealloc(&self,p:*mut u8,l:std::alloc::Layout){{std::alloc::System.dealloc(p,l)}}}}
#[global_allocator]static ALLOC:Alloc=Alloc;
fn main(){{let left=Arc::new(D_{tree}::C1(1,10));let right=Arc::new(D_{tree}::C1(2,20));let original=D_{tree}::C2(left.clone(),right.clone(),1,2,2,2);
let before=REQUESTS.load(Ordering::Relaxed);let copied=f_{copy}(&original);assert_eq!(REQUESTS.load(Ordering::Relaxed),before);
if let D_{tree}::C2(l,r,..)=&copied{{assert!(Arc::ptr_eq(l,&left));assert!(Arc::ptr_eq(r,&right));}}else{{panic!("wrong constructor");}}
drop(copied);assert_eq!(Arc::strong_count(&left),2);assert_eq!(Arc::strong_count(&right),2);println!("generic field reconstruction: zero allocations and unchanged shared edges");}}
"#,tree=names["datatype"],copy=names["copy_shape"]));
    fs::write(work.join("shared.rs"), shared).unwrap();
    command(
        Command::new("rustc")
            .args(["--edition=2021", "-O"])
            .arg(work.join("shared.rs"))
            .arg("-o")
            .arg(work.join("shared")),
    );
    command(&mut Command::new(work.join("shared")));

    let c = ink_lowering_c::definition::lower(&checked).unwrap();
    let gpu = ink_lowering_gpu::lower_definition(&checked).unwrap();
    let wasm = ink_lowering_wasm::lower_definition(&checked).unwrap();
    assert_eq!(c.source, gpu.source);
    assert_eq!(c.source, wasm.source);
    let driver = c_driver(&names, &c.datatypes);
    fs::write(work.join("check.c"), format!("{}\n{driver}", c.source)).unwrap();
    command(
        Command::new("clang")
            .args(["-std=c11", "-O2"])
            .arg(work.join("check.c"))
            .arg("-o")
            .arg(work.join("c")),
    );
    command(&mut Command::new(work.join("c")));
    let zig = std::env::var_os("INK_ZIG")
        .expect("INK_ZIG must name Zig for mandatory C-Wasm sequence-tree coverage");
    command(
        Command::new(zig)
            .args([
                "cc",
                "-target",
                "wasm32-freestanding",
                "-O2",
                "-nostdlib",
                "-Wl,--no-entry",
                "-Wl,--export=run_checks",
                "-Wl,-z,stack-size=2097152",
            ])
            .arg(work.join("check.c"))
            .arg("-o")
            .arg(work.join("c.wasm")),
    );
    fs::write(work.join("c-wasm.cjs"),"const fs=require('node:fs');WebAssembly.instantiate(fs.readFileSync(process.argv[2]),{}).then(({instance})=>{const result=instance.exports.run_checks();if(result)throw Error('C-Wasm tree mismatch '+result);}).catch(e=>{console.error(e);process.exitCode=1;});").unwrap();
    command(
        Command::new("node")
            .arg(work.join("c-wasm.cjs"))
            .arg(work.join("c.wasm")),
    );

    let mut js = literal_js::lower(&checked, &Default::default()).unwrap();
    js.push_str(&format!(r#"
import assert from 'node:assert/strict';
const rows=xs=>xs.reduceRight((t,[k,v])=>__node(1,[k,v,t]),__node(0,[]));
let seed=718431n;const random=()=>{{seed=BigInt.asUintN(64,seed^(seed<<13n));seed^=seed>>7n;seed=BigInt.asUintN(64,seed^(seed<<17n));return seed;}};
for(const ordered of [false,true]){{let xs=Array.from({{length:24}},()=>[random()%16n,random()]);if(ordered)xs.sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0);
let tree=f_{encode}(rows(xs));for(let i=0;i<180;i++){{const old=tree,key=i%19===0?18446744073709551615n:random()%20n,value=random(),found=xs.find(x=>x[0]===key);
assert.deepEqual(f_{get}(tree,key),found?__node(1,[found[1]]):__node(0,[]));const before=rows(xs);
if(i%3===0){{tree=f_{insert}(tree,key,value);let p=xs.findIndex(x=>key<x[0]);if(p<0)p=xs.length;xs.splice(p,0,[key,value]);}}
else if(i%3===1){{tree=f_{replace}(tree,key,value);xs=xs.map(x=>x[0]===key?[key,value]:x);}}
else{{tree=f_{remove}(tree,key);xs=xs.filter(x=>x[0]!==key);}}
assert.deepEqual(f_{decode}(old),before);assert.deepEqual(f_{decode}(tree),rows(xs));assert.equal(f_{measure}(tree),BigInt(xs.length));assert.deepEqual(f_{decorate}(tree),tree);
}}}} console.log('360 literal JS sequence-tree histories passed');
"#,encode=names["encode"],decode=names["decode"],get=names["get"],insert=names["insert"],replace=names["replace"],remove=names["remove"],measure=names["measure"],decorate=names["decorate"]));
    fs::write(work.join("check.mjs"), js).unwrap();
    command(Command::new("node").arg(work.join("check.mjs")));
}

fn c_driver(names: &BTreeMap<String, String>, types: &[String]) -> String {
    let tree = types.iter().position(|x| x == &names["datatype"]).unwrap();
    let table = types.iter().position(|x| x == &names["table"]).unwrap();
    format!(
        r#"
static uint64_t seed=718431;static uint64_t random_word(void){{seed^=seed<<13;seed^=seed>>7;seed^=seed<<17;return seed;}}
struct Row{{uint64_t key,value;}};
static V* rows(struct Row*xs,int n){{V*t=construct({table},0,0,0);while(n--){{V*args[]={{scalar(1,xs[n].key),scalar(1,xs[n].value),t}};t=construct({table},1,3,args);}}return t;}}
static int equals(V*a,V*b){{if(a->kind!=b->kind||a->word!=b->word||a->type!=b->type||a->tag!=b->tag||a->count!=b->count)return 0;for(int i=0;i<a->count;i++)if(!equals(a->fields[i],b->fields[i]))return 0;return 1;}}
int run_checks(void){{
for(int ordered=0;ordered<2;ordered++){{struct Row xs[256];int n=24;for(int j=0;j<n;j++)xs[j]=(struct Row){{random_word()%16,random_word()}};
if(ordered)for(int j=1;j<n;j++){{struct Row v=xs[j];int k=j;while(k&&xs[k-1].key>v.key){{xs[k]=xs[k-1];k--;}}xs[k]=v;}}
for(int i=0;i<180;i++){{ink_def_reset();V*original=rows(xs,n);V*tree=f_{encode}(original);uint64_t key=i%19?random_word()%20:UINT64_MAX,value=random_word();V*k=scalar(1,key),*v=scalar(1,value);
V*found=f_{get}(tree,k);int position=-1;for(int j=0;j<n;j++)if(xs[j].key==key){{position=j;break;}}
if(found->tag!=(position>=0)|| (position>=0&&found->fields[0]->word!=xs[position].value))return 1;
V*next;if(i%3==0){{next=f_{insert}(tree,k,v);int p=0;while(p<n&&!(key<xs[p].key))p++;for(int j=n;j>p;j--)xs[j]=xs[j-1];xs[p]=(struct Row){{key,value}};n++;}}
else if(i%3==1){{next=f_{replace}(tree,k,v);for(int j=0;j<n;j++)if(xs[j].key==key)xs[j].value=value;}}
else{{next=f_{remove}(tree,k);int p=0;for(int j=0;j<n;j++)if(xs[j].key!=key)xs[p++]=xs[j];n=p;}}
if(error||!equals(f_{decode}(tree),original)||!equals(f_{decode}(next),rows(xs,n))||f_{measure}(next)->word!=(uint64_t)n||!equals(f_{decorate}(next),next)||error)return 2;
if(!validate(next,{tree}))return 3;
}}}}return 0;
}}
#ifndef __wasm__
int main(void){{return run_checks();}}
#endif
"#,
        encode = names["encode"],
        get = names["get"],
        insert = names["insert"],
        replace = names["replace"],
        remove = names["remove"],
        decode = names["decode"],
        measure = names["measure"],
        decorate = names["decorate"]
    )
}
