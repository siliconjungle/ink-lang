"""Project actual parsed JavaScript and glTF binary positions to declared types."""
import argparse,json,hashlib,base64,struct,tarfile,subprocess
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--directory',type=Path,required=True);p.add_argument('--lodash',type=Path,required=True);a=p.parse_args();root=a.directory.resolve()
meta=json.loads((root/'acorn/meta.json').read_text());data=(root/'acorn/package.tgz').read_bytes();assert 'sha512-'+base64.b64encode(hashlib.sha512(data).digest()).decode()==meta['dist']['integrity'];tarfile.open(root/'acorn/package.tgz','r:gz').extractall(root/'acorn',filter='data')
script=Path(__file__).with_name('prepare-data.mjs');r=subprocess.run(['node',str(script),str(root/'acorn/package/dist/acorn.js'),str(a.lodash),str(root/'nodes.json')],capture_output=True,text=True);assert r.returncode==0,r.stderr
blob=(root/'helmet.glb').read_bytes();magic,version,length=struct.unpack_from('<III',blob);assert(magic,version,length)==(0x46546c67,2,len(blob));chunks={};offset=12
while offset<len(blob):
 count,kind=struct.unpack_from('<II',blob,offset);chunks[kind]=blob[offset+8:offset+8+count];offset+=8+count
model=json.loads(chunks[0x4e4f534a]);binary=chunks[0x004e4942];particles=[];indices=sorted({p['attributes']['POSITION']for mesh in model['meshes']for p in mesh['primitives']})
for index in indices:
 accessor=model['accessors'][index];assert accessor['componentType']==5126 and accessor['type']=='VEC3'and 'sparse'not in accessor
 view=model['bufferViews'][accessor['bufferView']];assert view['buffer']==0
 start=view.get('byteOffset',0)+accessor.get('byteOffset',0);stride=view.get('byteStride',12)
 for i in range(accessor['count']):
  x,y,z=struct.unpack_from('<fff',binary,start+i*stride);particles.append(dict(x=x,y=y,mass=1,alive=True,label='DamagedHelmet'))
nodes=json.loads((root/'nodes.json').read_text());sources=dict(acorn=dict(version=meta['version'],integrity=meta['dist']['integrity'],tarball=meta['dist']['tarball']),lodash=dict(version='4.17.21',sha256=hashlib.sha256(a.lodash.read_bytes()).hexdigest()),geometry=dict(url='https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/DamagedHelmet/glTF-Binary/DamagedHelmet.glb',sha256=hashlib.sha256(blob).hexdigest(),bytes=len(blob),position_accessors=indices,vertices=len(particles)))
fixture=dict(schema=1,nodes=nodes,particles=particles,sources=sources,scope='Held-out data distributions after laws were written; source kernels are deliberately chosen, not held-out source programs. Acorn parsing and glTF decoding/preprojection happen before timing. No arbitrary JSON in Ink.')
(root/'fixture.json').write_text(json.dumps(fixture,separators=(',',':'))+'\n');(root/'sources.json').write_text(json.dumps(dict(sources=sources,nodes=len(nodes),vertices=len(particles)),indent=2)+'\n');print(json.dumps(dict(nodes=len(nodes),vertices=len(particles))))
