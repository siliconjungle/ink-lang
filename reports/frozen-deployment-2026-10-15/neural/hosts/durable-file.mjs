// Node single-process file owner. Other processes must not write this path.
import {open,rename,unlink,realpath} from 'node:fs/promises';
import {resolve,dirname,basename} from 'node:path';
import {randomUUID} from 'node:crypto';
import {recordToken,logBase,splitLog,frameOperation,MAX_LOG} from './durable-state.mjs';
const owners=new Set();
export async function openFileStore(filename){
  const parent=await realpath(dirname(resolve(filename))),path=resolve(parent,basename(filename));
  if(owners.has(path))throw Error('Durable file already has a writer in this process');
  owners.add(path);let closed=false,current=null,length=0,journal=false;
  function live(){if(closed)throw Error('File store closed');}
  async function load(){
    live();let bytes;
    try{const file=await open(path,'r');try{if((await file.stat()).size>MAX_LOG)throw Error('Durable log limit');bytes=new Uint8Array(await file.readFile());}finally{await file.close();}}catch(e){if(e.code==='ENOENT'){current=null;length=0;return null;}throw e;}
    const log=await splitLog(bytes);
    if(log.consumed<bytes.length){const file=await open(path,'r+');try{await file.truncate(log.consumed);await file.sync();}finally{await file.close();}bytes=bytes.slice(0,log.consumed);}
    current=log.token;length=bytes.length;journal=bytes[3]===76;return {bytes,token:current};
  }
  return {
    load,
    async commit(expected,bytes){
      live();const captured=bytes.slice(),token=await recordToken(captured),envelope=logBase(captured);
      const saved=await load();if((saved?.token??null)!==expected)throw Error('Storage conflict');
      const temporary=resolve(parent,`.${basename(path)}.${randomUUID()}.tmp`);let file;
      try{
        file=await open(temporary,'wx',0o600);await file.writeFile(envelope);await file.sync();await file.close();file=null;
        await rename(temporary,path);const directory=await open(parent,'r');try{await directory.sync();}finally{await directory.close();}
        current=token;length=envelope.length;journal=true;return token;
      }finally{if(file)await file.close();await unlink(temporary).catch(e=>{if(e.code!=='ENOENT')throw e;});}
    },
    async append(expected,bytes){
      live();if(current!==expected)throw Error('Storage conflict');if(!journal)return null;
      const next=await frameOperation(expected,bytes.slice());if(length+next.frame.length>MAX_LOG)return null;
      const file=await open(path,'a');try{
        if((await file.stat()).size!==length)throw Error('Storage conflict');
        await file.writeFile(next.frame);await file.sync();current=next.token;length+=next.frame.length;return current;
      }finally{await file.close();}
    },
    close(){closed=true;owners.delete(path);},
  };
}
