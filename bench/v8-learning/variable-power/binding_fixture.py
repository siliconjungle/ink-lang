"""Project only the relational inputs needed for the selected binding control."""
from pathlib import Path
import gzip,hashlib,json,os,sqlite3
from ink_knowledge import Store
from ink_knowledge.published_bindings import indexed
b=Path('build/v8-variable-power-cases');source=b/'search-profile/wide-final-cli/knowledge/index.sqlite';out=b/'binding-fixture';out.mkdir();tables=['snapshots','entries','witnesses','members','published_bindings_v1'];counts={}
with sqlite3.connect(source.resolve().as_uri()+'?mode=ro',uri=True)as src,sqlite3.connect(out/'index.sqlite')as dst:
 for table in tables:
  sql=src.execute('SELECT sql FROM sqlite_master WHERE type=? AND name=?',('table',table)).fetchone()[0];dst.execute(sql)
  columns=len(src.execute('PRAGMA table_info('+table+')').fetchall());rows=src.execute('SELECT rowid,*FROM '+table+' ORDER BY rowid');n=0
  while batch:=rows.fetchmany(1000):dst.executemany('INSERT INTO '+table+'(rowid,'+','.join(r[1]for r in src.execute('PRAGMA table_info('+table+')'))+') VALUES('+','.join('?'for _ in range(columns+1))+')',batch);n+=len(batch)
  counts[table]=n
 for sql,table in src.execute("SELECT sql,tbl_name FROM sqlite_master WHERE type='index' AND sql IS NOT NULL"):
  if table in tables:dst.execute(sql)
 dst.commit()
os.symlink(Path('knowledge/store').resolve(),out/'store',target_is_directory=True)
snapshot='14edbdd3dea8f2bea214b8badba800a004dfbeffc7c4feb02be8b9a1ad45e739';s=Store(out,out/'store/snapshots'/(snapshot+'.json'));keys=indexed(s);assert sum(map(len,keys.values()))==180
out=Path('bench/v8-learning/variable-power');raw=(b/'binding-fixture/index.sqlite').read_bytes();(out/'binding-fixture.sqlite.gz').write_bytes(gzip.compress(raw,mtime=0));(out/'binding-fixture.json').write_text(json.dumps(dict(schema=1,sqlite_sha256=hashlib.sha256(raw).hexdigest(),tables=counts,snapshot=snapshot,bindings=keys,external_canonical_store='knowledge/store',scope='Only exact relational inputs used by the binding lookup and authenticating member witnesses; original rowids and indexes retained. Proof/package bodies remain in the declared immutable source snapshot; no copied knowledge store or build targets. Timing pertains to this projected fixture, not the original full cache layout.'),indent=2)+'\n');print('Selected relational fixture',len(raw),counts)
