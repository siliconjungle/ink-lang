import {flushSync} from 'svelte';
import {signal,computed,effect} from '@preact/signals-core';
import {kernel} from './kernels.mjs';
export function svelteModel(kind){
 let input=$state.raw(new Uint32Array()),runs=0;
 let output=$derived.by(()=>{runs++;return kernel(input,kind);});
 const close=$effect.root(()=>{$effect(()=>{output;});});flushSync();
 return {run(xs){input=xs.slice();flushSync();return output;},close,runs:()=>runs};
}
export function preactModel(kind){
 const input=signal(new Uint32Array());let runs=0;
 const output=computed(()=>{runs++;return kernel(input.value,kind);});
 const close=effect(()=>{output.value;});
 return {run(xs){input.value=xs.slice();return output.value;},close,runs:()=>runs};
}
export function rawModel(kind){return {run:xs=>kernel(xs.slice(),kind),close(){}};}
export {kernel,data} from './kernels.mjs';
