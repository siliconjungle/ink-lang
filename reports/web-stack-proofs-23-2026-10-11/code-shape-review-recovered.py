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
    assert len(names)==len(set(names)) and set(names)==set(meta['tasks'])
    tasks={t['name']:t for t in spec['tasks']}
    bindings={Path(__file__).name:sha(Path(__file__))};records=[];selections=[]
    dispatch_path=ROOT/'lowerings/gpu/devices/scalar.mjs';dispatch_text=dispatch_path.read_text()
    assert "if(f.gpu.aggregate==='count')" in dispatch_text and "dispatch('count.wgsl'" in dispatch_text and "dispatch('sum.wgsl'" in dispatch_text
    recovery=dict(original_helper_sha256=sha(HERE/'code-shape-review.py'),recovered_helper_sha256=sha(Path(__file__)),original_json_sha256=sha(HERE/'code-shape-review.before-recovery.json'),original_md_sha256=sha(HERE/'code-shape-review.before-recovery.md'),dispatch_source=str(dispatch_path.relative_to(ROOT)),dispatch_source_sha256=sha(dispatch_path),scope='Audit annotation only: count descriptors activate count.wgsl; all target/control/selection bytes unchanged.')
    def bind(p):
        key=str(p.relative_to(HERE));value=sha(p);assert meta['artifact_hashes'][key]==value,key;bindings[key]=value
    for name in names:
        for lane in LANES:
            folder=HERE/lane/name;js=folder/'program.mjs';c=folder/'cpu.c';manifest=folder/'manifest.json'
            for p in [js,c,manifest,folder/'plan.json']:bind(p)
            jt,ct=js.read_text(),c.read_text();jb=block(jt,jt.index('function __fn0('));match=re.search(r'lang_fn_'+re.escape(name)+r'\([^;]*?\)\s*\{',ct);assert match;cb=block(ct,match.start())
            calls={};helpers={}
            for helper in ['__map','__map_indexed','__zip','__filter','__foldr','__concat','__repeat','__sum','__scan','__count','__at_or']:
                count=len(re.findall(r'\b'+helper+r'\(',jb));calls[helper]=count
                if count:
                    m=re.search(r'function '+helper+r'\s*\(',jt);assert m,(name,lane,helper)
                    body=block(jt,m.start());helpers[helper]=dict(calls=count,allocation_sites=body.count('new Array(')+len(re.findall(r'=\s*\[\]',body)),for_sites=len(re.findall(r'\bfor\s*\(',body)),body_sha256=hashlib.sha256(body.encode()).hexdigest())
            jalloc=jb.count('new Array(')+len(re.findall(r'=\s*\[\]',jb))+sum(v['calls']*v['allocation_sites'] for v in helpers.values());jloops=len(re.findall(r'\bfor\s*\(',jb))+sum(v['calls']*v['for_sites'] for v in helpers.values())
            bridge=ct[ct.index('void ink_compute_call('):] if 'void ink_compute_call(' in ct else ct[ct.index('uint64_t ink_cpu_call('):]
            assert not re.search(r'Number\.is|typeof|throw|fuel|budget',jb),(name,lane,'input guard')
            assert not re.search(r'(a[01]\.data|lang_a[01]_data)\[[^]]+\]\s*=',cb),(name,lane,'caller mutation')
            man=read(manifest);fn=man['functions'][0];assert man['javascript']['abi']=='ink-javascript-trusted-values-v2';assert man['cpu_c_sha256']==sha(c)
            eligible=bool(fn.get('shader') or fn.get('gpu'));active={fn.get('shader')};active.update(s['shader'] for s in (fn.get('gpu') or {}).get('stages',[]))
            if fn.get('gpu'):
                aggregate=fn['gpu']['aggregate'];assert aggregate in ('count','sum')
                active.add('count.wgsl' if aggregate=='count' else 'sum.wgsl')
                # Authenticate the actual frozen host dispatch source, including
                # instrumentation's original copy, rather than infer the shader.
                original_device=folder/'ink-device.original.mjs';device=folder/'ink-device.mjs'
                for p in [original_device,device]:bind(p)
                dt=original_device.read_text();assert dt==dispatch_text
                assert "if(f.gpu.aggregate==='count')" in dt and "dispatch('count.wgsl'" in dt and "dispatch('sum.wgsl'" in dt
                assert ('count.wgsl' if aggregate=='count' else 'sum.wgsl') in man['shaders']
            shaders=[]
            for file,digest in man['shaders'].items():
                p=folder/file;bind(p);assert sha(p)==digest;text=p.read_text();shaders.append(dict(file=file,sha256=digest,active=file in active,for_sites=len(re.findall(r'\bfor\s*\(',text)),invocation_bounds_present=bool(re.search(r'gid\.x(?:<|>=)|i>=ink_meta',text))))
            records.append(dict(function=name,lane=lane,manifest_schema=man['schema'],javascript=dict(calls=calls,helpers=helpers,collection_allocation_sites=jalloc,for_sites=jloops,local_const_bindings=len(re.findall(r'const v\d+\s*=',jb)),iife_sites=jb.count('(()=>'),body=jb),c=dict(collection_allocation_sites=cb.count('ink_alloc(')+cb.count('lang_allocate('),for_sites=len(re.findall(r'\bfor\s*\(',cb)),while_sites=len(re.findall(r'\bwhile\s*\(',cb)),copy_calls=cb.count('ink_copy('),scalar_bridge_allocations=bridge.count('ink_alloc('),body=cb),gpu=dict(eligible=eligible,descriptor=fn.get('gpu'),shader=fn.get('shader'),fallback_reason=fn.get('fallback_reason',fn.get('cpu_reason')),shaders=shaders)))
        for lane in LANES[1:]:
            p=HERE/'tasks'/name/(lane+'-selection.json');bind(p);selected=read(p);knowledge=selected['knowledge'];ids=set(knowledge['objects']);roots=set(knowledge['roots']);assert roots<=ids
            for oid,obj in knowledge['objects'].items():
                assert hashlib.sha256(json.dumps(obj,sort_keys=True,separators=(',',':')).encode()).hexdigest()==oid
                assert set(obj.get('dependencies',[]))<=ids
            reachable=set()
            def visit(oid):
                if oid in reachable:return
                reachable.add(oid)
                for dependency in knowledge['objects'][oid].get('dependencies',[]):visit(dependency)
            for oid in roots:visit(oid)
            assert reachable==ids,(name,lane,'minimal exact transitive closure')
            laws={a['law'] for a in selected['applications']};assert laws<=roots
            fresh=set(meta['new_laws_per_function'][name]);gpu_reference=False
            expected_laws=set(meta['tasks'][name]['gpu_selections'][lane.replace('gpu-','')]['laws']) if lane.startswith('gpu-') else set(meta['tasks'][name]['selections'][lane]['laws'])
            assert laws==expected_laws,(name,lane,'exact metadata law applications')
            if lane=='checked' and tasks[name]['fresh_proof_required']:assert fresh and fresh<=laws
            if lane=='prior':assert not fresh&laws
            plan=read(HERE/lane/name/'plan.json');assert set(plan['semantic_selection']['applied_laws'])==laws;assert plan['semantic_package']['applications']==selected['applications'];assert plan['selected_core_sha256']==read(HERE/lane/name/'manifest.json')['core_sha256']
            selections.append(dict(function=name,lane=lane,laws=sorted(laws),applications=len(selected['applications']),roots=sorted(roots),closure=sorted(ids),fresh=sorted(fresh&laws),unchanged_gpu_reference=gpu_reference))
    guard=read(HERE/'source-boundary-before.json');assert len(guard)==102
    for path,digest in guard.items():assert sha(ROOT/path)==digest,path
    for file in ['expert.mjs','expert.rs','literal.mjs','literal.rs']:bind(HERE/file)
    findings=[]
    for name in names:
        before=next(r for r in records if r['function']==name and r['lane']=='prior');after=next(r for r in records if r['function']==name and r['lane']=='checked')
        findings.append(dict(function=name,prior_js_helpers=before['javascript']['calls'],current_js_helpers=after['javascript']['calls'],prior_c_allocations=before['c']['collection_allocation_sites'],current_c_allocations=after['c']['collection_allocation_sites'],cpu_policy_current_gpu_eligible=after['gpu']['eligible']))
        # Generic work/representation counts are reported, not used as profitability claims.
        assert after['c']['collection_allocation_sites'] <= before['c']['collection_allocation_sites'],(name,'no additional selected collection allocation')
        if tasks[name]['output_kind']=='list_u32' and tasks[name]['fresh_proof_required']:
            assert after['c']['collection_allocation_sites']==1 and after['c']['for_sites']==1,(name,'direct mapped result')
        elif tasks[name]['output_kind']!='list_u32':
            assert after['c']['collection_allocation_sites']==0,(name,'scalar intermediate arrays removed')
    totals={lane:dict(js_allocations=sum(r['javascript']['collection_allocation_sites'] for r in records if r['lane']==lane),js_for_sites=sum(r['javascript']['for_sites'] for r in records if r['lane']==lane),c_allocations=sum(r['c']['collection_allocation_sites'] for r in records if r['lane']==lane),c_for_sites=sum(r['c']['for_sites'] for r in records if r['lane']==lane),scalar_bridge_allocations=sum(r['c']['scalar_bridge_allocations'] for r in records if r['lane']==lane),gpu_eligible=sum(r['gpu']['eligible'] for r in records if r['lane']==lane)) for lane in LANES}
    notes=['Recovery corrects only active aggregate shader annotation: count.wgsl for count, sum.wgsl for sum; original helper and receipts preserved. Current audit source and actual frozen scalar dispatch sources are bound.',
        'Complementary cardinality can remove arbitrary pure predicate evaluation; count wraps U64. First-match folds remove arrays while retaining a full traversal, unlike early-exit experts.',
        'Unused prefix-state consumers reduce to direct maps or first input lookup for supported integer scan semantics. General initial-state induction supports are counted separately.',
        'Every old/current source role and actual shader/fallback manifest is archived. Missing GPU records are not slower GPU samples.',
        'Static allocation and loop sites are not dynamic allocated bytes or assembly instructions. No runtime caller checks or proof optimizer was added.',
        'Full declared captures, outputs and GPU transfers are timed; borrowed JS/native resident are separate. Strong experts already erase irrelevant work and may reuse vector scratch.']
    result=dict(status='passed',recovery=recovery,metadata_sha256=sha(HERE/'metadata.json'),source_guard=dict(keys=102,changed=[]),bindings=bindings,records=records,selections=selections,totals=totals,findings=findings,notes=notes,scope='Read-only static code and checked package binding audit; no compile/test/workload/timing jobs.')
    (HERE/'code-shape-review.json').write_text(json.dumps(result,indent=2)+'\n')
    lines=['# Round23 generated-code review','',f'Passed:{len(names)} cases ×{len(LANES)} lanes,{len(selections)} checked packages,{len(bindings)} artifact bindings and102 unchanged source hashes.','']+['- '+n for n in notes]+['','| Lane | JS alloc | JS loops | C alloc | C loops | Scalar bridge alloc | Eligible GPU |','|---|---:|---:|---:|---:|---:|---:|']
    for lane,t in totals.items():lines.append(f'| {lane} | {t["js_allocations"]} | {t["js_for_sites"]} | {t["c_allocations"]} | {t["c_for_sites"]} | {t["scalar_bridge_allocations"]} | {t["gpu_eligible"]} |')
    lines+=['',f'Metadata SHA256 `{result["metadata_sha256"]}`.'];(HERE/'code-shape-review.md').write_text('\n'.join(lines)+'\n')
    print(json.dumps(dict(status='passed',json_sha256=sha(HERE/'code-shape-review.json'),md_sha256=sha(HERE/'code-shape-review.md'),bindings=len(bindings),totals=totals)))
if __name__=='__main__':main()
