#include <assert.h>
#include <stdint.h>
#include <stddef.h>
#include <stdio.h>
uint64_t lang_fn_scalar(uint64_t,uint64_t);
uint64_t lang_fn_zeros(uint64_t);
uint64_t lang_fn_mapped(const uint64_t*,size_t,uint64_t);
uint64_t lang_fn_shadow(const uint64_t*,size_t,uint64_t);
uint64_t lang_fn_factored(uint64_t);
static uint64_t seed=UINT64_C(134541);
static uint64_t next(void){seed^=seed<<13;seed^=seed>>7;seed^=seed<<17;return seed;}
int main(void){
 for(size_t i=0;i<512;++i){
  uint64_t x=i==0?UINT64_MAX:next(),y=next(),xs[31],total=0;
  size_t n=i%32;
  for(size_t j=0;j<n;++j){xs[j]=next();total+=xs[j];}
  assert(lang_fn_scalar(x,y)==x);
  assert(lang_fn_zeros(x)==0);
  assert(lang_fn_mapped(xs,n,y)==total);
  assert(lang_fn_shadow(xs,n,x)==0);
  assert(lang_fn_factored(x)==(x+3)*(x+3));
 }
 puts("2560 native results match independent modular-arithmetic expectations");
}
