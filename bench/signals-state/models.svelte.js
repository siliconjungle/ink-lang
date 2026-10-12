import { SvelteMap } from 'svelte/reactivity';
import { flushSync } from 'svelte';

const word = n => BigInt.asUintN(64, n);
export function observeRows(factory, initial) {
  let model;
  const close = $effect.root(() => {
    model = factory(initial);
    $effect(() => { model.total(); model.count(); });
  });
  flushSync();
  return {...model, close};
}
export function deepRows(initial) {
  const rows = $state(initial.map(r => ({...r})));
  let sumRuns = 0, countRuns = 0;
  const total = $derived.by(() => { sumRuns++; let n=0n; for(const r of rows) if(r.active)n=word(n+r.value); return n; });
  const count = $derived.by(() => { countRuns++; let n=0n; for(const r of rows) if(r.active)n++; return n; });
  return {put(k,v,a){rows[Number(k)].value=v;rows[Number(k)].active=a;}, point(k){return rows[Number(k)].value;}, total(){return total;},count(){return count;}, counters(){return {sumRuns,countRuns};}};
}
export function mapRows(initial) {
  const rows = new SvelteMap(initial.map((r,i)=>[BigInt(i),{...r}]));
  let sumRuns=0,countRuns=0;
  const total = $derived.by(() => {sumRuns++;let n=0n;for(const r of rows.values())if(r.active)n=word(n+r.value);return n;});
  const count = $derived.by(() => {countRuns++;let n=0n;for(const r of rows.values())if(r.active)n++;return n;});
  return {put(k,v,a){rows.set(k,{value:v,active:a});},point(k){return rows.get(k).value;},total(){return total;},count(){return count;},counters(){return {sumRuns,countRuns};}};
}
export function deltaRows(initial) {
  const rows = new Map(initial.map((r,i)=>[BigInt(i),{...r}]));
  let total=$state(initial.reduce((s,r)=>r.active?word(s+r.value):s,0n));
  let count=$state(BigInt(initial.filter(r=>r.active).length));
  return {put(k,v,a){const old=rows.get(k);total=word(total-(old.active?old.value:0n)+(a?v:0n));count+=BigInt(a)-BigInt(old.active);rows.set(k,{value:v,active:a});},point(k){return rows.get(k).value;},total(){return total;},count(){return count;},counters(){return {manualDelta:true};}};
}
