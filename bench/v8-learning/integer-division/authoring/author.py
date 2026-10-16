import sys,json,time,subprocess,tempfile,hashlib
from pathlib import Path
from cases import templates
from producers.bitvector_proofs import certificate
from producers.semantic_laws import law
from producers.frozen_laws import update,read
from ink_knowledge import Store,semantic_entry,identity,canonical
root=Path.cwd();folder=root/'build/v8-signed-division';compiler=root/'target/debug/ink'
source=folder/'source.ink';source.write_text('module integer_laws;\n');core=folder/'core.json'
subprocess.run([compiler,'emit-core',source,'-o',core],check=True)
image=hashlib.sha256(compiler.read_bytes()).hexdigest();rows=templates('--all'in sys.argv);outcomes=[]
existing={r['name']for r in read(folder/'library')}if(folder/'library/index.json').exists()else set()
if '--retry'in sys.argv:rows=[r for r in rows if r['name']not in existing]
else:rows=[r for r in rows if r['name']not in existing]
seconds=20 if '--retry'in sys.argv else 5
total=90 if '--retry'in sys.argv else 12
for row in rows:
    name=row['name'];started=time.monotonic()
    try:
        with tempfile.TemporaryDirectory(prefix='law-',dir=folder)as tmp:
            d=Path(tmp);request=d/'goal.json';request.write_bytes(canonical(row['goal']));problem=d/'problem.json'
            run=subprocess.run([compiler,'semantic-bitvector-obligation',core,request,'--core','--semantics','fixed-scalars-v4','--encoding','shared-v2','-o',problem],capture_output=True,text=True,timeout=30);run.check_returncode()
            cnf=json.loads(problem.read_bytes());cert=certificate(cnf,seconds=seconds,conflicts=100000,total_seconds=total)
            goal=row['goal'];proof=dict(BitVector=dict(semantics='fixed-scalars-v4',hypotheses=[],certificate=cert))
            claim=law(goal['params'],goal['from'],goal['to'],proof)
            obj=semantic_entry(claim);store=Store.publish(d/'knowledge',[obj]);packet=d/'bundle.json';packet.write_bytes(canonical(store.bundle([identity(obj)])))
            checked=subprocess.run([compiler,'knowledge-check',core,packet],capture_output=True,text=True,timeout=30)
            if checked.returncode:raise ValueError(checked.stderr.strip())
            update(folder/'library',[dict(name=name,law=claim)])
            outcome=dict(name=name,status='checked',seconds=round(time.monotonic()-started,3),variables=cnf['variables'],clauses=len(cnf['clauses']),proof_steps=len(cert['steps']))
    except Exception as error:outcome=dict(name=name,status='unadmitted',reason=str(error),seconds=round(time.monotonic()-started,3))
    outcomes.append(outcome);(folder/('retry-authoring.json'if '--retry'in sys.argv else'all-authoring.json')).write_text(json.dumps(dict(schema=1,compiler_sha256=image,requested=len(rows),completed=len(outcomes),rows=outcomes),indent=2)+'\n')
    print(json.dumps(outcome),flush=True)
assert hashlib.sha256(compiler.read_bytes()).hexdigest()==image,'compiler changed during authoring'
