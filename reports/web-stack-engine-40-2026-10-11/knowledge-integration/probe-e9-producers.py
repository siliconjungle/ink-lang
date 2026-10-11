"""Untimed isolated e9 scalar producer/checker replay; active checkout untouched."""
import hashlib,json,subprocess,sys,copy
from pathlib import Path
B=Path(__file__).resolve().parents[3];R=Path(__file__).resolve().parent;K=R/'source-snapshot';sys.path[:0]=[str(K),str(K/'producers')]
from scalar_representation import generate
from ink_knowledge.store import read,Store,identity
C=B/'target/debug/ink';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
compiler_hash=sha(C);commands=[]
def run(args):
 p=subprocess.run([str(C),*map(str,args)],capture_output=True,text=True);commands.append(dict(command=[str(C),*map(str,args)],exit_code=p.returncode,stdout=p.stdout,stderr=p.stderr))
 return p
source=R/'scalar-source.ink';source.write_text('module scalar_fixture; query echo(value:u64)->u64{return value;}\n')
model=R/'scalar-model.json';p=run(['emit-action-model',source,'-o',model]);assert p.returncode==0,p.stderr
m=read(model);script=R/'scalar-script.json';script.write_text(json.dumps([dict(call='echo',args=[n])for n in(0,(1<<64)-1,42)]))
baseline=run(['execute',source,script,'--portable']);assert baseline.returncode==0,baseline.stderr
rows=[]
for sort in('Bool','U64'):
 d=R/('scalar-'+sort);d.mkdir();request=generate(m,d/'database',sort);path=d/'request.json';path.write_text(json.dumps(request)+'\n')
 accepted=run(['check-representation',source,path]);assert accepted.returncode==0,accepted.stderr
 result=run(['execute-representation',source,path,script]);assert result.returncode==0,result.stderr
 original=json.loads(baseline.stdout);actual=json.loads(result.stdout)
 # Comparison includes all returned values/events; CLI's wrapper metadata may differ.
 (d/'baseline-output.json').write_text(json.dumps(original)+'\n');(d/'represented-output.json').write_text(json.dumps(actual)+'\n')
 rows.append(dict(sort=sort,request_sha256=sha(path),checker=json.loads(accepted.stdout),baseline=original,represented=actual))
 # Typed request false source hash must be rejected by the ordinary checker.
 wrong=copy.deepcopy(request);wrong['input_core_sha256']='0'*64;negative=d/'wrong-source.json';negative.write_text(json.dumps(wrong)+'\n')
 rejected=run(['check-representation',source,negative]);assert rejected.returncode!=0,'wrong source accepted'
wrong=copy.deepcopy(m);wrong['objects'][wrong['state']]['payload']['declaration']['Datatype']['constructors'][0]['fields']=['U64']
try:generate(wrong,R/'invalid-state-database','Bool')
except ValueError as e:assert 'no source state roots'in str(e)
else:raise AssertionError('source state roots authoring should reject')
if sha(C)!=compiler_hash:raise ValueError('compiler changed during isolated probe')
(R/'probe-commands.json').write_text(json.dumps(commands,indent=2)+'\n')
(R/'producer-probe-receipt.json').write_text(json.dumps(dict(status='passed_isolated_e9_scalar_source_binding',source_commit='a5c853728d0d5e0d6cbfb89adce842e2056e9c7f',compiler_sha256=compiler_hash,producer_sha256=sha(K/'producers/scalar_representation.py'),source_sha256=sha(source),commands_sha256=sha(R/'probe-commands.json'),rows=rows,source_hash_negatives=2,source_state_root_negative=1,scope='Untimed ordinary checker/source execution probes from isolated exact e9 producer source; no active knowledge checkout/catalogue changes or model retuning.'),indent=2)+'\n')
print(json.dumps(dict(status='passed',sorts=2,complete_calls=6,negatives=3)))
