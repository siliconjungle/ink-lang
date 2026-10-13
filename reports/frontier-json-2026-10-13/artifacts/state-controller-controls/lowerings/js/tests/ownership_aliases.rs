use ink_core::{core::CheckedModule, syntax::parse};
use std::{fs, process::Command};

#[test]
fn owned_replies_preserve_same_sort_aliases_across_expanded_and_recursive_schemas() {
    let source = r#"module aliases;
record Row { values:List<u32>, }
record Pair { left:List<Row>, right:List<Row>, }
enum Tree { Leaf(List<Row>), Node(List<Tree>), }
record Mixed { tree:Tree, children:List<Tree>, }
state Rows:Table<String,Row> = Table.empty();
change put(row:Row)->Unit writes(Rows) {Rows.put("a",row);Rows.put("b",row);return ();}
query pair()->Pair reads(Rows) {let rows=Rows.values();return Pair{left:rows,right:rows};}
query mixed()->Mixed reads(Rows) {let children=list(Tree.Leaf(Rows.values()));return Mixed{tree:Tree.Node(children),children:children};}
"#;
    let checked = CheckedModule::from_source(parse(source).unwrap()).unwrap();
    let directory = std::env::temp_dir().join(format!("ink-ownership-aliases-{}", std::process::id()));
    fs::create_dir_all(&directory).unwrap();
    fs::write(directory.join("program.mjs"), ink_lowering_js::lower(&checked).unwrap().javascript).unwrap();
    fs::write(directory.join("run.mjs"), r#"
import assert from 'node:assert/strict';import {createState}from './program.mjs';
const state=createState(),host={values:[1,2]};state.invoke('put',[host]);host.values[0]=99;
const pair=state.invoke('pair',[]).result;
assert.strictEqual(pair.left,pair.right);assert.strictEqual(pair.left[0],pair.left[1]);
pair.left[0].values[0]=7;assert.equal(pair.right[1].values[0],7);
const again=state.invoke('pair',[]).result;assert.notStrictEqual(again.left,pair.left);assert.equal(again.left[0].values[0],1);
const mixed=state.invoke('mixed',[]).result;
assert.strictEqual(mixed.tree.payload.Err.item0,mixed.children);
const rows=mixed.children[0].payload.Ok.item0;assert.strictEqual(rows[0],rows[1]);rows[0].values[0]=8;
const next=state.invoke('mixed',[]).result;assert.notStrictEqual(next.children,mixed.children);assert.equal(next.children[0].payload.Ok.item0[0].values[0],1);
const saved=await state.checkpoint();await state.restore(saved);assert.deepEqual(await state.checkpoint(),saved);assert.strictEqual(state.invoke('pair',[]).result.left[0].values[0],1);
"#).unwrap();
    let result = Command::new("node").arg(directory.join("run.mjs")).output().unwrap();
    fs::remove_dir_all(directory).unwrap();
    assert!(result.status.success(), "{}", String::from_utf8_lossy(&result.stderr));
}
