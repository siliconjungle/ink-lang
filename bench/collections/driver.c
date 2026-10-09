#define _POSIX_C_SOURCE 200809L
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <inttypes.h>
uint64_t lang_fn_two_maps(const uint64_t*,size_t,uint64_t,uint64_t);
uint64_t lang_fn_three_maps(const uint64_t*,size_t,uint64_t,uint64_t);
uint64_t lang_fn_shadow_maps(const uint64_t*,size_t,uint64_t,uint64_t);
static uint64_t rng(uint64_t *s){*s^=*s<<13;*s^=*s>>7;*s^=*s<<17;return *s;}
static double now(void){struct timespec t;clock_gettime(CLOCK_MONOTONIC,&t);return (double)t.tv_sec+(double)t.tv_nsec*1e-9;}
int main(int argc,char **argv){
    if(argc!=5)return 2;
    unsigned k=(unsigned)strtoul(argv[1],0,10);size_t n=(size_t)strtoull(argv[2],0,10);uint64_t it=strtoull(argv[3],0,10);
    if(k>2||n>100000000||it==0)return 2;
    uint64_t *x=malloc((n?n:1)*8);if(!x)return 3;uint64_t seed=123456789;
    for(size_t i=0;i<n;i++){uint64_t v=rng(&seed);x[i]=strcmp(argv[4],"full")==0?v:(v&1023);}
    uint64_t (*fn)(const uint64_t*,size_t,uint64_t,uint64_t)=k==0?lang_fn_two_maps:k==1?lang_fn_three_maps:lang_fn_shadow_maps;
    uint64_t single=fn(x,n,3,11),acc=0;for(int i=0;i<3;i++)acc+=fn(x,n,3,11);
    double start=now();for(uint64_t i=0;i<it;i++)acc+=fn(x,n,3,11);double seconds=now()-start;
    printf("{\"seconds\":%.12f,\"single\":\"%" PRIu64 "\",\"checksum\":\"%" PRIu64 "\",\"iterations\":%" PRIu64 "}\n",seconds,single,acc,it);
    free(x);return 0;
}
