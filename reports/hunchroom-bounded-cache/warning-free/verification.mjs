// Both the independent verifier and readers use this exact source builder and policy.
export const POLICY_VERSION = 'oa-lean-v1';
export const RESOURCE_LIMITS = Object.freeze({
  verification_timeout_seconds:1200, bridge_timeout_seconds:1320,
  browser_timeout_seconds:1440, workflow_timeout_seconds:5400,
  checker_lease_seconds:14400, cli_wait_timeout_seconds:14400,
  hosted_backend:'container', hosted_compute_seconds:1200,
  worker_cpu_seconds:300, upload_timeout_seconds:1200, api_request_timeout_seconds:300,
  memory_initial_mib:3072, cli_memory_initial_mib:2048, memory_max_mib:4096,
  cli_stack_mib:64, cli_stack_max_mib:256, hosted_stack_mib:64,
  heartbeats:20000000, recursion_depth:16384,
  concurrent_platform_checks:8, pending_checks_per_account:50, pending_checks_platform:5000,
  active_uploads:8, account_upload_bytes_per_day:1024*1024*1024,
  verification_requests_per_minute:10, write_requests_per_minute:60,
});
export const MAX_PROOF_BYTES = 64 * 1024 * 1024;
export const MAX_SOURCE_CHARS = 200 * 1024 * 1024;
export const PROFILES = {
  core: { label: 'Lean core', imports: ['Init'] },
  mathlib: { label: 'Mathlib (browser subset)', imports: ['Mathlib.Data.Real.Basic', 'Mathlib.Tactic.Ring', 'Mathlib.Tactic.Linarith', 'Mathlib.Tactic.NormNum'] },
  std: { label: 'Standard library — lists, arrays, maps', imports: ['Std', 'Batteries', 'Lean.Elab.Tactic.Omega'] },
  discrete: { label: 'Finite sets and counting', imports: ['Mathlib.Data.Finset.Card', 'Mathlib.Data.Finset.Powerset', 'Mathlib.Algebra.BigOperators.Group.Finset.Basic', 'Mathlib.Tactic.NormNum'] },
  number_theory: { label: 'Number theory — primes and divisibility', imports: ['Mathlib.Data.Nat.Prime.Infinite', 'Mathlib.Data.Nat.GCD.Basic', 'Mathlib.Data.Int.ModEq', 'Mathlib.Tactic.NormNum', 'Mathlib.Tactic.Ring'] },
  algebra: { label: 'Algebra — groups, rings, polynomials', imports: ['Mathlib.Data.Real.Basic', 'Mathlib.Algebra.Polynomial.Basic', 'Mathlib.Algebra.Polynomial.Eval.Defs', 'Mathlib.GroupTheory.QuotientGroup.Basic', 'Mathlib.Tactic.Ring', 'Mathlib.Tactic.NormNum'] },
  linear_algebra: { label: 'Linear algebra — matrices and linear maps', imports: ['Mathlib.Data.Real.Basic', 'Mathlib.Data.Matrix.Mul', 'Mathlib.LinearAlgebra.Matrix.ToLin', 'Mathlib.Tactic.Ring', 'Mathlib.Tactic.Linarith'] },
  topology: { label: 'Topology — continuity, limits, metric spaces', imports: ['Mathlib.Topology.MetricSpace.Basic', 'Mathlib.Topology.Algebra.Order.Field', 'Mathlib.Topology.Instances.RealVectorSpace', 'Mathlib.Tactic.Linarith'] },
  analysis: { label: 'Real analysis — sequences, exp, log, trigonometry', imports: ['Mathlib.Analysis.SpecialFunctions.Exp', 'Mathlib.Analysis.SpecialFunctions.Log.Basic', 'Mathlib.Analysis.SpecialFunctions.Trigonometric.Basic', 'Mathlib.Tactic.Ring', 'Mathlib.Tactic.Linarith', 'Mathlib.Tactic.NormNum'] },
  graph_theory: { label: 'Graph theory — paths, cycles, colouring', layer: 'graph_theory', imports: ['Mathlib.Combinatorics.SimpleGraph.Paths', 'Mathlib.Combinatorics.SimpleGraph.Coloring.Vertex', 'Mathlib.Combinatorics.SimpleGraph.Acyclic', 'Mathlib.Tactic.NormNum'] },
  computability: { label: 'Computability — Turing machines and undecidability', layer: 'computability', imports: ['Mathlib.Computability.TuringMachine.StackTuringMachine', 'Mathlib.Computability.Halting'] },
  probability: { label: 'Probability — distributions, independence, expectations', layer: 'probability', imports: ['Mathlib.Probability.ProbabilityMassFunction.Basic', 'Mathlib.Probability.ProbabilityMassFunction.Constructions', 'Mathlib.Probability.Independence.Basic', 'Mathlib.MeasureTheory.Integral.Bochner.Basic', 'Mathlib.Tactic.NormNum'] },
  calculus: { label: 'Calculus — derivatives, extrema, convex optimisation', layer: 'calculus', imports: ['Mathlib.Analysis.Calculus.Deriv.Basic', 'Mathlib.Analysis.Calculus.Deriv.Mul', 'Mathlib.Analysis.Calculus.LocalExtr.Basic', 'Mathlib.Analysis.Convex.Deriv', 'Mathlib.Tactic.Ring', 'Mathlib.Tactic.Linarith'] },
};
const forbidden = /\b(?:sorry|admit|axiom|opaque|theorem|lemma|def|abbrev|instance|class|structure|inductive|import|namespace|section|end|export|open|attribute|macro|syntax|elab|initialize|builtin_initialize|unsafe|partial|noncomputable|set_option|run_tac|native_decide|bv_decide|ofReduceBool|implemented_by|extern|include|omit|mutual|where)\b|[#`"«»]|\/-|-\//u;
// A rolling upload scanner checks tokens across chunk boundaries. Only the final
// 256 characters are deferred, so words cannot be truncated at a chunk boundary.
export function validateLeanFragment(text, final = true) {
  const patterns = [new RegExp(forbidden.source, 'gu'), /--|\p{Cf}/gu, /\b(?:Lean|IO|System|Environment|Parser|Meta|Elab|Command|unsafeCast|evalExpr|exec|system)\b/gu];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text))) if (final || match.index + match[0].length <= text.length - 256) throw new Error('Use a Lean proof term only. Declarations, metaprograms, placeholders and comments are not accepted.');
  }
}
export function validateLean(text, type = 'proof') {
  if (typeof text !== 'string' || !text.trim()) throw new Error(type === 'statement' ? 'A Lean proposition is required.' : 'A Lean proof attempt is required.');
  if (text.length > (type === 'statement' ? 8000 : MAX_PROOF_BYTES)) throw new Error('Lean source is too long.');
  if (forbidden.test(text) || /--|\p{Cf}/u.test(text)) throw new Error('Use a proposition or proof term only. Declarations, metaprograms, placeholders and comments are not accepted.');
  if (type === 'statement' && /:=/.test(text)) throw new Error('Enter the proposition, without a declaration or proof.');
  if (type === 'proof' && /\b(?:Lean|IO|System|Environment|Parser|Meta|Elab|Command|unsafeCast|evalExpr|exec|system)\b/u.test(text)) throw new Error('Metaprograms are not supported in submitted proofs.');
  return text.trim();
}
// Preserve Lean's indentation-sensitive syntax; only normalize inert formatting.
export function canonicalStatement(text) {
  return validateLean(text,'statement').replace(/\r\n?/g,'\n').split('\n').map(line=>line.replace(/[ \t]+$/g,'')).join('\n').trim();
}
export function moduleDeclarations(input) {
  if(!Array.isArray(input)||input.length<1||input.length>32)throw new Error('Supply 1–32 module declarations.');
  const names=new Set();
  return input.map(d=>{
    if(!d||!['definition','lemma'].includes(d.kind)||typeof d.name!=='string'||!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(d.name)||names.has(d.name))throw new Error('Use unique plain names for definitions and lemmas.');
    validateLean(d.name);names.add(d.name);
    const type=validateLean(d.type,d.kind==='lemma'?'statement':'type'),value=validateLean(d.value);
    if(type.length>8000||value.length>16000)throw new Error('Module declaration is too long.');
    return {kind:d.kind,name:d.name,type,value};
  });
}
export function moduleSource(namespace,declarations){
  if(typeof namespace!=='string'||!/^[A-Z][A-Za-z0-9_]{0,63}$/.test(namespace))throw new Error('Use a module namespace such as PatchReplay.');
  validateLean(namespace);
  return `namespace Hunch.${namespace}\n`+moduleDeclarations(declarations).map(d=>`${d.kind==='lemma'?'theorem':'def'} ${d.name} : (${d.type}) :=\n  ${d.value.replaceAll('\n','\n  ')}\n`).join('\n')+`\nend Hunch.${namespace}\n`;
}
export function moduleIdentity(problem,leanCommit,policy=POLICY_VERSION){
  const identity={statement:problem.statement,profile:problem.profile||'core',leanCommit,policy};
  const pins=typeof problem.module_pins==='string'?JSON.parse(problem.module_pins):problem.module_pins;
  if(pins?.length)identity.modules=pins.map(p=>({id:p.id,hash:p.hash}));
  return identity;
}
export function moduleAudit(result,namespace,declarations){
  const base=assessResult(result,true);if(!base.ok)return base;
  const all=new Set(base.axioms);
  for(const d of moduleDeclarations(declarations)){
    const name='Hunch.'+namespace+'.'+d.name,escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const m=base.log.match(new RegExp("^['‘]?(?:_private\\.[A-Za-z0-9_.]+\\.)?"+escaped+"['’]? depends on axioms:\\s*\\[([^\\]]*)\\]\\s*$",'m'));
    const none=new RegExp("^['‘]?(?:_private\\.[A-Za-z0-9_.]+\\.)?"+escaped+"['’]? does not depend on any axioms\\s*$",'m').test(base.log);
    if(!m&&!none)return {...base,ok:false,log:base.log+'\nMissing module certificate: '+name};
    for(const a of m?m[1].split(',').map(s=>s.trim()).filter(Boolean):[]){if(!['propext','Classical.choice','Quot.sound'].includes(a))return {...base,ok:false};all.add(a);}
  }
  return {...base,axioms:[...all]};
}
export function sourceEnvelope(problem, expanded = false) {
  const statement = validateLean(problem.statement, 'statement');
  const key=problem.profile || 'core';
  const profile = Object.hasOwn(PROFILES,key)?PROFILES[key]:null;
  if (!profile) throw new Error('Unknown dependency profile.');
  const header = profile.imports.map(x => `import ${x}`).join('\n');
  const context=typeof problem.module_context==='string'?JSON.parse(problem.module_context):problem.module_context||[];
  let definitions=context.map(m=>m.source).join('\n');
  if(problem.module_declarations)definitions+=(definitions?'\n':'')+moduleSource(problem.namespace,typeof problem.module_declarations==='string'?JSON.parse(problem.module_declarations):problem.module_declarations);
  const base = `${header}\n\n${definitions?definitions+'\n':''}def OA_statement : Prop := (${statement})\n`;
  const audit=problem.module_declarations?(typeof problem.module_declarations==='string'?JSON.parse(problem.module_declarations):problem.module_declarations).map(d=>`#print axioms Hunch.${problem.namespace}.${d.name}\n`).join(''):'';
  return { statement: `${base}\n#check OA_statement\n`, prefix: `${base}\n${expanded?'set_option maxHeartbeats 5000000\nset_option maxRecDepth 4096\n\n':''}theorem OA_target : OA_statement :=\n  `, suffix: '\n\n'+audit+'#print axioms OA_target\n#check OA_target\n' };
}
export function buildSource(problem, proof, raw = false) {
  const envelope = sourceEnvelope(problem, raw && proof !== undefined);
  if (proof === undefined) return envelope.statement;
  const checked = validateLean(proof);
  return envelope.prefix + (raw ? proof : checked).replaceAll('\n', '\n  ') + envelope.suffix;
}
export function executionSource(source) {
  const imports=source.match(/^(?:import [A-Za-z0-9_.]+(?:\n|$))+/)?.[0];
  if(!imports)throw new Error('Verification source must start with approved imports.');
  const body=source.slice(imports.length).replace(/\nset_option maxHeartbeats 5000000\nset_option maxRecDepth 4096\n/g,'\n');
  return imports.trimEnd()+'\n\nset_option maxHeartbeats '+RESOURCE_LIMITS.heartbeats+'\nset_option maxRecDepth '+RESOURCE_LIMITS.recursion_depth+'\n'+body;
}
export function needsLargeStack(result) {
  return !result.ok && !!result.capacity && /maximum call stack size exceeded|stack overflow/i.test(result.log || '');
}
export function assessResult(result, isProof = true) {
  const log = [result.output || '', ...(result.errors || [])].join('\n').slice(0,32000);
  const capacity = !!result.capacity || /out of memory|memory access out of bounds|allocation failed|maximum memory|timed out|timeout|maximum recursion depth|maximum number of heartbeats|resource exhausted|stack overflow|call stack size exceeded/i.test(log);
  if (capacity) return { ok:false, capacity:true, log, axioms:[] };
  if (result.exitCode !== 0 || result.errors?.length || /\berror:|\bwarning:|sorryAx|uses 'sorry'|declaration uses|unsolved goals/i.test(log)) return { ok: false, log, axioms: [] };
  if (!isProof) return { ok: /^OA_statement\s*:\s*Prop\s*$/m.test(log), log, axioms: [] };
  const match = log.match(/^['‘]?(?:_private\.[A-Za-z0-9_.]+\.)?OA_target['’]? depends on axioms:\s*\[([^\]]*)\]\s*$/m);
  const noAxioms = /^['‘]?(?:_private\.[A-Za-z0-9_.]+\.)?OA_target['’]? does not depend on any axioms\s*$/m.test(log);
  const axioms = match ? match[1].split(',').map(x => x.trim()).filter(Boolean) : [];
  const allowed = new Set(['propext', 'Classical.choice', 'Quot.sound']);
  return { ok: /^OA_target\s*:\s*OA_statement\s*$/m.test(log) && (noAxioms || !!match) && axioms.every(x => allowed.has(x)), log, axioms };
}
export async function sourceHash(value) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map(x => x.toString(16).padStart(2, '0')).join('');
}

// Bind the isolated checker to its executable/library artifacts. CLI-only changes
// do not change the browser kernel or invalidate queued browser checks.
export async function verifierFingerprint(manifest) {
 const scripts=new Set(['verification.js','lean-wasm.global.js','lean-checker.js','independent-checker.js','nanoda-worker.js']);
 const pins=Object.entries(manifest.files).filter(([path])=>scripts.has(path)||/^(lean\/|lean-packs\/|lean-research\/|independent\/v1\/)/.test(path)).map(([path,pin])=>[path,pin.sha256]).sort(([a],[b])=>a.localeCompare(b));
 return sourceHash(JSON.stringify(pins));
}
