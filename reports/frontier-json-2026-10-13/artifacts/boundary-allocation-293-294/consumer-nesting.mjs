import assert from 'node:assert/strict';
for(const filename of ['./consumer-records.mjs','./consumer-sums.mjs']){
 const ink=await import(filename),codec=ink.compiledValues.set_document.params[0],json=new ink.JsonCodec(ink.valueCodecs.identity.result);
 const text='{"x":{"x":1},"y":[{"x":2},{"x":3}],"z":{"x":4}}';
 const handle=json.parseCompiled(codec,text);assert.equal(json.stringifyCompiled(codec,handle),text);
 const logical=codec.materialize(handle),members=logical.payload.Err.Err.Err.Err.Err.item0;
 // A nested object's duplicate names cannot poison its parent's or sibling's set.
 const inner=members[1].value.payload.Err.Err.Err.Err.Ok.item0[0].payload.Err.Err.Err.Err.Err.item0;
 inner.push({...inner[0]});const bad=codec.capture(logical);
 assert.throws(()=>json.stringifyCompiled(codec,bad),/duplicate/);
 assert.equal(json.stringifyCompiled(codec,handle),text);
 assert.throws(()=>json.stringifyCompiled(codec,handle,{bytes:40}),/limit/);
 assert.equal(json.stringifyCompiled(codec,handle),text);
}
