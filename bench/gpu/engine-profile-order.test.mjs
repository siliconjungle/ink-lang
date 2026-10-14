import test from 'node:test';
import assert from 'node:assert/strict';
import {balancedOrders} from './engine-profile-order.mjs';

test('every block balances positions and every directed preceding backend',()=>{
 for(const n of [2,4,6,8])for(const seed of [0,1,117,0xffffffff]){
  const names=Array.from({length:n},(_,i)=>'backend-'+i),orders=balancedOrders(names,2*n,seed);
  assert.deepEqual(orders,balancedOrders(names,2*n,seed));
  for(let block=0;block<2;block++){
   const rows=orders.slice(block*n,(block+1)*n),pairs=new Map();
   for(let position=0;position<n;position++)assert.deepEqual(rows.map(r=>r[position]).sort(),[...names].sort());
   for(const row of rows){
    assert.deepEqual([...row].sort(),[...names].sort());
    for(let i=1;i<n;i++){const key=JSON.stringify([row[i-1],row[i]]);pairs.set(key,(pairs.get(key)??0)+1);}
   }
   assert.equal(pairs.size,n*(n-1));assert.ok([...pairs.values()].every(count=>count===1));
  }
 }
});

test('rejects partial blocks and invalid labels or seeds',()=>{
 for(const args of [[['cpu','gpu'],3,1],[['cpu','cpu'],4,1],[['cpu','gpu','auto'],6,1],[['cpu','gpu'],4,-1]])assert.throws(()=>balancedOrders(...args),/parameters/);
 assert.notDeepEqual(balancedOrders(['cpu','gpu','auto','profile'],8,1),balancedOrders(['cpu','gpu','auto','profile'],8,2));
});
