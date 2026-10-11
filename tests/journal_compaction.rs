//! Mechanism assertions complement source-observation parity: repeated writes
//! must retain one before-image and clear it at every transaction boundary.
use std::{fs, path::Path, process::Command};
use verified_language::syntax::parse;
#[test]
fn generated_journals_keep_one_before_image_per_cell() {
    let source="module journal;enum Error{Failed,}state Rows:Table<u64,u64> = Table.empty();change put(key:u64,value:u64)->Result<Unit,Error> writes(Rows){if Rows.contains(key){Rows.replace(key,value);}else{Rows.insert(key,value);}return Ok(());}change fail(key:u64,value:u64)->Result<Unit,Error> writes(Rows){if Rows.contains(key){Rows.replace(key,value);}return Err(Error.Failed);}";
    let p = parse(source).unwrap();
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("build/journal-compaction");
    let c = root.join("c");
    verified_language::runtime::emit_c_program(
        &verified_language::core::CheckedModule::from_source(p.clone()).unwrap(),
        &c,
    )
    .unwrap();
    let mut generated = fs::read_to_string(c.join("src/lib.rs")).unwrap();
    generated.push_str(r#"
#[test]fn first_before_image(){
 let mut state=State::new();state.ctx.tables[0].insert(V::U64(7),V::U64(11));
 for n in 0..1000 {state.ctx.primitive("table:0:replace",&mut [V::U64(7),V::U64(n)]).unwrap();}
 assert_eq!(state.ctx.undo.len(),1);state.ctx.rollback();assert_eq!(state.ctx.tables[0].get(&V::U64(7)),Some(&V::U64(11)));assert!(state.ctx.undo.is_empty());
 state.ctx.primitive("table:0:insert",&mut [V::U64(9),V::U64(13)]).unwrap();state.ctx.primitive("table:0:remove",&mut [V::U64(9)]).unwrap();assert_eq!(state.ctx.undo.len(),1);state.ctx.rollback();assert!(!state.ctx.tables[0].contains_key(&V::U64(9)));
 state.invoke_json("put",&json!([7,19])).unwrap();assert!(state.ctx.undo.is_empty());state.ctx.primitive("table:0:replace",&mut [V::U64(7),V::U64(23)]).unwrap();state.ctx.rollback();assert_eq!(state.ctx.tables[0].get(&V::U64(7)),Some(&V::U64(19)));
 state.begin_transaction().unwrap();state.invoke_json("put",&json!([7,29])).unwrap();assert_eq!(state.invoke_json("fail",&json!([7,31])).unwrap()["committed"],false);assert_eq!(state.ctx.tables[0].get(&V::U64(7)),Some(&V::U64(29)));state.invoke_json("put",&json!([7,37])).unwrap();state.rollback_transaction();assert_eq!(state.ctx.tables[0].get(&V::U64(7)),Some(&V::U64(19)));state.begin_transaction().unwrap();state.invoke_json("put",&json!([7,41])).unwrap();state.commit_transaction();assert_eq!(state.ctx.tables[0].get(&V::U64(7)),Some(&V::U64(41)));
}
"#);
    fs::write(c.join("src/lib.rs"), generated).unwrap();
    let rust = root.join("rust");
    fs::create_dir_all(rust.join("src")).unwrap();
    let mut generated = verified_language::state_native::emit(&p).unwrap();
    generated.push_str(r#"
#[test]fn first_before_image(){
 let mut state=State::new();state.l_Rows.insert(7,11);
 for n in 0..1000 {state.set_l_Rows(7,Some(n),false);}
 assert_eq!(state.undo.len(),1);state.rollback();assert_eq!(state.l_Rows.get(&7),Some(&11));assert!(state.undo.is_empty());assert!(state.journal_keys_l_Rows.is_empty());
 state.set_l_Rows(9,Some(13),false);state.set_l_Rows(9,None,false);assert_eq!(state.undo.len(),1);state.rollback();assert!(!state.l_Rows.contains_key(&9));
 state.invoke_json("put",&json!([7,19])).unwrap();assert!(state.undo.is_empty());assert!(state.journal_keys_l_Rows.is_empty());state.set_l_Rows(7,Some(23),false);state.rollback();assert_eq!(state.l_Rows.get(&7),Some(&19));
 state.begin_transaction().unwrap();state.invoke_json("put",&json!([7,29])).unwrap();assert_eq!(state.invoke_json("fail",&json!([7,31])).unwrap()["committed"],false);assert_eq!(state.l_Rows.get(&7),Some(&29));state.invoke_json("put",&json!([7,37])).unwrap();state.rollback_transaction();assert_eq!(state.l_Rows.get(&7),Some(&19));state.begin_transaction().unwrap();state.invoke_json("put",&json!([7,41])).unwrap();state.commit_transaction();assert_eq!(state.l_Rows.get(&7),Some(&41));
}
"#);
    fs::write(rust.join("src/lib.rs"), generated).unwrap();
    fs::write(rust.join("Cargo.toml"),"[package]\nname=\"journal-compaction\"\nversion=\"0.1.0\"\nedition=\"2021\"\n[dependencies]\nnum-bigint=\"=0.4.8\"\nserde_json={version=\"=1.0.151\",features=[\"float_roundtrip\"]}\nsha2=\"=0.10.9\"\n[workspace]\n").unwrap();
    for dir in [&c, &rust] {
        let out = Command::new(env!("CARGO"))
            .args(["test", "--offline", "--quiet", "--lib", "--manifest-path"])
            .arg(dir.join("Cargo.toml"))
            .output()
            .unwrap();
        assert!(
            out.status.success(),
            "{}",
            format!("{}{}", String::from_utf8_lossy(&out.stdout), String::from_utf8_lossy(&out.stderr))
        );
    }
    let mut js = fs::read_to_string("lowerings/js/src/state.mjs").unwrap();
    js.push_str(
        r#"
const rt={tables:[new Map([[7n,11n]])],undo:[],seen:[new Set()]};
for(let i=0n;i<1000n;i++)__table(rt,0,'replace',[7n,i]);
if(rt.undo.length!==1||rt.undo[0][3]!==11n)throw Error('journal did not retain one original value');
__table(rt,0,'remove',[7n]);__table(rt,0,'insert',[7n,19n]);
if(rt.undo.length!==1)throw Error('remove/reinsert duplicated the journal');
__table(rt,0,'insert',[9n,13n]);__table(rt,0,'remove',[9n]);
if(rt.undo.length!==2||rt.undo[1][2]!==false)throw Error('absent before-image was lost');
"#,
    );
    fs::write(root.join("journal.mjs"), js).unwrap();
    let out = Command::new("node")
        .arg(root.join("journal.mjs"))
        .output()
        .unwrap();
    assert!(
        out.status.success(),
        "{}",
        format!("{}{}", String::from_utf8_lossy(&out.stdout), String::from_utf8_lossy(&out.stderr))
    );
    let module = verified_language::core::CheckedModule::from_source(p).unwrap();
    let mut js = verified_language::javascript::lower(&module).unwrap().javascript;
    js.push_str(r#"
const state=createState();state.invoke('put',[7,19]);
const before=Buffer.from(await state.checkpoint());
state.beginTransaction();state.invoke('put',[7,29]);
const committed=Buffer.from(await state.checkpoint());
if(state.invoke('fail',[7,31]).committed)throw Error('failed action committed');
if(!Buffer.from(await state.checkpoint()).equals(committed))throw Error('failed action lost prior host work');
state.invoke('put',[7,37]);state.rollbackTransaction();
if(!Buffer.from(await state.checkpoint()).equals(before))throw Error('host rollback lost original state');
state.beginTransaction();state.invoke('put',[7,41]);state.commitTransaction();
if(Buffer.from(await state.checkpoint()).equals(before))throw Error('host commit lost writes');
"#);
    fs::write(root.join("host-journal.mjs"),js).unwrap();
    let out=Command::new("node").arg(root.join("host-journal.mjs")).output().unwrap();
    assert!(out.status.success(),"{}",format!("{}{}", String::from_utf8_lossy(&out.stdout), String::from_utf8_lossy(&out.stderr)));
}
