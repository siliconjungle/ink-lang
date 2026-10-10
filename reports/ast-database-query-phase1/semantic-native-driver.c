#include "semantic-selected.c"
#include <assert.h>
#include <stdio.h>
int main(void){
 uint32_t xs[1025];
 for(size_t i=0;i<1025;++i)xs[i]=i==0?0:i==1?UINT32_MAX:i==2?UINT32_C(2147483648):(uint32_t)(i*UINT32_C(2756341469));
 size_t checks=0;
 size_t sizes[]={0,4,1025};
 for(size_t k=0;k<3;++k){size_t n=sizes[k];
  ink_l_uint32 out=lang_fn_compute((ink_l_uint32){xs,n});assert(out.len==n);
  for(size_t i=0;i<n;++i){assert(out.data[i]==(uint32_t)(3u*xs[i]+10u));++checks;}
  ink_compute_reset();
 }
 printf("%zu elements match independent u32 oracle across empty, boundary and 1025-element cases\n",checks);
}
