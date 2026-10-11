from pathlib import Path
import sys,json,subprocess,hashlib,collections
ROOT=Path(__file__).resolve().parents[3];sys.path[:0]=[str(ROOT/'bench'),str(ROOT/'knowledge')]
from compact_selection28 import plan
from ink_knowledge import Store
P=Path(__file__).resolve().parent/'padded-indexed-probe';P.mkdir(exist_ok=True)
compiler=ROOT/'reports/web-stack-proofs-32-2026-10-11/main-integration/ink-main-publish';model=ROOT/'reports/web-stack-proofs-32-2026-10-11/cpu-cost-model.json';store=Store(ROOT/'knowledge')
assert store.snapshot_id=='6df4df9aae82d58eba9eac5e8d36b41ce37147ed5d661285903745f4c136d9e3' and len(store.members())==2534,'current full canonical prior changed'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(compiler)=='04f42856696cbc9a4d5b0523e4a2c5d9d84ae28e0e039f0fd9c305fe2d0a5536'
helpers='\nfn left_word(i:u32,x:u32,seed:u32,k:u32)->u32{return choose(i<seed,x+k,x-seed);}\nfn right_word(i:u32,x:u32,seed:u32,k:u32)->u32{return choose(rem_or(i,3,0)==0,x*k,x+seed);}\nfn combine_words(a:u32,b:u32,seed:u32,k:u32)->u32{return choose(a<b,a+b*k,a-b+seed);}'
left='xs.map_indexed(fn(i)=>fn(x)=>left_word(i,x,seed,k))';right='xs.map_indexed(fn(i)=>fn(x)=>right_word(i,x,seed,k))';callback='fn(a)=>fn(b)=>combine_words(a,b,seed,k)'
commands=[];rows={}
def run(argv):
 r=subprocess.run(list(map(str,argv)),capture_output=True,text=True,cwd=ROOT);commands.append(dict(argv=list(map(str,argv)),exit_code=r.returncode,stdout=r.stdout,stderr=r.stderr));(P/'commands.json').write_text(json.dumps(commands,indent=2)+'\n');assert r.returncode==0,r.stderr
for side in ['right','left']:
 name='pipeline38_'+side+'_padding_probe_u32';body=left+'.zip('+right+'.concat(ys),'+callback+')'if side=='right'else left+'.concat(ys).zip('+right+','+callback+')';td=P/name;td.mkdir(exist_ok=True);source=td/'source.ink';source.write_text('module ProofRecipe;\npub fn '+name+'(xs:List<u32>,ys:List<u32>,seed:u32,k:u32)->List<u32>{return '+body+';}'+helpers+'\n');core=td/'literal.core.json';run([compiler,'emit-core',source,'-o',core]);selection=td/'prior.selection.json';receipt=plan(compiler,core,store,model,selection,budget=4096);selected=td/'prior.core.json';run([compiler,'emit-core',core,'--core','--selection',selection,'-o',selected]);routes={}
 for version in ['literal','prior']:
  bundle=td/version;run([compiler,'build',td/(version+'.core.json'),'--core','--target','webgpu','--zig',ROOT.parent/'toolchain/zig-aarch64-macos-0.15.2/zig','-o',bundle]);m=json.loads((bundle/'manifest.json').read_text());fn=next(f for f in m['functions']if f['name']==name);routes[version]=dict(shader=fn['shader'],graph_required=fn['graph_required'],eligible=bool(fn['shader']or fn['graph_required']),fallback_reason=fn['fallback_reason'],lengths=fn['lengths'],graph_ops=[n['op']for n in(fn.get('graph')or{}).get('nodes',[])],c_bytes=(bundle/'cpu.c').stat().st_size,js_bytes=(bundle/'program.mjs').stat().st_size)
 rows[name]=dict(side=side,source_sha256=sha(source),selection_sha256=sha(selection),receipt_sha256=sha(selection.with_suffix('.receipt.json')),initial_cost=receipt['search']['initial_cost'],selected_cost=receipt['search']['selected_cost'],selected_roots=receipt['selected_roots'],changed=json.loads(core.read_text())['program']['functions'][0]['body']!=json.loads(selected.read_text())['program']['functions'][0]['body'],exhausted=receipt['search'].get('exhausted'),routes=routes)
 (P/'summary.json').write_text(json.dumps(dict(status='running',timed=False,prior_snapshot=store.snapshot_id,prior_members=len(store.members()),compiler_sha256=sha(compiler),model_sha256=sha(model),rows=rows),indent=2)+'\n');print(name,rows[name]['changed'],rows[name]['initial_cost'],rows[name]['selected_cost'],routes,flush=True)
r=json.loads((P/'summary.json').read_text());r['status']='passed';(P/'summary.json').write_text(json.dumps(r,indent=2)+'\n')
