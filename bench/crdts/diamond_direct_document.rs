// Same causal input adapter, using upstream's direct API only when the
// requested parents are exactly the current branch and operation-log frontier.
// Otherwise append normally and merge the whole imported chunk once.
pub fn apply_document(document:&mut diamond_types::list::ListCRDT,changes:&[Prepared]) {
 for c in changes {
  let agent=document.oplog.get_or_create_agent_id(&c.actor);
  let mut parents:Vec<usize>=c.parents.iter().map(|(name,seq)|document.oplog.cg.agent_assignment.remote_to_local_version(RemoteVersion(name,*seq))).collect();parents.sort_unstable();
  if parents.as_slice()==document.branch.local_frontier_ref() && document.branch.local_frontier_ref()==document.oplog.cg.version.as_ref() {
   if c.remove>0 {document.branch.delete_without_content(&mut document.oplog,agent,c.position..c.position+c.remove);}
   if !c.text.is_empty() {document.branch.insert(&mut document.oplog,agent,c.position,&c.text);}
  } else {
   if c.remove>0 {let end=document.oplog.add_delete_at(agent,&parents,c.position..c.position+c.remove);parents=vec![end];}
   if !c.text.is_empty() {document.oplog.add_insert_at(agent,&parents,c.position,&c.text);}
  }
 }
 if document.branch.local_frontier_ref()!=document.oplog.cg.version.as_ref() {document.branch.merge(&document.oplog,document.oplog.cg.version.as_ref());}
}
