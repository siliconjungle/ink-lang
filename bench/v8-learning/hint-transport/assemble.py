from pathlib import Path
import json,gzip,shutil
from ink_knowledge import canonical,identity
from producers.conditional_cover import boolean_cover
root=Path.cwd();source=root/'bench/v8-learning/rup-compaction';folder=root/'build/v8-proof-transport';index=json.loads((source/'conditional-cases/index.json').read_text());laws=[]
for row in index['rows']:
 law=json.loads(gzip.decompress((source/'conditional-cases'/(row['sha256']+'.json.gz')).read_bytes()));assert identity(law)==row['sha256'];laws.append(law)
plain=boolean_cover(laws);packed=boolean_cover(laws,pack_hints=True)
(folder/'plain.law.json').write_bytes(canonical(plain));(folder/'packed.law.json').write_bytes(canonical(packed));shutil.copyfile(source/'core.json',folder/'core.json')
(folder/'assembly.json').write_text(json.dumps(dict(schema=1,source_identities=[r['sha256']for r in index['rows']],plain_bytes=len(canonical(plain)),packed_bytes=len(canonical(packed)),plain_identity=identity(plain),packed_identity=identity(packed),scope='Untrusted lossless transport and exhaustive Boolean cover proposal; complete ordinary shared-budget admission not yet established.'),indent=2)+'\n')
print((folder/'assembly.json').read_text())
