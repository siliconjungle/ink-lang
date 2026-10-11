"""Read-only before-timing source/ABI/parity review; never compiles or benchmarks."""
import hashlib,json,sys,re
from pathlib import Path
R=Path(__file__).resolve().parent;B=R.parents[1];A=B/'bench/web-stack-proofs-19'
sys.path.insert(0,str(A))
from spec import TASKS,source,public_spec
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
def normalized(s):return re.sub(r'\s+','',s)
def main():
    files=['spec.py','spec.json','kernels.ink','generate.py','literal.mjs','expert.mjs','literal.rs','expert.rs','fixtures.py','runner.mjs','preflight.py','preflight-receipt.json','instrument.py']
    receipt=json.loads((A/'preflight-receipt.json').read_text());assert receipt['status']=='passed'
    for name,digest in receipt['bindings'].items():assert sha(A/name)==digest,name
    assert (receipt['tasks'],receipt['inputs'],receipt['cells'],receipt['js']['comparisons'])==(8,104,48,208)
    assert json.loads((A/'spec.json').read_text())==public_spec()
    assert len(TASKS)==8 and all(t['list_inputs']==1 for t in TASKS)
    author=[B/'knowledge/research/web-stack-proofs-19/predicate/examples.ink',B/'knowledge/research/web-stack-proofs-19/predicate/alternate.ink',B/'knowledge/research/web-stack-proofs-19/algebra/recipes.ink']
    allauthor=normalized(''.join(p.read_text() for p in author))
    for t in TASKS:assert normalized(source(t)) in allauthor,t['name']
    for cohort in ['discovery','heldout']:
        for p in receipt['profiles']:
            if p['case'].startswith('paired_'):assert min(p['mapper_true'],p['mapper_false'],p['combiner_true'],p['combiner_false'])>0
            else:assert min(p['predicate_true'],p['predicate_false'])>0
    for name in ['cpu-cost-model.json','gpu-cost-model.json']:
        assert (R/name).read_bytes()==(B/'reports/web-stack-proofs-18-2026-10-11'/name).read_bytes(),name
    native=(B/'bench/web-stack-native-19.py').read_text();web=(B/'bench/web-stack-proofs-19.py').read_text()
    assert "allow_zero=True,phase=\"calibration_trials\"" in native and "journal does not bind every calibration/warmup/sample call" in native
    assert "if schema==1:" in web and "schema1 GPU transfer evidence keys" in web and "schema2 GPU live buffer evidence" in web
    static=B/'knowledge/research/web-stack-proofs-19/static-derivation/witnesses.json'
    parity=dict(status='pending',scope='Admission/filtering currently incomplete; this receipt makes no admitted-parity or fresh-effect claim yet.')
    if static.exists():
        w=json.loads(static.read_text());prep=json.loads((R/'input-preparation/preparation.json').read_text())
        assert w['status']=='checked' and w['historical_snapshot']==prep['historical_snapshot'] and w['effective_prior_snapshot']==prep['effective_prior_snapshot']
        sys.path.insert(0,str(B/'knowledge'))
        from ink_knowledge import Store,identity,semantic_entry
        old=Store(prep['prior_overlay']);old_ids={identity(semantic_entry(q['law'])) for q in w['shared_old']};new_ids={identity(semantic_entry(q['law'])) for q in w['new_composed']}
        assert old_ids==set(prep['shared_old_witness_ids']) and new_ids==set(prep['new_composed_witness_ids']) and not old_ids&new_ids
        assert old_ids<=set(old.members()) and not new_ids&set(old.members())
        historical=Store(B/'knowledge',B/f'knowledge/store/snapshots/{prep["historical_snapshot"]}.json')
        assert set(old.members())==set(historical.members())|old_ids
        semantic_count=0
        for i in historical.members():
            payload=historical.object(i)['payload']
            semantic_count+=bool(all(k in payload for k in ['params','from','to','proof']) and isinstance(payload['from'],dict) and 'node' in payload['from'])
        assert semantic_count==739
        assert all(set(q['law']['dependencies'])<=set(historical.members()) for q in w['shared_old'])
        admission=static.parent/'admission.json';assert sha(admission)==w['admission_sha256']
        a=json.loads(admission.read_text());assert a['exit_code']==0
        checks=a['individual_checks'];good={r['content_id'] for r in checks if r['exit_code']==0};bad={r['content_id'] for r in checks if r['exit_code']!=0}
        assert len(checks)==49 and len(old_ids)==24 and len(new_ids)==8 and a['old_candidate_count']==28 and a['old_rejected']==4
        assert {r['content_id'] for r in checks if r['role']=='shared_old' and not r['exit_code']}==old_ids
        assert {r['content_id'] for r in checks if r['role']=='new_composed' and not r['exit_code']}==new_ids
        assert all(r['role']=='shared_old' and r['stderr']=='error: semantic normal forms differ\n' for r in checks if r['exit_code'])
        finalview=json.loads((static.parent/'view.json').read_text());assert set(json.loads(a['stdout'])['entries'])==set(finalview['objects'])
        assert not bad&set(finalview['objects'])
        parity=dict(status='accepted-old-overlay-bound',old_semantic_laws_scanned=semantic_count,old_candidates=28,old_admitted=24,old_rejected=4,generic_admitted=13,new_static_admitted=8,shared_old_ids=sorted(old_ids),new_only_ids=sorted(new_ids),effective_prior_snapshot=old.snapshot_id,admission_sha256=sha(admission),witnesses_sha256=sha(static),scope='Every accepted old candidate is in prior overlay; each has historical-only dependencies and is shared symmetrically. Failed unproved-condition candidates stay archived and excluded from admitted closure. Current publication inclusion and selected fresh effects require final metadata audit.')
    bindings={str(p.relative_to(B)):sha(p) for p in [*[A/n for n in files],*author,B/'bench/web-stack-proofs-19.py',B/'bench/web-stack-native-19.py',B/'bench/web-stack-browser-batches19.py',R/'derive-static.py',R/'cpu-cost-model.json',R/'gpu-cost-model.json',Path(__file__)]}
    result=dict(status='source-ABI-control-review-passes',tasks=8,frames=104,timed_cells=48,source_functions_match_authors=True,complete_control_comparisons=208,bindings=bindings,static_parity=parity,
      conclusions=['Literal JS and Rust preserve both eager complementary filter/map/sum pipelines; paired controls materialize both mapped arrays then ordered zip.',
       'Expert recombine skips predicate; expert contrast/weighted use one traversal with two accumulators, applying weights only after reduction. Vector expert evaluates each mapper once and reuses final output scratch.',
       'All tasks use declared xs-only ABI. Full JS and Wasm controls copy only xs, Wasm copies outputs; borrowed JS is separate. Native resident and snapshot modes consume/reset outputs equally.',
       'Every arithmetic primitive wraps modulo2^32; independent oracle expands unbounded modular contributions, separate literal AST applies source stages. No F32 measured arithmetic claim.',
       'Presets9rounds2warmups15ms, exact donor arrays; paired scalar factor seed//2 independently presets both raw/mapped gates. Partition predicate outcomes are balanced, while full-width alternate mapper x<k can be alltrue and is not advertised as balanced.',
       'No compound-predicate external corpus, expert WGSL, LLVM-version isolation, or broad language ranking is established.',
       'Both cost models equal archived18 bytes. Offline sharing certificates are untrusted and kernel-checked; unsatisfied old conditional candidates must be rejected and retained as failures. Same admitted old opportunities enter both catalogues; freshness excludes shared support.',
       'GPU actual transfers/fallbacks must be audited against schema1 exact3 keys or schema2 exact4 keys. Native zero duration is allowed only during adaptive calibration; every trial is journaled and positive warmup/measured phases remain required.'],
      pending=['Final accepted static-certificate union, compact selection replay and current-minus-effective-prior fresh effects.','Compiled controls/Ink ABI exact validation and frozen target/GPU metadata.','All timing results and independent paired interval/counter audits.'])
    (R/'protocol-preflight-review.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(dict(status=result['status'],parity=parity['status'],bindings=len(bindings))))
if __name__=='__main__':main()
