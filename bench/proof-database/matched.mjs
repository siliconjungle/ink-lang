export function call(name, args) {
  const [xs, seed, factor] = args;
  const sum = () => { let s = 0; for (const x of xs) s = (s + x) >>> 0; return s; };
  switch(name) {
    case 'repeat_subtract': return (seed - Math.imul(4096, factor)) >>> 0;
    case 'repeat_product': return (seed + Math.imul(4096, Math.imul(factor, factor))) >>> 0;
    case 'scaled_sum': return Math.imul(sum(), factor) >>> 0;
    case 'zero_sum': return 0;
    case 'mapped_count': return BigInt(xs.length);
    case 'true_filter_sum': return sum();
    case 'false_filter_count': return 0n;
    case 'fused_filter': return Array.from(xs).filter(x=>x<factor&&x>seed);
    case 'gpu_repeat_subtract': return Array.from(xs,x=>(x-Math.imul(32,factor))>>>0);
    default: throw Error(`Unknown case ${name}`);
  }
}
