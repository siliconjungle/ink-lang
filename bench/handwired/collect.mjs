// Local-only receipt collector. No network service or telemetry leaves this host.
import http from 'node:http';import fs from 'node:fs/promises';
await fs.mkdir(new URL('./receipts/',import.meta.url),{recursive:true});
http.createServer(async(req,res)=>{
 res.setHeader('Access-Control-Allow-Origin','http://127.0.0.1:4324');
 res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');
 if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
 if(req.method!=='POST'||req.url!=='/receipt'){res.writeHead(404);res.end();return;}
 try{let body='';for await(const chunk of req){body+=chunk;if(body.length>262144)throw Error('receipt too large');}
 const receipt=JSON.parse(body);if(receipt.schema!==1||receipt.status!=='measured'||!Array.isArray(receipt.rows))throw Error('bad receipt');
 const name=Date.now()+'.json';await fs.writeFile(new URL('./receipts/'+name,import.meta.url),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
 res.setHeader('Content-Type','application/json');res.end(JSON.stringify({saved:name}));console.log(name);
 }catch(error){res.writeHead(400);res.end(String(error));}
}).listen(4325,'127.0.0.1',()=>console.log('Receipt collector: 127.0.0.1:4325'));
