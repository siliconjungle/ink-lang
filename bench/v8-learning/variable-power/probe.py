from pathlib import Path
import cProfile,json,pstats,time
from ink_knowledge import Store,canonical
from ink_knowledge.proposals import generate
from ink_knowledge.proposal_views import ProposalViews
from producers.frozen_laws import index,matching_rows
b=Path('build/v8-variable-power-cases/search-profile');subject=json.loads((b/'subject.json').read_bytes());core=json.loads(Path('build/v8-variable-power-cases/corpus/inputs/44dc64a74456ff85189fc9d8969a5d23ca8b1fdfc43db8a28b18656980a840b3.core.json').read_bytes());print('integer matches',[r['name']for r in matching_rows(subject,index('knowledge/producers/data/v8-integer-laws'))],flush=True)
prof=cProfile.Profile();prof.enable();begin=time.monotonic();objects,receipts=generate(subject,core);prof.disable();print('generate_seconds',time.monotonic()-begin,'objects',len(objects),flush=True);pstats.Stats(prof).sort_stats('cumtime').print_stats(20)
for leaf in [64,2,2,64]:
 begin=time.monotonic();p=b/('store-'+str(leaf)+'-'+str(time.monotonic_ns()));store=Store.publish(p,list(objects.values()),leaf_size=leaf);members=store.members();print('leaf',leaf,'seconds',time.monotonic()-begin,'members',len(members),'bundle_bytes',len(canonical(store.bundle(list(objects)[:1]))),flush=True)
(b/'terminal.json').write_text(json.dumps(dict(schema=1,exit_status=0,objects=len(objects),receipts=receipts)))
