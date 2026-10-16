// Physical metadata for the SAME compiled pure pipeline. A partition changes
// placement only; it cannot introduce operations or premises.
export const placementBackends = ['cpu','javascript','gpu','cpu-worker','javascript-worker'];
const width = t => t.kind === 'list' ? width(t.element) : t.kind === 'vector' ? t.size*width(t.element) : t.kind === 'record' ? t.fields.reduce((n,f)=>n+width(f.type),0) : t.kind === 'u64' ? 2 : 1;
export function pipelineScope(manifest,p) {
  return JSON.stringify(['ink-pipeline-placement-v1',manifest.core_sha256,manifest.cpu_rust_sha256,manifest.javascript_sha256,manifest.shaders,manifest.runtime_host_sha256,manifest.pipeline_planner_sha256,
    p.constants.map(c=>c.type),p.steps.map(s=>[s.f.name,s.args.map(a=>a.input?['i',a.input]:[a.kind,a.index])]),
    p.outputs,[...p.feedback],p.iterations]);
}
export function segmentScope(scope,start,end) { return JSON.stringify([scope,start,end]); }
export function segmentOutputs(p,start,end) {
  const wanted=new Set(p.outputs.map(id=>p.ids.get(id)));
  for(const i of p.feedback.values())wanted.add(i);
  for(let i=end;i<p.steps.length;i++)for(const a of p.steps[i].args)if(a.kind==='step')wanted.add(a.index);
  const outputs=[...wanted].filter(i=>i>=start&&i<end).sort((a,b)=>a-b).map(i=>p.steps[i].id);
  return outputs.length?outputs:[p.steps[end-1].id];
}
export function segmentContext(scope,p,start,end) {
  const inputs=new Map();
  for(let i=start;i<end;i++)for(const a of p.steps[i].args) {
    if(a.kind==='step'&&a.index>=start)continue;
    const key=a.input?`i:${a.input}`:`${a.kind}:${a.index}`;
    inputs.set(key,a.kind==='constant'?p.constants[a.index]:{type:p.steps[a.index].f.result,count:p.steps[a.index].count});
  }
  const outputs=segmentOutputs(p,start,end),steps=p.steps.slice(start,end),graphMode=steps.some(s=>s.f.graph_required);
  const fixed=t=>t.kind==='list'?false:t.kind==='vector'?fixed(t.element):t.kind==='record'?t.fields.every(f=>fixed(f.type)):true;
  const known=[...inputs.values()].every(a=>a.type.kind==='list'?fixed(a.type.element)&&Number.isSafeInteger(a.count):fixed(a.type))&&outputs.every(id=>{const s=p.steps[p.ids.get(id)];return s.f.result.kind==='list'?fixed(s.f.result.element)&&Number.isSafeInteger(s.count):fixed(s.f.result)});
  const features={
    input_elements:[...inputs.values()].reduce((n,a)=>n+(a.type.kind==='list'?(a.count??0):0),0),
    input_bytes:[...inputs.values()].reduce((n,a)=>n+(a.type.kind==='list'?(a.count??0):1)*width(a.type)*4,0),
    output_capacity_elements:outputs.reduce((n,id)=>n+(p.steps[p.ids.get(id)].count??0),0),
    dispatches:steps.reduce((n,s)=>n+(graphMode?(s.f.graph?.nodes.length??0):(s.count?1:0)),0),iterations:1,
  };
  const eligible=steps.every(s=>(s.f.shader||s.f.graph_required)&&(!graphMode||s.f.graph)&&(!s.f.gpu_max_elements||s.args.every(a=>(a.count??0)<=s.f.gpu_max_elements)))&&p.constants.every(c=>c.finite);
  return {scope:segmentScope(scope,start,end),boundary:'captured-segment',features,known,gpu:eligible,outputs,start,end};
}
export function segmentContexts(manifest,p) {
  const scope=pipelineScope(manifest,p),out=[];
  for(let end=1;end<=p.steps.length;end++)for(let start=0;start<end;start++)out.push(segmentContext(scope,p,start,end));
  return out;
}
