#!/usr/bin/env python3
"""Independent static generated-code audit. No build/workload/timing invocation."""
from pathlib import Path
import hashlib,json,re
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
LANES=('baseline','prior','checked','gpu-prior','gpu-checked')
def read(p):return json.loads(Path(p).read_text())
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def block(text,start):
    opening=text.index('{',start);depth=0
    for i in range(opening,len(text)):
        if text[i]=='{':depth+=1
        elif text[i]=='}':
            depth-=1
            if not depth:return text[opening+1:i]
    raise ValueError('unclosed generated function')
def main():
    meta=read(HERE/'metadata.json');spec=read(HERE/'spec.json');names=[t['name'] for t in spec['tasks']]
    assert len(names)==len(set(names))==8
    bindings={};records=[];selections=[]
    def bind(p):
        key=str(p.relative_to(HERE));value=sha(p);assert meta['artifact_hashes'][key]==value,key;bindings[key]=value
    for name in names:
        for lane in LANES:
            folder=HERE/lane/name;js=folder/'program.mjs';c=folder/'cpu.c';manifest=folder/'manifest.json'
            for p in [js,c,manifest,folder/'plan.json']:bind(p)
            jt,ct=js.read_text(),c.read_text();jb=block(jt,jt.index('function __fn0('));match=re.search(r'lang_fn_'+re.escape(name)+r'\([^;]*?\)\s*\{',ct);assert match;cb=block(ct,match.start())
            calls={};helpers={}
            for helper in ['__map','__zip','__filter','__foldr','__concat','__repeat']:
                count=len(re.findall(r'\b'+helper+r'\(',jb));calls[helper]=count
                if count:
                    m=re.search(r'function '+helper+r'\s*\(',jt);assert m,(name,lane,helper)
                    body=block(jt,m.start());helpers[helper]=dict(calls=count,allocation_sites=body.count('new Array('),for_sites=len(re.findall(r'\bfor\s*\(',body)),body_sha256=hashlib.sha256(body.encode()).hexdigest())
            jalloc=jb.count('new Array(')+sum(v['calls']*v['allocation_sites'] for v in helpers.values());jloops=len(re.findall(r'\bfor\s*\(',jb))+sum(v['calls']*v['for_sites'] for v in helpers.values())
            bridge=ct[ct.index('void ink_compute_call('):] if 'void ink_compute_call(' in ct else ct[ct.index('uint64_t ink_cpu_call('):]
            assert not re.search(r'Number\.is|typeof|throw|fuel|budget',jb),(name,lane,'input guard')
            assert not re.search(r'(a[01]\.data|lang_a[01]_data)\[[^]]+\]\s*=',cb),(name,lane,'caller mutation')
            man=read(manifest);fn=man['functions'][0];assert man['javascript']['abi']=='ink-javascript-trusted-values-v2';assert man['cpu_c_sha256']==sha(c)
            eligible=bool(fn.get('shader') or fn.get('gpu'));active={fn.get('shader')};active.update(s['shader'] for s in (fn.get('gpu') or {}).get('stages',[]))
            if fn.get('gpu'):active.add('sum.wgsl')
            shaders=[]
            for file,digest in man['shaders'].items():
                p=folder/file;bind(p);assert sha(p)==digest;text=p.read_text();shaders.append(dict(file=file,sha256=digest,active=file in active,for_sites=len(re.findall(r'\bfor\s*\(',text)),invocation_bounds_present=bool(re.search(r'gid\.x(?:<|>=)|i>=ink_meta',text))))
            records.append(dict(function=name,lane=lane,manifest_schema=man['schema'],javascript=dict(calls=calls,helpers=helpers,collection_allocation_sites=jalloc,for_sites=jloops,local_const_bindings=len(re.findall(r'const v\d+\s*=',jb)),iife_sites=jb.count('(()=>'),body=jb),c=dict(collection_allocation_sites=cb.count('ink_alloc(')+cb.count('lang_allocate('),for_sites=len(re.findall(r'\bfor\s*\(',cb)),while_sites=len(re.findall(r'\bwhile\s*\(',cb)),copy_calls=cb.count('ink_copy('),scalar_bridge_allocations=bridge.count('ink_alloc('),body=cb),gpu=dict(eligible=eligible,descriptor=fn.get('gpu'),shader=fn.get('shader'),fallback_reason=fn.get('fallback_reason',fn.get('cpu_reason')),shaders=shaders)))
        for lane in LANES[1:]:
            p=HERE/'tasks'/name/(lane+'-selection.json');bind(p);selected=read(p);knowledge=selected['knowledge'];ids=set(knowledge['objects']);roots=set(knowledge['roots']);assert roots<=ids
            for oid,obj in knowledge['objects'].items():
                assert hashlib.sha256(json.dumps(obj,sort_keys=True,separators=(',',':')).encode()).hexdigest()==oid
                assert set(obj.get('dependencies',[]))<=ids
            laws={a['law'] for a in selected['applications']};assert laws<=roots
            fresh=set(meta['new_laws_per_function'][name]);assert fresh<=laws if 'checked' in lane else not fresh&laws
            plan=read(HERE/lane/name/'plan.json');assert set(plan['semantic_selection']['applied_laws'])==laws;assert plan['semantic_package']['applications']==selected['applications'];assert plan['selected_core_sha256']==read(HERE/lane/name/'manifest.json')['core_sha256']
            selections.append(dict(function=name,lane=lane,laws=sorted(laws),applications=len(selected['applications']),roots=sorted(roots),closure=sorted(ids),fresh=sorted(fresh&laws)))
    guard=read(HERE/'source-boundary-before.json');assert len(guard)==102
    for path,digest in guard.items():assert sha(ROOT/path)==digest,path
    for file in ['expert.mjs','expert.rs','literal.mjs','literal.rs']:bind(HERE/file)
    findings=[]
    for name in names:
        before=next(r for r in records if r['function']==name and r['lane']=='prior');after=next(r for r in records if r['function']==name and r['lane']=='checked')
        findings.append(dict(function=name,prior_js_helpers=before['javascript']['calls'],current_js_helpers=after['javascript']['calls'],prior_c_allocations=before['c']['collection_allocation_sites'],current_c_allocations=after['c']['collection_allocation_sites'],cpu_policy_current_gpu_eligible=after['gpu']['eligible']))
        if name.startswith('paired_'):
            assert before['javascript']['calls']['__map']==2 and before['javascript']['calls']['__zip']==1
            assert after['javascript']['calls']['__map']==1 and after['javascript']['calls']['__zip']==0
            assert after['c']['collection_allocation_sites']==1 and after['c']['for_sites']==1
    totals={lane:dict(js_allocations=sum(r['javascript']['collection_allocation_sites'] for r in records if r['lane']==lane),js_for_sites=sum(r['javascript']['for_sites'] for r in records if r['lane']==lane),c_allocations=sum(r['c']['collection_allocation_sites'] for r in records if r['lane']==lane),c_for_sites=sum(r['c']['for_sites'] for r in records if r['lane']==lane),scalar_bridge_allocations=sum(r['c']['scalar_bridge_allocations'] for r in records if r['lane']==lane),gpu_eligible=sum(r['gpu']['eligible'] for r in records if r['lane']==lane)) for lane in LANES}
    notes=['The four generic mapped-zip roots accept arbitrary pure total callbacks. Concrete workload deployment uses checked sharing certificates; those source instances are not additional general mathematical laws.','Paired vector targets retain one full-length result allocation/traversal while eliminating two mapped intermediates and zip. C and JS expose scalar local bindings for reused mapper values; IIFEs are still generated JS machinery.','Prior/current policy branches and ABI eligibility are recorded individually. A fallback-to-GPU transition is not a GPU-to-GPU speedup; shipped unused WGSL files alone are not eligibility.','Generated direct functions contain no numeric input validators or fuel/cell budgets. Allocation/address overflow and invocation bounds are necessary resource/execution checks.','Expert JS/Rust controls already implement the algebra in one pass. Static source counts do not measure allocation bytes, vectorization, assembly or profitability; no universal language ranking follows.']
    result=dict(status='passed',metadata_sha256=sha(HERE/'metadata.json'),source_guard=dict(keys=102,changed=[]),bindings=bindings,records=records,selections=selections,totals=totals,findings=findings,notes=notes,scope='Read-only static code and checked package binding audit; no compile/test/workload/timing jobs.')
    (HERE/'code-shape-review.json').write_text(json.dumps(result,indent=2)+'\n')
    lines=['# Round19 generated-code review','',f'Passed:8 cases ×5 lanes,32 checked packages,{len(bindings)} artifact bindings and102 unchanged source hashes.','']+['- '+n for n in notes]+['','| Lane | JS alloc | JS loops | C alloc | C loops | Scalar bridge alloc | Eligible GPU |','|---|---:|---:|---:|---:|---:|---:|']
    for lane,t in totals.items():lines.append(f'| {lane} | {t["js_allocations"]} | {t["js_for_sites"]} | {t["c_allocations"]} | {t["c_for_sites"]} | {t["scalar_bridge_allocations"]} | {t["gpu_eligible"]} |')
    lines+=['',f'Metadata SHA256 `{result["metadata_sha256"]}`.'];(HERE/'code-shape-review.md').write_text('\n'.join(lines)+'\n')
    print(json.dumps(dict(status='passed',json_sha256=sha(HERE/'code-shape-review.json'),md_sha256=sha(HERE/'code-shape-review.md'),bindings=len(bindings),totals=totals)))
if __name__=='__main__':main()
