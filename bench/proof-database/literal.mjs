// Direct translations of kernels.ink before proof rewriting. Array stages are
// materialised; the JavaScript engine may perform its normal JIT optimisations.
export function call(name, args) {
  const [xs, seed, factor] = args;
  const sum = values => { let acc=0; for(const x of values)acc=(acc+x)>>>0; return acc; };
  switch(name) {
    case 'repeat_subtract': {
      let acc=seed; for(let i=0;i<4096;i++)acc=(acc-factor)>>>0; return acc;
    }
    case 'repeat_product': {
      let acc=seed; for(let i=0;i<4096;i++)acc=(acc+Math.imul(factor,factor))>>>0; return acc;
    }
    case 'scaled_sum': return sum(Array.from(xs,x=>Math.imul(x,factor)>>>0));
    case 'zero_sum': return sum(Array.from(xs,()=>0));
    case 'mapped_count': return BigInt(Array.from(xs,x=>(Math.imul(x,x)+7)>>>0).length);
    case 'true_filter_sum': return sum(Array.from(xs).filter(()=>true));
    case 'false_filter_count': return BigInt(Array.from(xs).filter(()=>false).length);
    case 'fused_filter': return Array.from(xs).filter(x=>x<factor).filter(x=>x>seed);
    case 'gpu_repeat_subtract': return Array.from(xs,x=>{
      let acc=x; for(let i=0;i<32;i++)acc=(acc-factor)>>>0; return acc;
    });
    default: throw Error(`Unknown case ${name}`);
  }
}
