// Node single-process file owner. Other processes must not write this path.
import {open,rename,unlink,realpath} from 'node:fs/promises';
import {resolve,dirname,basename} from 'node:path';
import {randomUUID} from 'node:crypto';
import {recordToken} from './durable-state.mjs';
const owners=new Set();
export async function openFileStore(filename){
  // Require an existing directory; creating durable directory hierarchies is the application's responsibility.
  const parent=await realpath(dirname(resolve(filename))),path=resolve(parent,basename(filename));
  if(owners.has(path))throw Error('Durable file already has a writer in this process');
  owners.add(path);let closed=false;
  function live(){if(closed)throw Error('File store closed');}
  async function load(){
    live();let bytes;
    try{const file=await open(path,'r');try{if((await file.stat()).size>68*1024*1024+40)throw new RangeError('Durable record limit');bytes=new Uint8Array(await file.readFile());}finally{await file.close();}}catch(e){if(e.code==='ENOENT')return null;throw e;}
    return {bytes,token:await recordToken(bytes)};
  }
  return {
    load,
    async commit(expected,bytes){
      live();const captured=bytes.slice(),token=await recordToken(captured);
      const current=await load();if((current?.token??null)!==expected)throw Error('Storage conflict');
      const temporary=resolve(parent,`.${basename(path)}.${randomUUID()}.tmp`);let file;
      try{
        file=await open(temporary,'wx',0o600);await file.writeFile(captured);await file.sync();await file.close();file=null;
        await rename(temporary,path);
        const directory=await open(parent,'r');try{await directory.sync();}finally{await directory.close();}
        return token;
      }finally{if(file)await file.close();await unlink(temporary).catch(e=>{if(e.code!=='ENOENT')throw e;});}
    },
    close(){closed=true;owners.delete(path);},
  };
}
