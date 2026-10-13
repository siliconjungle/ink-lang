"""Acquire ordinary before/after builds without supplying any selection packet."""
import os
import argparse, hashlib, json, os, pathlib, subprocess, sys, time

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = pathlib.Path(os.environ.get('INK_AUTO_REPORT', ROOT/'reports/automatic-planning-2026-10-13')).resolve()
p = argparse.ArgumentParser()
p.add_argument('--code', type=pathlib.Path, required=True)
p.add_argument('--compiler', type=pathlib.Path, required=True)
p.add_argument('--database', type=pathlib.Path, required=True)
p.add_argument('--lane', required=True)
p.add_argument('--target', default='javascript')
p.add_argument('--names', nargs='*')
a = p.parse_args()
protocol = json.loads((OUT/'protocol.json').read_text())
for key, name in [('corpus_sha256','corpus.json'), ('fixtures_sha256','fixtures.json')]:
    assert hashlib.sha256((OUT/name).read_bytes()).hexdigest() == protocol[key]
rows = []
env = dict(os.environ, INK_DISTRIBUTION=str(a.code.resolve()),
           PYTHONPATH=os.pathsep.join([str(a.code/'knowledge'), str(a.code/'planner')]))
snapshot = json.loads((a.database/'store/snapshot.json').read_text())
# Pin the original catalogue throughout this lane, including after publication.
pinfile = OUT/(a.lane+'-input-snapshot.json')
if pinfile.exists():
    snapshot = json.loads(pinfile.read_text())
else:
    pinfile.write_text(json.dumps(snapshot, indent=2)+'\n')
sid = hashlib.sha256(__import__('importlib').import_module('json').dumps(snapshot,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()).hexdigest()
for program in json.loads((OUT/'corpus.json').read_text()):
    if a.names and program['name'] not in a.names:
        continue
    source = ROOT/program['source']
    assert hashlib.sha256(source.read_bytes()).hexdigest() == program['sha256']
    d = OUT/'compiled'/a.lane/a.target/program['name']; d.mkdir(parents=True, exist_ok=True)
    if (d/'process.json').exists():
        rows.append(json.loads((d/'process.json').read_text())); continue
    command = [sys.executable, '-m', 'ink_planner.compiled_planning', '--compiler', str(a.compiler.resolve()),
               '--source', str(source), '--knowledge-root', str(a.database.resolve()),
               '--snapshot', str(a.database.resolve()/'store/snapshots'/f'{sid}.json'),
               '--target', a.target, '--emit', str(d/'output.mjs' if a.target=='javascript' else d/'output'),
               '-o', str(d/'plan.json')]
    begin = time.perf_counter()
    with (d/'stdout.txt').open('wb') as stdout, (d/'stderr.txt').open('wb') as stderr:
        child = subprocess.Popen(command, env=env, stdout=stdout, stderr=stderr)
        _, status, usage = os.wait4(child.pid, 0)
    row = dict(program=program['name'], lane=a.lane, target=a.target, command=command,
               status=os.waitstatus_to_exitcode(status), seconds=time.perf_counter()-begin,
               process_high_water_bytes=usage.ru_maxrss*(1 if sys.platform=='darwin' else 1024),
               compiler_sha256=hashlib.sha256(a.compiler.read_bytes()).hexdigest())
    (d/'process.json').write_text(json.dumps(row,indent=2)+'\n'); rows.append(row)
    print(a.lane,a.target,program['name'],row['status'],round(row['seconds'],3),flush=True)
    if row['status']:
        print((d/'stderr.txt').read_text()[-2000:]); raise SystemExit(row['status'])
(OUT/(a.lane+'-'+a.target+'-compilation.json')).write_text(json.dumps(rows,indent=2)+'\n')
