import assert from 'node:assert/strict';
export async function validateWords(loadInk, root) {
 const engine=await loadInk(root,{gpu:false});
 const input=['0','1','9007199254740993','18446744073709551615'];
 const expected=input.map(x=>BigInt.asUintN(64,BigInt(x)*BigInt(x)+1n)).map(x=>x<=BigInt(Number.MAX_SAFE_INTEGER)?Number(x):String(x));
 let comparisons=0,rejected=0;
 for(const backend of ['cpu','javascript','auto']) {
  const result=await engine.call('wrapping',[input],{backend});
  assert.deepEqual(result.value,expected);comparisons++;
 }
 for(const value of [true,false,[1],null,9007199254740992,'0x10','18446744073709551616']) {
  await assert.rejects(engine.call('wrapping',[[value]],{backend:'javascript'}));rejected++;
 }
 await engine.dispose();return {comparisons,rejected};
}
