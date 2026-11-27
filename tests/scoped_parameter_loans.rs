use serde_json::json;
use std::{fs,path::Path,process::Command};
use verified_language::{core::CheckedModule,eval,physical,planning,registry,stateful::Runtime,syntax};
#[path="support/parity.rs"]mod parity;
const SOURCE:&str=r#"module scoped_loans;
record Item{value:u32,}
record Image{values:List<Item>,tag:u32,}
fn read(x:Image)->u32{return x.values.at_or(0,Item{value:0}).value;}
fn transfer(x:Image)->List<Item>{return buffer(x.values).push(Item{value:x.tag}).freeze();}
fn joined(first:u32,values:List<Item>)->List<u32>{return [first].concat(values.map(fn(v)=>v.value));}
fn overlap(x:Image)->List<u32>{return joined(read(x),transfer(x));}
fn inline(x:Image)->List<u32>{let first=x.values.at_or(0,Item{value:0}).value;return joined(first,transfer(x));}
fn retained(xs:List<Item>)->List<Item>{let first=xs.at_or(0,Item{value:0});return buffer(xs).push(first).freeze();}
fn consumed(xs:List<Item>)->List<Item>{let out:Buffer<Item>=foldl(xs,Buffer.empty(),fn(item,out)=>out.push(item));return out.freeze();}
fn folded_alias(xs:List<Item>)->List<Item>{let out:Buffer<Item>=foldl(xs,buffer(xs),fn(item,out)=>out.push(item));return out.freeze();}
fn combined(tag:Item,x:Image)->u32{return tag.value+read(x);}
fn computed(x:Image)->List<u32>{return joined(combined(Item{value:7},x),transfer(x));}
fn alias(x:Image)->List<List<Item>>{return [transfer(x),x.values];}
fn scalar(x:u32)->u32{return x;}
fn owned(x:Buffer<u32>)->List<u32>{return x.freeze();}
record Particle{position:u32,velocity:u32,active:Bool,}
fn particles(xs:List<Particle>)->List<Particle>{return xs.map(fn(p)=>Particle{position:p.position+p.velocity,velocity:p.velocity,active:p.active});}
"#;
fn package(m:&CheckedModule,function:&str,param:&str)->planning::Package{
 let mut sites=vec![physical::parameter_read_site(function,param).unwrap(),physical::parameter_read_site("combined","tag").unwrap(),physical::parameter_read_site("combined","x").unwrap(),registry::identity(&json!({"Field":[{"Var":"x"},"values"]})).unwrap(),physical::expression_read_site("retained",&syntax::Expr::Var("xs".into())).unwrap(),physical::expression_read_site("consumed",&syntax::Expr::Var("xs".into())).unwrap(),physical::expression_read_site("folded_alias",&syntax::Expr::Var("xs".into())).unwrap()];sites.sort();
 serde_json::from_value(json!({"schema":1,"semantics":planning::SEMANTICS,"input_core_sha256":m.identity().unwrap(),"steps":[{"kind":"physical","package":{"schema":1,"semantics":physical::SEMANTICS,"input_core_sha256":m.identity().unwrap(),"buffers":"direct","borrow_reads":sites}}]})).unwrap()
}

#[test]
fn scoped_parameter_capabilities_bind_actual_nonaffine_parameters(){
 let m=CheckedModule::from_source(syntax::parse(SOURCE).unwrap()).unwrap();
 planning::check(&m,&package(&m,"read","x")).unwrap();
 for(function,param)in[("missing","x"),("read","missing"),("scalar","x"),("owned","x")]{assert!(planning::check(&m,&package(&m,function,param)).is_err(),"{function} {param}");}
 let changed=CheckedModule::from_source(syntax::parse(&SOURCE.replace("fn read(x:Image)","fn renamed(x:Image)").replace("read(x)","renamed(x)")).unwrap()).unwrap();
 // Even a freshly rehashed packet cannot borrow a nonexistent lexical binder.
 assert!(planning::check(&changed,&package(&changed,"read","x")).is_err());
 for (function,param)in[("missing","xs"),("scalar","x"),("owned","x")]{
  let mut bad=package(&m,"read","x");let planning::Step::Physical(p)=&mut bad.steps[0]else{unreachable!()};p.borrow_reads.push(physical::expression_read_site(function,&syntax::Expr::Var(param.into())).unwrap());p.borrow_reads.sort();assert!(planning::check(&m,&bad).is_err());
 }
}

