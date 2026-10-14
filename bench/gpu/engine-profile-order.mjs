// Every block balances positions and all directed adjacent backend pairs.
// This reduces systematic carryover (for example, CPU always following GPU).
// It cannot remove asynchronous driver work or unrelated machine activity.
export function balancedOrders(names, rounds, seed){
 if(!Array.isArray(names)||names.length<2||names.length>8||names.length%2||new Set(names).size!==names.length||!Number.isSafeInteger(rounds)||rounds<names.length||rounds%names.length||!Number.isSafeInteger(seed)||seed<0||seed>0xffffffff)throw Error('balanced acquisition order parameters');
 let state=seed>>>0;
 const next=()=>{state=(state+0x6d2b79f5)>>>0;let x=state;x=Math.imul(x^(x>>>15),x|1);x^=x+Math.imul(x^(x>>>7),x|61);return((x^(x>>>14))>>>0)/4294967296;};
 const shuffle=values=>{for(let i=values.length-1;i>0;i--){const j=Math.floor(next()*(i+1));[values[i],values[j]]=[values[j],values[i]];}return values;};
 const n=names.length,base=[0],orders=[];
 for(let i=1;i<n;i++)base.push(i%2?(i+1)/2:n-i/2);
 for(let block=0;block<rounds/n;block++){
  const labels=shuffle([...names]);
  const rows=Array.from({length:n},(_,offset)=>base.map(i=>labels[(i+offset)%n]));
  orders.push(...shuffle(rows));
 }
 return orders;
}
