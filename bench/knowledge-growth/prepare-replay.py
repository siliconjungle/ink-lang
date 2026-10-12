"""Seed a fresh historical checkout with frozen inputs, never archived results."""
from common import *
import argparse, shutil, datetime, platform

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--evidence', type=Path, required=True, help='Published report directory')
p.add_argument('--helper', type=Path, required=True, help='Published controlled-folds.ink library')
a = p.parse_args()
if OUT.exists():
    raise SystemExit('Refusing to overwrite an existing report; use a fresh checkout.')
protocol = read(a.evidence/'protocol.json')
for repo, revision in protocol['pins'].items():
    if repo == 'core':
        continue
    directory = ROOT if repo == 'distribution' else ROOT/repo
    actual = subprocess.check_output(['git', '-C', str(directory), 'rev-parse', 'HEAD'], text=True).strip()
    if actual != revision:
        raise SystemExit(f'Historical pin mismatch: {repo}: {actual} != {revision}')
if not INK.is_file() or not a.helper.is_file():
    raise SystemExit('Build the historical compiler and supply the published helper first.')
for rel, digest in read(a.evidence/'execution-files.json').items():
    if sha(ROOT/rel) != digest:
        raise SystemExit(f'Historical execution source mismatch: {rel}')
for key, filename in [('source_manifest_sha256','corpus.json'), ('fixtures_sha256','fixtures.json'), ('upstreams_sha256','upstreams.json')]:
    if sha(a.evidence/filename) != protocol[key]:
        raise SystemExit(f'Frozen input manifest mismatch: {filename}')

OUT.mkdir(parents=True)
for filename in ['execution-files.json','corpus.json','fixtures.json','upstreams.json']:
    shutil.copy2(a.evidence/filename, OUT/filename)
for directory in ['corpus','inputs','upstream/dependencies']:
    shutil.copytree(a.evidence/directory, OUT/directory)
for package in ['lodash','rbush','typescript','gl-matrix','rxjs']:
    archive = a.evidence/'upstream'/package/'source.tgz'
    destination = OUT/'upstream'/package/'source.tgz'
    destination.parent.mkdir(parents=True)
    shutil.copy2(archive, destination)
shutil.copy2(a.helper, ROOT/'knowledge/libraries/controlled-folds.ink')
shutil.copy2(a.evidence/'protocol.json', OUT/'historical-protocol.json')
shutil.copy2(a.evidence/'compiler.json', OUT/'historical-compiler.json')
protocol = dict(protocol)
protocol.update(epoch=protocol['epoch']+'-replay-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ'),
                created_unix=time.time(), parent_protocol_sha256=sha(a.evidence/'protocol.json'),
                environment=dict(platform=platform.platform(), node=subprocess.check_output(['node','--version'],text=True).strip(),
                                 rustc=subprocess.check_output(['rustc','--version'],text=True).strip()))
save(OUT/'protocol.json', protocol)
(OUT/'protocol.sha256').write_text(sha(OUT/'protocol.json')+'\n')
save(OUT/'compiler.json', dict(sha256=sha(INK), build='cargo build --release --locked', pins=protocol['pins']))
save(OUT/'replay-epoch.json', dict(epoch=protocol['epoch'], parent_evidence=str(a.evidence.resolve()),
                                 parent_compiler_sha256=read(a.evidence/'compiler.json')['sha256'], compiler_sha256=sha(INK),
                                 scope='Fresh execution epoch; fixed historical source, programs and inputs. No archived result caches copied.'))
check_frozen()
print(protocol['epoch'])