#[test]
fn build_checked_rust_project_with_borrowed_parameters() {
    let source = "module planned_build; pub fn sample(xs:List<u32>)->u32{return xs.at_or(0,0)+length(xs);}";
    let module = CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
    let id = module.identity().unwrap();
    let packet = json!({"schema":1,"semantics":planning::SEMANTICS,"input_core_sha256":id,
        "steps":[{"kind":"physical","package":{"schema":1,"semantics":physical::SEMANTICS,
            "input_core_sha256":id,"borrow_reads":[physical::parameter_read_site("sample","xs").unwrap()]}}]});
    let dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("build/checked-rust-project");
    fs::create_dir_all(&dir).unwrap();
    let image = dir.join("input.core.json");
    let plan = dir.join("input.plan.json");
    let project = dir.join("project");
    fs::write(&image, module.bytes().unwrap()).unwrap();
    fs::write(&plan, registry::canonical(&packet).unwrap()).unwrap();
    let built = Command::new(env!("CARGO_BIN_EXE_ink")).arg("build").arg(&image)
        .args(["--core", "--plan"]).arg(&plan).args(["--target", "rust", "-o"]).arg(&project)
        .output().unwrap();
    assert!(built.status.success(), "{}", String::from_utf8_lossy(&built.stderr));
    let code = fs::read_to_string(project.join("src/lib.rs")).unwrap();
    assert!(code.contains("ink_borrowed_function_l_sample"));
    for file in ["ink-abi-contract.json", "ink-wire-contract.json"] {
        assert!(code.contains(&format!("include_str!({file:?})")));
        let contract: serde_json::Value =
            serde_json::from_slice(&fs::read(project.join("src").join(file)).unwrap()).unwrap();
        assert!(contract.is_object());
    }
    assert!(code.contains("include!(\"initial-state.rs\")"));
    let requests = dir.join("requests.json");
    fs::write(&requests, r#"[{"pure":"sample","args":[[]]},{"pure":"sample","args":[[5,1,2]]}]"#).unwrap();
    let run = Command::new(env!("CARGO")).args(["run", "--quiet", "--manifest-path"])
        .arg(project.join("Cargo.toml")).arg("--").arg(requests).output().unwrap();
    assert!(run.status.success(), "{}", String::from_utf8_lossy(&run.stderr));
    let replies: serde_json::Value = serde_json::from_slice(&run.stdout).unwrap();
    assert_eq!(replies, json!([0, 8]));
}

#[test]
fn scoped_loans_preserve_aliases_and_move_same_named_transfer_parameters(){
 let m=CheckedModule::from_source(syntax::parse(SOURCE).unwrap()).unwrap();
 let plan=planning::check(&m,&package(&m,"read","x")).unwrap();
 let d=Path::new(env!("CARGO_MANIFEST_DIR")).join("build/scoped-parameter-loans-conformance");fs::create_dir_all(&d).unwrap();
 fs::write(d.join("source.ink"),SOURCE).unwrap();fs::write(d.join("plan.json"),registry::canonical(plan.package()).unwrap()).unwrap();
 let runtime=Runtime::new(m.program().clone()).unwrap();let mut steps=vec![];let mut expected=vec![];
 for n in [0,1,64,257]{for function in ["read","transfer","overlap","inline","alias","computed"]{
  let args=json!([{"values":(0..n).map(|i|json!({"value":i})).collect::<Vec<_>>(),"tag":u32::MAX}]);
  let f=m.program().functions.iter().find(|f|f.name==function).unwrap();let values=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,m.program()).unwrap()).collect();let result=eval::call(m.program(),function,values,&mut 1_000_000).unwrap().json();
  steps.push(json!({"pure":function,"args":args,"cpu_only":true}));expected.push(json!({"reply":{"value":result},"snapshot":runtime.checkpoint_portable().unwrap()}));
 }}
 for n in [0,1,64,257]{for name in ["retained","consumed","folded_alias"]{
  let args=json!([(0..n).map(|i|json!({"value":i})).collect::<Vec<_>>()]);let f=m.program().functions.iter().find(|f|f.name==name).unwrap();let values=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,m.program()).unwrap()).collect();let result=eval::call(m.program(),name,values,&mut 1_000_000).unwrap().json();
  steps.push(json!({"pure":name,"args":args,"cpu_only":true}));expected.push(json!({"reply":{"value":result},"snapshot":runtime.checkpoint_portable().unwrap()}));
 }}
 let args=json!([(0..64).map(|i|json!({"position":i,"velocity":u32::MAX,"active":i%2==0})).collect::<Vec<_>>()]);
 let f=m.program().functions.iter().find(|f|f.name=="particles").unwrap();let values=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,m.program()).unwrap()).collect();let result=eval::call(m.program(),"particles",values,&mut 1_000_000).unwrap().json();
 steps.push(json!({"pure":"particles","args":args,"expect_gpu":true}));expected.push(json!({"reply":{"value":result},"snapshot":runtime.checkpoint_portable().unwrap()}));
 fs::write(d.join("script.json"),serde_json::to_vec(&steps).unwrap()).unwrap();fs::write(d.join("expected.json"),serde_json::to_vec(&expected).unwrap()).unwrap();
 let output=Command::new("python3").arg("tools/physical_capability_conformance.py").args(["--compiler",env!("CARGO_BIN_EXE_ink"),"--root"]).arg(&d).arg("--source").arg(d.join("source.ink")).arg("--plan").arg(d.join("plan.json")).output().unwrap();
 fs::write(d.join("selected-run.log"),[output.stdout.as_slice(),output.stderr.as_slice()].concat()).unwrap();assert!(output.status.success(),"{}",String::from_utf8_lossy(&output.stderr));
 // A native mechanism check observes actual element clones, including nested
 // vectors; keeping only the query borrowed must leave the transfer owning.
 let code=verified_language::state_native::emit_planned(&plan).unwrap();
 let declaration="#[derive(Clone,Debug,PartialEq,Eq)] pub struct l_Item";
 assert!(code.contains(declaration));let code=code.replace(declaration,"#[derive(Debug,PartialEq,Eq)] pub struct l_Item");
 let selected=d.join("selected");fs::write(selected.join("src/lib.rs"),format!("{code}\npub static CLONES:std::sync::atomic::AtomicUsize=std::sync::atomic::AtomicUsize::new(0);impl Clone for l_Item{{fn clone(&self)->Self{{CLONES.fetch_add(1,std::sync::atomic::Ordering::Relaxed);Self{{l_value:self.l_value}}}}}}\n")).unwrap();
 fs::create_dir_all(selected.join("src/bin")).unwrap();fs::write(selected.join("src/bin/count_clones.rs"),r#"use compiled_state::{State,l_Image,l_Item,CLONES};fn main(){let state=State::new();let image=l_Image{l_values:(0..257).map(|value|l_Item{l_value:value}).collect(),l_tag:99};assert_eq!(state.ink_borrowed_function_l_read(&image),0);CLONES.store(0,std::sync::atomic::Ordering::Relaxed);let result=state.function_l_overlap(image);assert_eq!(result.len(),259);assert_eq!(result[0],0);assert_eq!(result[258],99);assert_eq!(CLONES.load(std::sync::atomic::Ordering::Relaxed),0);let image=l_Image{l_values:(0..257).map(|value|l_Item{l_value:value}).collect(),l_tag:99};CLONES.store(0,std::sync::atomic::Ordering::Relaxed);let result=state.function_l_inline(image);assert_eq!(result.len(),259);assert_eq!(result[258],99);assert_eq!(CLONES.load(std::sync::atomic::Ordering::Relaxed),0);let values=(0..257).map(|value|l_Item{l_value:value}).collect();CLONES.store(0,std::sync::atomic::Ordering::Relaxed);let result=state.function_l_retained(values);assert_eq!(result.len(),258);assert_eq!(result[257].l_value,0);assert_eq!(CLONES.load(std::sync::atomic::Ordering::Relaxed),1);let values=(0..257).map(|value|l_Item{l_value:value}).collect();CLONES.store(0,std::sync::atomic::Ordering::Relaxed);let result=state.function_l_consumed(values);assert_eq!(result.len(),257);assert_eq!(result[256].l_value,256);assert_eq!(CLONES.load(std::sync::atomic::Ordering::Relaxed),0);let values=(0..257).map(|value|l_Item{l_value:value}).collect();CLONES.store(0,std::sync::atomic::Ordering::Relaxed);let result=state.function_l_folded_alias(values);assert_eq!(result.len(),514);assert_eq!(result[513].l_value,256);assert_eq!(CLONES.load(std::sync::atomic::Ordering::Relaxed),257);let image=l_Image{l_values:(0..257).map(|value|l_Item{l_value:value}).collect(),l_tag:99};CLONES.store(0,std::sync::atomic::Ordering::Relaxed);let result=state.function_l_computed(image);assert_eq!(result.len(),259);assert_eq!(result[0],7);assert_eq!(result[258],99);assert_eq!(CLONES.load(std::sync::atomic::Ordering::Relaxed),0);}"#).unwrap();
 let out=Command::new(env!("CARGO")).args(["run","--offline","--quiet","--manifest-path"]).arg(selected.join("Cargo.toml")).args(["--bin","count_clones","--target-dir"]).arg(selected.join("target")).output().unwrap();assert!(out.status.success(),"{}",String::from_utf8_lossy(&out.stderr));
 parity::conformance("generated-parity-scoped-parameter-loans",m.program().clone(),SOURCE,steps,expected);
}

