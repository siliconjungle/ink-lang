from common import *
check_frozen();save(OUT/'compiler.json',dict(sha256=sha(INK),build='cargo build --release --locked',pins=read(OUT/'protocol.json')['pins']))
rows=[]
for p in read(OUT/'corpus.json'):
 d=OUT/'baseline'/p['name'];r=process([INK,'emit-core',ROOT/p['source'],'-o',d/'core.json'],d);r['program']=p['name'];rows.append(r)
 if not r['status']:
  rows.append(dict(program=p['name'],**process([INK,'emit-semantic',d/'core.json','--core','-o',d/'semantic.json'],d/'semantic-process')))
  rows.append(dict(program=p['name'],**process([INK,'build',ROOT/p['source'],'--target','javascript','-o',d/'literal.mjs'],d/'literal-process')))
save(OUT/'baseline-builds.json',rows);print(json.dumps(rows))
