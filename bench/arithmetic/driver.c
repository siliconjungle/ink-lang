#define _POSIX_C_SOURCE 200809L
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <inttypes.h>
#define DECLARE(name) uint64_t bench_fn_##name(uint64_t,uint64_t);
DECLARE(add_zero) DECLARE(subtract_self) DECLARE(add_commute) DECLARE(cancel_add)
DECLARE(multiply_zero) DECLARE(unsigned_reflexive) DECLARE(unsigned_maximum) DECLARE(choose_equal)
static uint64_t rng(uint64_t*s){*s^=*s<<13;*s^=*s>>7;*s^=*s<<17;return *s;}
static double now(void){struct timespec t;clock_gettime(CLOCK_MONOTONIC,&t);return (double)t.tv_sec+(double)t.tv_nsec*1e-9;}
int main(int argc,char**argv){
    if(argc!=4)return 2;
    unsigned k=(unsigned)strtoul(argv[1],0,10);uint64_t it=strtoull(argv[2],0,10);
    if(k>7||!it||it>100000000||(strcmp(argv[3],"small")!=0&&strcmp(argv[3],"full")!=0))return 2;
    uint64_t x[256],y[256],seed=123456789;
    for(unsigned i=0;i<256;++i){x[i]=rng(&seed);y[i]=rng(&seed);if(strcmp(argv[3],"small")==0){x[i]&=1023;y[i]&=1023;}}
    uint64_t (*functions[])(uint64_t,uint64_t)={bench_fn_add_zero,bench_fn_subtract_self,bench_fn_add_commute,bench_fn_cancel_add,bench_fn_multiply_zero,bench_fn_unsigned_reflexive,bench_fn_unsigned_maximum,bench_fn_choose_equal};
    uint64_t (*fn)(uint64_t,uint64_t)=functions[k];uint64_t cycle=0,acc=0;
    for(unsigned i=0;i<256;++i)cycle+=fn(x[i],y[i]);
    for(unsigned i=0;i<3;++i)acc+=fn(x[i],y[i]);
    double start=now();for(uint64_t i=0;i<it;++i)acc+=fn(x[i&255],y[i&255]);double seconds=now()-start;
    printf("{\"seconds\":%.12f,\"cycle\":\"%" PRIu64 "\",\"checksum\":\"%" PRIu64 "\",\"iterations\":%" PRIu64 "}\n",seconds,cycle,acc,it);return 0;
}