#[test]
fn immutable_variant_reads_borrow_payloads_and_copy_escaping_values() {
    let source = r#"module variant_reads;
record Item { value: u32, }
record Geometry { items: List<Item>, }
fn first(g: Geometry) -> u32 { return g.items.at_or(0, Item { value: 0 }).value; }
fn observe(g: Option<Geometry>) -> u32 {
    return g.fold(fn(p) => first(p), fn(unit) => 11);
}
fn nested(g: Option<Geometry>) -> u32 { return observe(g) + observe(g); }
fn inspect(g: Result<Geometry, Geometry>) -> u32 {
    return g.fold(fn(p) => first(p), fn(e) => first(e) + 1);
}
fn detach(g: Option<Geometry>) -> List<Item> {
    return g.fold(fn(p) => p.items, fn(unit) => []);
}
fn owning(g: Buffer<u32>) -> List<u32> { return g.freeze(); }
"#;
    let module = CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
    let mut sites: Vec<_> = [("first", "g"), ("observe", "g"), ("nested", "g"), ("inspect", "g"), ("detach", "g")]
        .into_iter().map(|(f, p)| physical::parameter_read_site(f, p).unwrap()).collect();
    sites.sort();
    let id = module.identity().unwrap();
    let package = |sites: &[String]| serde_json::from_value::<planning::Package>(json!({
        "schema": 1, "semantics": planning::SEMANTICS, "input_core_sha256": id,
        "steps": [{ "kind": "physical", "package": { "schema": 1,
            "semantics": physical::SEMANTICS, "input_core_sha256": id, "borrow_reads": sites }}]
    })).unwrap();
    let packet = package(&sites);
    let checked = planning::check(&module, &packet).unwrap();
    let mut forbidden = sites;
    forbidden.push(physical::parameter_read_site("owning", "g").unwrap());
    forbidden.sort();
    assert!(planning::check(&module, &package(&forbidden)).is_err());

    let d = Path::new(env!("CARGO_MANIFEST_DIR")).join("build/scoped-variant-loans");
    fs::create_dir_all(&d).unwrap();
    let image = d.join("input.core.json");
    let plan = d.join("input.plan.json");
    let project = d.join("project");
    fs::write(&image, module.bytes().unwrap()).unwrap();
    fs::write(&plan, registry::canonical(checked.package()).unwrap()).unwrap();
    let generated = Command::new(env!("CARGO_BIN_EXE_ink")).arg("build").arg(&image)
        .args(["--core", "--plan"]).arg(&plan).args(["--target", "rust", "-o"]).arg(&project).output().unwrap();
    assert!(generated.status.success(), "{}", String::from_utf8_lossy(&generated.stderr));

    let path = project.join("src/lib.rs");
    let code = fs::read_to_string(&path).unwrap();
    let declared = "#[derive(Clone,Debug,PartialEq,Eq)] pub struct l_Item";
    assert!(code.contains(declared));
    let code = code.replace(declared, "#[derive(Debug,PartialEq,Eq)] pub struct l_Item");
    fs::write(path, format!("{code}\npub static CLONES:std::sync::atomic::AtomicUsize=std::sync::atomic::AtomicUsize::new(0);impl Clone for l_Item{{fn clone(&self)->Self{{CLONES.fetch_add(1,std::sync::atomic::Ordering::Relaxed);Self{{l_value:self.l_value}}}}}}\n")).unwrap();
    let bins = project.join("src/bin");
    fs::create_dir_all(&bins).unwrap();
    fs::write(bins.join("observe.rs"), r#"use compiled_state::{State, l_Geometry, l_Item, CLONES};
use std::sync::atomic::Ordering::Relaxed;

fn geometry() -> l_Geometry {
    l_Geometry { l_items: (3..260).map(|l_value| l_Item { l_value }).collect() }
}

fn main() {
    let state = State::new();
    let present = Some(geometry());
    assert_eq!(state.ink_borrowed_function_l_observe(&present), 3);
    assert_eq!(state.ink_borrowed_function_l_nested(&present), 6);
    assert_eq!(state.ink_borrowed_function_l_nested(&None), 22);
    assert_eq!(state.ink_borrowed_function_l_inspect(&Ok(geometry())), 3);
    assert_eq!(state.ink_borrowed_function_l_inspect(&Err(geometry())), 4);
    assert_eq!(CLONES.load(Relaxed), 0);
    let owned = state.ink_borrowed_function_l_detach(&present);
    assert_eq!(owned.len(), 257);
    assert_eq!(CLONES.load(Relaxed), 257);
    assert_eq!(state.ink_borrowed_function_l_observe(&present), 3);
}
"#).unwrap();
    let result = Command::new(env!("CARGO")).args(["run", "--quiet", "--offline", "--manifest-path"])
        .arg(project.join("Cargo.toml")).args(["--bin", "observe", "--target-dir"])
        .arg(d.join("target")).output().unwrap();
    assert!(result.status.success(), "{}", String::from_utf8_lossy(&result.stderr));
}

#[test]
fn compiler_selected_loans_borrow_state_and_keep_recursive_parameters_owned() {
    let source = r#"module stored_reads;
record Item { value: u32, }
record Geometry { items: List<Item>, tag: u32, }
record SiteRecord { room: Geometry, unused: List<Item>, }
state Terrain: Option<Geometry> = None;
state Status: Result<Geometry, Geometry> = Err(Geometry { items: [], tag: 19 });
state Rooms: Table<u32, Geometry> = Table.empty();
state Site: SiteRecord = SiteRecord { room: Geometry { items: [], tag: 81 }, unused: [] };
state Sites: Table<u32, SiteRecord> = Table.empty();

fn tag(g: Geometry) -> u32 { return g.tag; }
fn count_items(items: List<Item>, extra: u32) -> u32 { return length(items) + extra; }
fn inspect(g: Option<Geometry>, offset: u32) -> u32 {
    return g.fold(fn(value) => tag(value), fn(unit) => 0) + offset;
}
fn inspect_status(status: Result<Geometry, Geometry>) -> u32 {
    return status.fold(fn(value) => tag(value), fn(error) => tag(error) + 1);
}
fn detach(g: Option<Geometry>) -> List<Item> {
    return g.fold(fn(value) => value.items, fn(unit) => []);
}
fn offset(n: u32) -> u32 { return n + 1; }
fn default_room() -> Geometry { return Geometry { items: [], tag: 81 }; }
fn default_site() -> SiteRecord { return SiteRecord { room: default_room(), unused: [] }; }
fn recursive(n: u32, a: Option<Geometry>, b: Result<Geometry, u32>) -> u32 {
    if n > 0 { return recursive(n - 1, a, b); }
    return inspect(a, b.fold(fn(value) => tag(value), fn(error) => error));
}
change install(g: Geometry) -> Unit writes(Terrain) { Terrain = Some(g); return (); }
change report(g: Geometry, ready: Bool) -> Unit writes(Status) {
    Status = if ready { Ok(g) } else { Err(g) };
    return ();
}
change put(g: Geometry) -> Unit writes(Rooms) { Rooms.put(3, g); return (); }
change install_site(site: SiteRecord) -> Unit writes(Site, Sites) {
    Site = site;
    Sites.put(3, site);
    return ();
}
change replace(g: Geometry) -> Result<u32, String> writes(Terrain) {
    Terrain = Some(g);
    return Ok(20);
}
change read_then_replace(g: Geometry) -> Result<u32, String> reads(Terrain) writes(Terrain) {
    return Ok(inspect(Terrain, replace(g)?));
}
change put_key(g: Geometry) -> Result<u32, String> writes(Rooms) {
    Rooms.put(3, g);
    return Ok(3);
}
change key_then_read(g: Geometry) -> Result<u32, String> reads(Rooms) writes(Rooms) {
    return Ok(tag(Rooms.get(put_key(g)?).unwrap_or(default_room())));
}
change room_default(g: Geometry) -> Result<Geometry, String> writes(Rooms) {
    Rooms.put(3, g);
    return Ok(default_room());
}
change read_with_effectful_default(g: Geometry) -> Result<u32, String> reads(Rooms) writes(Rooms) {
    return Ok(tag(Rooms.get(3).unwrap_or(room_default(g)?)));
}
change replace_site(site: SiteRecord) -> Result<u32, String> writes(Site) {
    Site = site;
    return Ok(3);
}
change read_projected_then_replace(site: SiteRecord) -> Result<u32, String> reads(Site) writes(Site) {
    return Ok(count_items(Site.room.items, replace_site(site)?));
}
query read_value(n: u32) -> u32 reads(Terrain) { return inspect(Terrain, offset(n)); }
query read_status() -> u32 reads(Status) { return inspect_status(Status); }
query read_slot(key: u32) -> u32 reads(Rooms) {
    return tag(Rooms.get(key).unwrap_or(default_room()));
}
query owned_result() -> List<Item> reads(Terrain) { return detach(Terrain); }
query read_projected(extra: u32) -> u32 reads(Site) { return count_items(Site.room.items, extra); }
query read_projected_slot(key: u32) -> u32 reads(Sites) {
    return tag(Sites.get(key).unwrap_or(default_site()).room);
}
query owned_projection() -> List<Item> reads(Site) { return Site.room.items; }
"#;
    let module = CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
    let dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("build/state-parameter-loans");
    fs::create_dir_all(&dir).unwrap();
    let image = dir.join("input.core.json");
    let packet = dir.join("input.plan.json");
    let project = dir.join("project");
    fs::write(&image, module.bytes().unwrap()).unwrap();
    let emitted = Command::new(env!("CARGO_BIN_EXE_ink"))
        .arg("emit-parameter-loans").arg(&image).args(["--core", "-o"]).arg(&packet)
        .output().unwrap();
    assert!(emitted.status.success(), "{}", String::from_utf8_lossy(&emitted.stderr));
    let package = planning::from_bytes(&fs::read(&packet).unwrap()).unwrap();
    let checked = planning::check(&module, &package).unwrap();
    let selected = checked.physical().unwrap();
    for parameter in ["a", "b"] {
        assert!(!selected.borrows_read(&physical::parameter_read_site("recursive", parameter).unwrap()));
    }
    assert!(selected.borrows_read(&physical::parameter_read_site("inspect", "g").unwrap()));
    assert!(selected.borrows_read(&physical::parameter_read_site("inspect_status", "status").unwrap()));
    assert!(selected.borrows_read(&physical::parameter_read_site("count_items", "items").unwrap()));
    let built = Command::new(env!("CARGO_BIN_EXE_ink")).arg("build").arg(&image)
        .args(["--core", "--plan"]).arg(&packet).args(["--target", "rust", "-o"]).arg(&project)
        .output().unwrap();
    assert!(built.status.success(), "{}", String::from_utf8_lossy(&built.stderr));

    let path = project.join("src/lib.rs");
    let mut code = fs::read_to_string(&path).unwrap();
    let declared = "#[derive(Clone,Debug,PartialEq,Eq)] pub struct l_Item";
    assert!(code.contains(declared));
    code = code.replace(declared, "#[derive(Debug,PartialEq,Eq)] pub struct l_Item");
    code.push_str(r#"
pub static CLONES: std::sync::atomic::AtomicUsize = std::sync::atomic::AtomicUsize::new(0);
impl Clone for l_Item {
    fn clone(&self) -> Self {
        CLONES.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
        Self { l_value: self.l_value }
    }
}
"#);
    fs::write(path, code).unwrap();
    let bins = project.join("src/bin");
    fs::create_dir_all(&bins).unwrap();
    fs::write(bins.join("observe.rs"), r#"use compiled_state::{State, l_Geometry, l_Item, l_SiteRecord, CLONES};
use std::sync::atomic::Ordering::Relaxed;

fn geometry(tag: u32) -> l_Geometry {
    l_Geometry { l_tag: tag, l_items: (0..8192).map(|l_value| l_Item { l_value }).collect() }
}

fn site(tag: u32) -> l_SiteRecord {
    l_SiteRecord { l_room: geometry(tag), l_unused: geometry(0).l_items }
}

fn main() {
    let mut state = State::new();
    assert_eq!(state.invoke_l_read_value(2).unwrap().result, 3);
    assert_eq!(state.invoke_l_read_status().unwrap().result, 20);
    assert_eq!(state.invoke_l_read_slot(3).unwrap().result, 81);
    assert_eq!(state.invoke_l_read_projected(2).unwrap().result, 2);
    assert_eq!(state.invoke_l_read_projected_slot(3).unwrap().result, 81);
    state.invoke_l_install(geometry(7)).unwrap();
    state.invoke_l_put(geometry(11)).unwrap();
    CLONES.store(0, Relaxed);
    assert_eq!(state.invoke_l_read_value(2).unwrap().result, 10);
    assert_eq!(state.invoke_l_read_slot(3).unwrap().result, 11);
    assert_eq!(state.invoke_l_read_slot(4).unwrap().result, 81);
    assert_eq!(CLONES.load(Relaxed), 0);
    for (ready, expected) in [(true, 31), (false, 32)] {
        state.invoke_l_report(geometry(31), ready).unwrap();
        CLONES.store(0, Relaxed);
        assert_eq!(state.invoke_l_read_status().unwrap().result, expected);
        assert_eq!(CLONES.load(Relaxed), 0);
    }
    let detached = state.invoke_l_owned_result().unwrap().result;
    assert_eq!(detached.len(), 8192);
    assert_eq!(CLONES.load(Relaxed), 8192);
    assert_eq!(state.invoke_l_read_then_replace(geometry(44)).unwrap().result, Ok(27));
    assert_eq!(state.invoke_l_key_then_read(geometry(54)).unwrap().result, Ok(54));
    assert_eq!(state.invoke_l_read_with_effectful_default(geometry(66)).unwrap().result, Ok(54));
    CLONES.store(0, Relaxed);
    assert_eq!(state.invoke_l_read_value(2).unwrap().result, 47);
    assert_eq!(state.invoke_l_read_slot(3).unwrap().result, 66);
    assert_eq!(CLONES.load(Relaxed), 0);
    assert_eq!(detached[0].l_value, 0);
    assert_eq!(state.function_l_recursive(2, None, Err(8)), 8);
    state.invoke_l_install_site(site(14)).unwrap();
    CLONES.store(0, Relaxed);
    assert_eq!(state.invoke_l_read_projected(2).unwrap().result, 8194);
    assert_eq!(state.invoke_l_read_projected_slot(3).unwrap().result, 14);
    assert_eq!(state.invoke_l_read_projected_slot(4).unwrap().result, 81);
    assert_eq!(CLONES.load(Relaxed), 0);
    assert_eq!(state.invoke_l_owned_projection().unwrap().result.len(), 8192);
    assert_eq!(CLONES.load(Relaxed), 8192);
    let mut small = site(21);
    small.l_room.l_items.truncate(4);
    assert_eq!(state.invoke_l_read_projected_then_replace(small).unwrap().result, Ok(8195));
    assert_eq!(state.invoke_l_read_projected(2).unwrap().result, 6);
}
"#).unwrap();
    let result = Command::new(env!("CARGO")).args(["run", "--quiet", "--offline", "--manifest-path"])
        .arg(project.join("Cargo.toml")).args(["--bin", "observe", "--target-dir"])
        .arg(dir.join("target")).output().unwrap();
    assert!(result.status.success(), "{}", String::from_utf8_lossy(&result.stderr));
}
