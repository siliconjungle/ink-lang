#!/usr/bin/env python3
"""Read-only source/binding audit of bounded pure-call target inlining.

This script authenticates reviewed source and author receipts. Source assertions
are regression sentinels, not a proof that the trusted C/JS emitters are correct.
It never compiles, executes targets, measures performance, or changes the store.
"""
import argparse,difflib,hashlib,json,re
from pathlib import Path
R=Path(__file__).resolve().parent;B=R.parents[1]
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
read=lambda p:json.loads(Path(p).read_text())

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--author-evidence',type=Path,required=True);args=parser.parse_args();errors=[];bindings={};checks=[]
 def bind(p):
  p=Path(p).resolve();bindings[str(p)]=sha(p);return p
 def check(label,condition):
  checks.append(dict(check=label,passed=bool(condition)))
  if not condition:errors.append(label)
 before=read(bind(R/'source-boundary-before.json'));pins=read(bind(R/'initial-pins.json'));production={'lowerings/c/src/compute.rs','lowerings/js/src/lib.rs'};allowed=production|{'lowerings/c/tests/concat.rs'};changed=[];sources={};diffs={}
 for name,digest in before.items():
  actual=sha(B/name)
  if actual!=digest:changed.append(name)
 check('102 guarded keys, two authorized emitter changes and concat test instrumentation',len(before)==102 and set(changed)==allowed and set(pins['expected_source_changes'])==allowed)
 for name in sorted(production):
  old=bind(R/'original-source'/name);new=bind(B/name);check('authenticated original '+name,sha(old)==before[name]);a,b=old.read_text(),new.read_text();sources[name]=b;diffs[name]=''.join(difflib.unified_diff(a.splitlines(True),b.splitlines(True),fromfile=str(old),tofile=str(new)))
  check('same bounded expansion constants '+name,all(f'const {key}: usize = {value};' in b for key,value in [('INLINE_MAX_BODY_NODES','2048'),('INLINE_MAX_DEPTH','8'),('INLINE_NODE_BUDGET','16_384')]))
  call=b[b.index('fn inline_call('):b.index('fn inline_call(')+b[b.index('fn inline_call('):].index('\n    fn ',10)]
  check('parameter-only callee environment '+name,'.params' in call and '.zip(values)' in call and 'env.clone()' not in call)
  check('bounded/cycle defensive fallback '+name,'inline_stack.len() >= INLINE_MAX_DEPTH' in call and 'inline_stack.contains(&f.name)' in call and 'nodes > self.inline_remaining' in call)
  check('inline stack popped after body attempt '+name,call.index('self.inline_stack.pop();')>call.index('let result ='))
  check('failed expansion rolls back source and fresh-name budgets '+name,all(x in call for x in ['self.lines.truncate(saved.0);','self.next = saved.1;','self.budget = saved.2;']))
  check('source emission budget restored after successful inline '+name,'self.budget = saved.2;' in call[call.index('Ok(value) =>'):call.index('Err(_) =>')])
  check('preserves regular call fallback '+name,('lang_fn_{n}({})' if '/c/' in name else '__fn{index}({})') in b)
 concat='lowerings/c/tests/concat.rs';bind(B/concat);check('authenticated original concat test instrumentation',sha(bind(R/'original-source'/concat))==before[concat])
 c=sources['lowerings/c/src/compute.rs'];j=sources['lowerings/js/src/lib.rs']
 check('C rollback also restores depth and expansion budget','self.depth = saved.3;' in c and 'self.inline_remaining = saved.4;' in c)
 check('JS rollback restores expansion budget','self.inline_remaining = saved.3;' in j)
 check('C module-wide budget carries across definitions','let mut inline_remaining = INLINE_NODE_BUDGET;' in c and 'inline_remaining = em.inline_remaining;' in c)
 check('JS module-wide emitter does not reset expansion budget',j.count('inline_remaining: INLINE_NODE_BUDGET')==1 and 'emitter.inline_remaining =' not in j)
 check('C argument expressions materialized before inline attempt',c.count('values.push(self.bind(ty, &v)?);')==2 and c.count('if let Some(value) = self.inline_call(&f, &values)')==2)
 check('JS argument expressions materialized before inline attempt','values.push(self.bind(&value));' in j and 'self.inline_call(&f, &values)' in j)
 check('C retains binary32 no-contract directive','#pragma STDC FP_CONTRACT OFF' in c)
 check('JS existing numeric helper grouping retained',all(x in j for x in ['Type::U64 => format!("__u64(','Math.imul','Type::F32 => format!']))
 check('legacy exported JS ABI retained','ink-javascript-trusted-values-v2' in j and 'export const functions' in j)
 author=read(bind(args.author_evidence));check('author receipt reports pass',author.get('status') in ('passed','pass','ready'))
 for name,digest in author['artifacts'].items():
  artifact=bind(B/name);check('author artifact '+name,sha(artifact)==digest)
 for name,record in author['production_originals'].items():
  check('author final/original production pin '+name,sha(B/name)==record['after_sha256'] and sha(B/record['original_file'])==record['before_sha256']==before[name])
 for command in author['commands']:
  log=bind(B/command['stdout_stderr']);text=log.read_text();tests=sum(map(int,re.findall(r'test result: ok\. (\d+) passed;',text)))
  comparisons=sum(map(int,re.findall(r'^(\d+) (?:interpreter|reference|legacy|direct/generic|exact typed)',text,re.M)))
  check('author logged tests '+command['backend'],command['exit_code']==0 and tests==command['passed_tests'] and comparisons==command['logged_comparison_frames'] and '318 interpreter/' in text)
 compiler=Path(pins['prior_compiler_path']);bind(compiler);check('old26 compiler pin authenticated',sha(compiler)==pins['prior_compiler_sha256'])
 build=read(bind(R/'compiler-build.json'));bind(build['new_path']);check('new compiler pin and guarded build authenticated',sha(build['new_path'])==build['new_sha256'] and build['old_sha256']==pins['prior_compiler_sha256'] and set(build['changed_guarded_files'])==allowed)
 for p in [B/'AGENTS.md',B/'lowerings/js/AGENTS.md',Path(__file__),R/'backend-independent-review.md']:bind(p)
 # Record existing author evidence recursively; only actual files receive hashes.
 referenced=[]
 def walk(v):
  if isinstance(v,str):
   p=Path(v);p=p if p.is_absolute() else B/p
   if p.is_file():referenced.append(bind(p))
  elif isinstance(v,dict):
   for x in v.values():walk(x)
  elif isinstance(v,list):
   for x in v:walk(x)
 walk(author)
 (R/'backend-independent-review.json').write_text(json.dumps(dict(status='passed' if not errors else 'failed',errors=errors,checks=checks,guard=dict(keys=len(before),changed=sorted(changed),production_changes=sorted(production),test_instrumentation_changes=['lowerings/c/tests/concat.rs'],unchanged=len(before)-len(changed)),bindings=bindings,diff_sha256={n:hashlib.sha256(v.encode()).hexdigest() for n,v in diffs.items()},review=dict(arguments='Existing call-site loops evaluate and materialize every argument once, in source order, before any inline attempt. A failed expansion retains these already evaluated values for the ordinary call.',lexical_scope='Fresh callee environment contains typed parameters only. Let/lambda lexical binding remains handled by existing emitter environment logic.',laziness='Existing choose/short-circuit/at_or/division fallback statement paths enclose helper expansion in the selected runtime branch. Inlining does not hoist statements across these paths.',numeric_order='The same body Expr is passed to existing scalar/list/JS statement emitters. No reassociation or new scalar arithmetic implementation. C no-FP-contract and existing U64/I32/F32 helpers remain.',fallback='2048 body-node eligibility, depth8 defensive call stack and module-wide16384 expanded-node budget. C scalar depth48 and existing source budgets remain. Errors roll back emission and retain normal call.',recursion='Accepted source recursion is rejected by existing core checks. Inline cycle tracking is defensive; no accepted recursive-program equivalence was tested or claimed.',abi='Every definition and metadata entry is retained. Public trusted-value/packed/native boundaries stay in existing emission code.',authority='DB source rewrites are checked separately. Known-call inlining is trusted operational target lowering corroborated by finite author tests, not certified emitted machine code.'),author_evidence_path=str(args.author_evidence.resolve()),author_evidence_sha256=sha(args.author_evidence),test_or_build_jobs_run_by_this_review=0,timing_calls=0,limitations=['Source assertions and finite tests do not prove the backend or host machine semantics.','Inlining eligibility/budget and function declaration order can affect profitability and generated code size.','No guarantee of expert parity or across-platform speed; actual prepared bundles and measurements are separate evidence.']),indent=2)+'\n')
 print(json.dumps(dict(status='passed' if not errors else 'failed',errors=errors,guard_keys=len(before),source_changes=changed,receipt_sha256=sha(R/'backend-independent-review.json'))))
 if errors:raise SystemExit(1)
if __name__=='__main__':main()
