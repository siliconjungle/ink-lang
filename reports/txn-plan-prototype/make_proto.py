#!/usr/bin/env python3
"""Hand-written prototype of a knowledge-supplied transaction plan for
examples/state-benchmark.lang (bounded variant). NOT compiler output.
Variants:
  outbox  : journaled as today, but events are written straight to the outbox
            with their final (commit, position) and truncated on abort.
  plan    : outbox + validate-before-mutate unjournaled top-level paths for
            create/restock/remove (all failure points precede the first effect;
            commit exhaustion checked before running), single-lookup entry/get_mut
            updates. fail() keeps the journaled path (it fails after writes).
"""
import sys,re,shutil,pathlib
src,dst,variant=sys.argv[1],sys.argv[2],sys.argv[3]
shutil.rmtree(dst,ignore_errors=True);shutil.copytree(src,dst,ignore=shutil.ignore_patterns('target*'))
p=pathlib.Path(dst)/'src/lib.rs';s=p.read_text()
def rep(a,b,count=1):
    global s
    n=s.count(a); assert n==count,(a[:90],n); s=s.replace(a,b)
# --- direct outbox (both variants) ---
rep("pub struct State {version:u64,staged:Vec<EventData>,outbox:Vec<Event>,undo:Vec<Undo>,",
    "pub struct State {version:u64,staged:Vec<EventData>,outbox:Vec<Event>,undo:Vec<Undo>,txn_commit:u64,txn_start:usize,")
rep("impl State {pub fn new()->Self{Self{version:0,staged:vec![],outbox:vec![],undo:vec![],",
    "impl State {pub fn new()->Self{Self{version:0,staged:vec![],outbox:vec![],undo:vec![],txn_commit:0,txn_start:0,")
rep("self.staged.push(EventData::l_updated(value));",
    "{let position=(self.outbox.len()-self.txn_start) as u64;self.outbox.push(Event{commit:self.txn_commit,position,data:EventData::l_updated(value)});}")
rep("}}self.staged.clear();}","}}self.outbox.truncate(self.txn_start);}")
old_tail="if result.is_err(){self.rollback();return Ok(OutcomeView{result,committed:false,version:self.version,events:&[]})}let Some(version)=self.version.checked_add(1) else {self.rollback();return Err(\"commit sequence exhausted\".into())};self.version=version;self.undo.clear();let start=self.outbox.len();self.outbox.extend(self.staged.drain(..).enumerate().map(|(position,data)|Event{commit:version,position:position as u64,data}));Ok(OutcomeView{result,committed:true,version,events:&self.outbox[start..]})}"
new_tail="if result.is_err(){self.rollback();return Ok(OutcomeView{result,committed:false,version:self.version,events:&[]})}let Some(version)=self.version.checked_add(1) else {self.rollback();return Err(\"commit sequence exhausted\".into())};self.version=version;self.undo.clear();let start=self.txn_start;Ok(OutcomeView{result,committed:true,version,events:&self.outbox[start..]})}"
rep(old_tail,new_tail,4)
for a in ['create','restock','remove','fail']:
    rep(f"Result<OutcomeView<'_,Result<(),l_Error>>,String>{{let result=self.action_l_{a}(",
        f"Result<OutcomeView<'_,Result<(),l_Error>>,String>{{self.txn_start=self.outbox.len();self.txn_commit=self.version.wrapping_add(1);let result=self.action_l_{a}(")
if variant=='plan':
    # Unjournaled top-level plans. Each is selected only when the commit cannot be exhausted.
    direct = {
     'create': ("l_key:u64,l_stock:u32","l_key,l_stock",
        "use std::collections::btree_map::Entry;match self.l_Items.entry(l_key){Entry::Occupied(_)=>Err(l_Error::l_Exists),Entry::Vacant(e)=>{e.insert(l_Row{l_stock});self.cache_l_total_units=self.cache_l_total_units.wrapping_add(l_stock as u128);Ok(())}}"),
     'restock': ("l_key:u64,l_amount:u32","l_key,l_amount",
        "let Some(slot)=self.l_Items.get_mut(&l_key) else {return Err(l_Error::l_Missing)};let before=slot.l_stock;let Some(next)=before.checked_add(l_amount) else {return Err(l_Error::l_Overflow)};*slot=l_Row{l_stock:next};self.cache_l_total_units=self.cache_l_total_units.wrapping_sub(before as u128).wrapping_add(next as u128);self.outbox.push(Event{commit:self.txn_commit,position:0,data:EventData::l_updated(l_Updated{l_key,l_before:before,l_after:next})});Ok(())"),
     'remove': ("l_key:u64","l_key",
        "if let Some(old)=self.l_Items.remove(&l_key){self.cache_l_total_units=self.cache_l_total_units.wrapping_sub(old.l_stock as u128);}Ok(())"),
    }
    for a,(params,args,body) in direct.items():
        head=f"pub fn invoke_view_l_{a}(&mut self,{params})->Result<OutcomeView<'_,Result<(),l_Error>>,String>{{"
        rep(head, head+f"if let Some(version)=self.version.checked_add(1){{self.txn_start=self.outbox.len();self.txn_commit=version;let result=self.direct_l_{a}({args});if result.is_err(){{return Ok(OutcomeView{{result,committed:false,version:self.version,events:&[]}})}}self.version=version;let start=self.txn_start;return Ok(OutcomeView{{result,committed:true,version,events:&self.outbox[start..]}})}}")
        s=s.replace(head, f"fn direct_l_{a}(&mut self,{params})->Result<(),l_Error>{{{body}}}\n"+head,1)
p.write_text(s)
print('wrote',dst,variant)
