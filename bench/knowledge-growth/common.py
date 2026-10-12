from pathlib import Path
import hashlib,json,subprocess,os,time,sys
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'reports/knowledge-growth-2026-10-13';INK=ROOT/'target/release/ink'
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def save(p,v):p=Path(p);p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(v,indent=2)+'\n')
def read(p):return json.loads(Path(p).read_bytes())
def check_frozen():
 for rel,digest in read(OUT/'execution-files.json').items():assert sha(ROOT/rel)==digest,rel
 for key,file in [('source_manifest_sha256','corpus.json'),('fixtures_sha256','fixtures.json'),('upstreams_sha256','upstreams.json')]:assert sha(OUT/file)==read(OUT/'protocol.json')[key],file
 for row in read(OUT/'corpus.json'):assert sha(ROOT/row['source'])==row['sha256']
 for row in read(OUT/'fixtures.json'):assert sha(ROOT/row['path'])==row['sha256']
 if (OUT/'compiler.json').exists():assert sha(INK)==read(OUT/'compiler.json')['sha256']
def process(command,directory,timeout=180):
 directory=Path(directory);directory.mkdir(parents=True,exist_ok=True)
 env=dict(os.environ,PYTHONPATH=os.pathsep.join([str(ROOT/'knowledge'),str(ROOT/'planner')]))
 start=time.perf_counter()
 with (directory/'stdout.txt').open('wb')as stdout,(directory/'stderr.txt').open('wb')as stderr:
  child=subprocess.Popen(list(map(str,command)),cwd=ROOT,env=env,stdout=stdout,stderr=stderr)
  # wait4 records this child, not the maximum from unrelated earlier children.
  _,status,usage=os.wait4(child.pid,0);child.returncode=os.waitstatus_to_exitcode(status)
 row=dict(command=list(map(str,command)),status=child.returncode,seconds=time.perf_counter()-start,os_peak_rss_bytes=usage.ru_maxrss*(1 if sys.platform=="darwin" else 1024),stdout=str((directory/'stdout.txt').relative_to(ROOT)),stderr=str((directory/'stderr.txt').relative_to(ROOT)))
 save(directory/'process.json',row);return row
