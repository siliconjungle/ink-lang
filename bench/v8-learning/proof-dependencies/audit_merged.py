"""Integrity audit for the distinct merged compiler conformance/corpus cohort."""
from pathlib import Path
import argparse,gzip,hashlib,json,re,subprocess,tarfile
here=Path(__file__).resolve().parent
parser=argparse.ArgumentParser();parser.add_argument('--device-only',action='store_true');args=parser.parse_args()
def sha(raw):return hashlib.sha256(raw).hexdigest()
x=json.loads((here/'merged-emission.json').read_bytes());assert x['terminal']['exit_status']==0 and x['terminal']['actual_device_calls']==8
assert len(x['report']['results'])==8 and x['terminal']['exact_original_oracles']
assert sha((here/'merged-emission-inputs.tar.gz').read_bytes())==x['archive_sha256']
assert sha((here/'selected-inputs.tar.gz').read_bytes())==x['source_archive_sha256']
with tarfile.open(here/'selected-inputs.tar.gz')as baseline,tarfile.open(here/'merged-emission-inputs.tar.gz')as current:
    members=current.getmembers();names={m.name for m in members}
    assert len(names)==len(members) and names==set(x['files'])-set(x['external_inputs'])
    for m in members:assert m.isfile()and'..'not in Path(m.name).parts and not Path(m.name).is_absolute()
    for name,digest in x['files'].items():
        source=baseline if name in x['external_inputs']else current
        member=x['external_inputs'].get(name,name)
        assert sha(source.extractfile(member).read())==digest,name
pins=json.loads((here/'merged-source-pins.json').read_bytes());assert pins['compiler_sha256']==x['terminal']['compiler_sha256'] and pins['core_tree']==x['terminal']['core_tree']
assert pins['pins']==x['terminal']['pins'] and pins['upstream_source_bytes_match'] and pins['upstream_private_core_tests']==480
root=here.parents[2]
assert subprocess.check_output(['git','-C',str(root),'rev-parse',pins['distribution_source']+':core'],text=True).strip()==pins['core_package']['core_tree']==pins['core_tree']
if args.device_only:
    print('PASS exact merged source/package bindings, original independent oracles, eight actual GPU calls and deduplicated emitted inputs')
    raise SystemExit(0)
log=gzip.decompress((here/'merged-knowledge-tests.log.gz').read_bytes());terminal=json.loads((here/'merged-validation-terminal.json').read_bytes())
assert b'\nOK\n'in log and b'FAILED'not in log and re.search(rb'Ran 28 tests in [0-9.]+s',log)
assert terminal['exit_status']==0 and terminal['tests']==28 and terminal['compiler_sha256']==pins['compiler_sha256'] and terminal['log_sha256']==sha(log)
corpus=here.parent/'corpus-proof-dependencies-merged';r=json.loads((corpus/'report.json').read_bytes());t=json.loads((corpus/'terminal.json').read_bytes())
assert t['exit_status']==0 and t['final_source_context_check_passed'] and t['report_sha256']==sha((corpus/'report.json').read_bytes())
assert r['context']['compiler_sha256']==pins['compiler_sha256'] and r['headline']['compiled']==r['headline']['programs']==10
for name,digest in json.loads((corpus/'sha256-index.json').read_bytes())['files'].items():assert sha((corpus/name).read_bytes())==digest,name
final=json.loads((here/'final-cli.json').read_bytes());raw=gzip.decompress((here/'final-cli-tests.log.gz').read_bytes())
assert final['exit_status']==0 and final['tests']==8 and final['tests_log_sha256']==sha(raw) and b'\nOK\n'in raw
assert final['source']['core_tree']==pins['core_tree'] and final['core_unchanged_from_merged_cohort']
with tarfile.open(here/'selected-inputs.tar.gz')as archive:
    measured=json.load(archive.extractfile('runtime-gpu/receipt.json'))
assert final['input_core']==measured['input_core_sha256'] and final['plan_sha256']==measured['artifacts'][1]['measurement'] and final['selected_core']==measured['artifacts'][1]['selected_core_sha256']
upstream=root/'reports/modular-action-projection-2026-10-17'
assert final['canonical_model_sha256']==sha(gzip.decompress((upstream/'neural-model.json.gz').read_bytes())) and final['canonical_model_bytes']==5073076
assert final['sorted_tables_sha256']==sha((upstream/'sorted-tables.json').read_bytes()) and final['sorted_tables_bytes']==16254
print('PASS distinct merged compiler: all28 knowledge tests, eight actual GPU calls, exact deduplicated inputs and stable ten-program corpus; no timing transfer')
