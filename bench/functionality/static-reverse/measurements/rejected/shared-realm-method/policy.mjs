import {median} from './worker.mjs';
export const SETTINGS=Object.freeze({processes:3,samples:15,warmCalls:65536,warmMs:250,batchMs:24,maxCalls:1048576});
export const BUDGET=Object.freeze({relative:0.10,absoluteUs:0.02,controlRelative:0.10});
// Process ranges are descriptive; they are deliberately not labelled confidence intervals.
export function assess(runs,expectedCases) {
  if(runs.length!==SETTINGS.processes) throw Error('missing fresh process');
  for(const run of runs) for(const mode of ['baseline','candidate','control']) {
    if(!(run.verification?.[mode]?.independentChecks>0)) throw Error('missing independent verification');
  }
  const rows=[];
  for(const name of expectedCases) {
    const ratios=[],deltas=[],budgets=[],controls=[],controlDeltas=[],controlBudgets=[];
    for(const run of runs) {
      if(run.rows.length!==expectedCases.length) throw Error('unexpected case count');
      const row=run.rows.find(r=>r.name===name);
      if(!row||row.completeOutputsChecked!==SETTINGS.samples) throw Error('missing complete-output checks: '+name);
      if(!Number.isInteger(row.callsPerBatch)||row.callsPerBatch<1||row.callsPerBatch>SETTINGS.maxCalls||
        !Number.isInteger(row.warmCalls)||row.warmCalls<SETTINGS.warmCalls||row.warmCalls>SETTINGS.maxCalls) throw Error('invalid warmup or batch');
      for(const mode of ['baseline','candidate','control']) {
        const a=row.samplesUs[mode];
        if(a.length!==SETTINGS.samples||a.some(x=>!Number.isFinite(x)||x<=0)) throw Error('invalid samples: '+name);
      }
      const b=median(row.samplesUs.baseline),c=median(row.samplesUs.candidate),a=median(row.samplesUs.control);
      ratios.push(c/b);deltas.push(c-b);budgets.push(Math.max(BUDGET.absoluteUs,b*BUDGET.relative));controls.push(a/b);
      controlDeltas.push(Math.abs(a-b));controlBudgets.push(Math.max(BUDGET.absoluteUs,b*BUDGET.controlRelative));
    }
    const noisy=controlDeltas.some((x,i)=>x>controlBudgets[i]);
    const allBad=deltas.every((x,i)=>x>budgets[i]);
    const allGood=deltas.every((x,i)=>x<=budgets[i]);
    rows.push({name,status:noisy?'inconclusive':allBad?'regression':allGood?'pass':'inconclusive',
      ratio:median(ratios),processRatios:ratios,deltaUs:deltas,budgetUs:budgets,controlRatios:controls,controlDeltaUs:controlDeltas,controlBudgetUs:controlBudgets});
  }
  return {status:rows.every(r=>r.status==='pass')?'pass':rows.some(r=>r.status==='regression')?'regression':'inconclusive',rows};
}
export function validateEngine(id,identity) {
  if(typeof identity.v8!=='string'||!identity.v8) throw Error('V8 identity required');
  if(id==='node22' && (identity.kind!=='node'||identity.node!=='v22.22.1')) throw Error('Node 22.22.1 required');
  if(id==='node26' && (identity.kind!=='node'||identity.node!=='v26.1.0')) throw Error('Node 26.1.0 required');
  if(id==='chrome' && (identity.kind!=='chrome'||!identity.version||!identity.userAgent?.includes('Chrome/'))) throw Error('real Chrome required');
  if(!['node22','node26','chrome'].includes(id)) throw Error('unknown engine');
}
export function assessEngines(engines,cases) {
  if(!Array.isArray(cases)||!cases.length||new Set(cases).size!==cases.length) throw Error('nonempty distinct cases required');
  if(Object.keys(engines).sort().join(',')!=='chrome,node22,node26') throw Error('all required engines must be present');
  const results={};
  for(const [id,runs] of Object.entries(engines)) {
    for(const run of runs) validateEngine(id,run.identity);
    if(new Set(runs.map(r=>JSON.stringify(r.identity))).size!==1) throw Error('mixed engine identities');
    results[id]=assess(runs,cases);
  }
  return {status:Object.values(results).every(r=>r.status==='pass')?'pass':'blocked',engines:results};
}
