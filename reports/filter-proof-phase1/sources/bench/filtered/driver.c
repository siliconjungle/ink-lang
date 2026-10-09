#define _POSIX_C_SOURCE 200809L
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <inttypes.h>
#define DECLARE(name) uint64_t lang_fn_##name(const uint64_t*,size_t,uint64_t,uint64_t,uint64_t);
DECLARE(mapped_filter_sum) DECLARE(filter_map_sum) DECLARE(mapped_filter_count) DECLARE(constant_filter_sum)
static uint64_t rng(uint64_t*s){*s^=*s<<13;*s^=*s>>7;*s^=*s<<17;return *s;}
static double now(void){struct timespec t;clock_gettime(CLOCK_MONOTONIC,&t);return (double)t.tv_sec+(double)t.tv_nsec*1e-9;}
int main(int argc,char**argv){
    if(argc!=6)return 2;
    unsigned k=(unsigned)strtoul(argv[1],0,10);size_t n=(size_t)strtoull(argv[2],0,10);uint64_t it=strtoull(argv[3],0,10),limit=strtoull(argv[5],0,10);
    if(k>3||n>100000000||it==0)return 2;
    uint64_t*x=malloc((n?n:1)*8);if(!x)return 3;uint64_t seed=123456789;
    // Full-width inputs exclude UINT64_MAX itself, so the all profile is exact
    // for both x and its odd affine permutation (the excluded preimage is fixed below).
    uint64_t (*fn[])(const uint64_t*,size_t,uint64_t,uint64_t,uint64_t)={lang_fn_mapped_filter_sum,lang_fn_filter_map_sum,lang_fn_mapped_filter_count,lang_fn_constant_filter_sum};
    for(size_t i=0;i<n;++i){uint64_t v=rng(&seed);x[i]=strcmp(argv[4],"full")==0?v:(v&1023);if(x[i]==UINT64_MAX || x[i]*3+11==UINT64_MAX)x[i]=0;}
    uint64_t single=fn[k](x,n,3,11,limit),acc=0;for(int i=0;i<3;++i)acc+=fn[k](x,n,3,11,limit);
    double start=now();for(uint64_t i=0;i<it;++i)acc+=fn[k](x,n,3,11,limit);double seconds=now()-start;
    printf("{\"seconds\":%.12f,\"single\":\"%" PRIu64 "\",\"checksum\":\"%" PRIu64 "\",\"iterations\":%" PRIu64 "}\n",seconds,single,acc,it);free(x);return 0;
}
