#include <stdint.h>
#include <stddef.h>
#include <stdlib.h>
static uint64_t *allocate(size_t n) {if(n>SIZE_MAX/8)abort();uint64_t *p=malloc((n?n:1)*8);if(!p)abort();return p;}
static uint64_t run(const uint64_t *x,size_t n,uint64_t a,uint64_t b,int k) {
#ifdef COMBINED
    if(k==3)return (uint64_t)n;
    uint64_t s=0;for(size_t i=n;i>0;--i){uint64_t v=x[i-1];v=k==2?(v+b)*a:v*a+b;if(k==1)v-=b;s+=v;}return s;
#else
    uint64_t *first=allocate(n);
    for(size_t i=0;i<n;++i)first[i]=k==2?x[i]+b:x[i]*a;
    if(k==3){free(first);return (uint64_t)n;}
    uint64_t *second=allocate(n);
    for(size_t i=0;i<n;++i)second[i]=k==2?first[i]*a:first[i]+b;
    free(first);
    if(k==1){uint64_t *third=allocate(n);for(size_t i=0;i<n;++i)third[i]=second[i]-b;free(second);second=third;}
    uint64_t s=0;for(size_t i=n;i>0;--i)s+=second[i-1];free(second);return s;
#endif
}
#define WRAP(name,k) uint64_t lang_fn_##name(const uint64_t *x,size_t n,uint64_t a,uint64_t b){return run(x,n,a,b,k);}
WRAP(two_maps,0) WRAP(three_maps,1) WRAP(shadow_maps,2) WRAP(mapped_count,3)
