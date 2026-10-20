import {equal} from '../../../tools/engine-gate/worker.mjs';
const f=Math.fround, keys=['p','q','r','s','t','u'];
const initial=()=>Object.fromEntries(keys.map((k,i)=>[k,{a:f((i-3)/16),b:f((i+1)/32)}]));
function energy(w,x) {
  const terms=keys.flatMap(k=>{const a=f(w[k].a-x),b=f(w[k].b+x);return [f(a*a),f(b*b)];});
  return terms.slice(1).reduce((a,b)=>f(a+b),terms[0]);
}
function step(w,x,rate) {
  // Independent forward derivative, including every zero product and rounding point.
  const leaves=keys.flatMap(k=>['a','b'].map(field=>[k,field]));
  const gradient=Object.fromEntries(keys.map(k=>[k,{}]));
  for(const [dk,df] of leaves) {
    const terms=[];
    for(const [k,field] of leaves) {
      const a=field==='a'?f(w[k][field]-x):f(w[k][field]+x);
      const da=(k===dk&&field===df)?1:0;
      terms.push(f(f(da*a)+f(a*da)));
    }
    gradient[dk][df]=terms.slice(1).reduce((a,b)=>f(a+b),terms[0]);
  }
  return Object.fromEntries(keys.map(k=>[k,Object.fromEntries(['a','b'].map(field=>[field,f(w[k][field]-f(rate*gradient[k][field]))]))]));
}
const xs=n=>Array.from({length:n},(_,i)=>f(((i*17)%127-63)/64));
export const cases=[...[8,100].map(n=>({name:'forecast-'+n,lifetime:'complete direct call; immutable inputs; owned output',create:m=>{const w=initial(),x=xs(n);return()=>m.functions.forecast(w,x);}})),
 {name:'learning-update',lifetime:'sequential changing weights; complete gradient and update',create:m=>{let w=initial(),i=0;return()=>w=m.functions.step(w,f(((i++%13)-6)/16),f(1/512));}}];
export function verify(m) {
  let checks=0;
  for(const n of [0,1,8,100]) {const w=initial(),x=xs(n);equal(m.functions.forecast(w,x),x.map(x=>energy(w,x)));checks++;}
  let w=initial(),expected=initial();
  for(let i=0;i<64;i++) {const x=f(((i%13)-6)/16),rate=f(1/512);w=m.functions.step(w,x,rate);expected=step(expected,x,rate);equal(w,expected);checks++;}
  return {independentChecks:checks,trajectorySteps:64};
}
