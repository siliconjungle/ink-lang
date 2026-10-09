#include <stdint.h>
#include <stddef.h>
#include <stdlib.h>
static uint64_t *allocate(size_t n){if(n>SIZE_MAX/8)abort();uint64_t *p=malloc((n?n:1)*8);if(!p)abort();return p;}
static uint64_t run(const uint64_t *x,size_t n,uint64_t a,uint64_t b,uint64_t limit,int k){
#ifdef COMBINED
    if(k==3)return b<limit?b*(uint64_t)n:0;
    uint64_t sum=0;
    for(size_t i=n;i>0;--i){uint64_t v=x[i-1],y=v*a+b;if((k==1?v:y)<limit)sum+=k==2?1:y;}
    return sum;
#else
    uint64_t *first=allocate(n);size_t count=0;
    if(k==1){for(size_t i=0;i<n;++i)if(x[i]<limit)first[count++]=x[i];}
    else{for(size_t i=0;i<n;++i)first[i]=k==3?b:x[i]*a+b;count=n;}
    uint64_t *second=allocate(count);size_t out=0;
    if(k==1){for(size_t i=0;i<count;++i)second[out++]=first[i]*a+b;}
    else{for(size_t i=0;i<count;++i)if(first[i]<limit)second[out++]=first[i];}
    free(first);
    uint64_t sum=0;if(k==2)sum=(uint64_t)out;else for(size_t i=out;i>0;--i)sum+=second[i-1];
    free(second);return sum;
#endif
}
#define WRAP(name,k) uint64_t lang_fn_##name(const uint64_t*x,size_t n,uint64_t a,uint64_t b,uint64_t limit){return run(x,n,a,b,limit,k);}
WRAP(mapped_filter_sum,0) WRAP(filter_map_sum,1) WRAP(mapped_filter_count,2) WRAP(constant_filter_sum,3)
