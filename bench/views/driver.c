#define _POSIX_C_SOURCE 200809L
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <time.h>
#include <inttypes.h>
void*vs_new(uint64_t);void vs_free(void*);uint32_t vs_put(void*,uint64_t,uint32_t,uint32_t);uint32_t vs_del(void*,uint64_t);int64_t vs_units(void*);int64_t vs_rows(void*);
static uint64_t rng(uint64_t*s){*s^=*s<<13;*s^=*s>>7;*s^=*s<<17;return *s;}
static double now(void){struct timespec t;clock_gettime(CLOCK_MONOTONIC,&t);return (double)t.tv_sec+(double)t.tv_nsec*1e-9;}
int main(int argc,char**argv){
 if(argc!=5)return 2;
 uint64_t n=strtoull(argv[1],0,10),steps=strtoull(argv[2],0,10),q=strtoull(argv[3],0,10),seed=strtoull(argv[4],0,10);
 if(!n||!steps||q>1000||!seed)return 2;
 void*s=vs_new(n);uint64_t r=seed,check=0,queries=0,updates=0;double start=now();
 for(uint64_t i=0;i<steps;i++){
  uint64_t x=rng(&r);
  if(x%1000<q){int64_t v=(x>>10)&1?vs_units(s):vs_rows(s);check=check*1099511628211ULL+(uint64_t)v;queries++;}
  else{uint64_t key=(x>>12)%(2*n);if((x>>40)%10==0)check+=vs_del(s,key);else check+=vs_put(s,key,(uint32_t)((x>>20)%1000),(uint32_t)((x>>32)%3!=0));updates++;}
 }
 double seconds=now()-start;int64_t u=vs_units(s),c=vs_rows(s);vs_free(s);
 printf("{\"seconds\":%.9f,\"steps\":%" PRIu64 ",\"queries\":%" PRIu64 ",\"updates\":%" PRIu64 ",\"checksum\":\"%" PRIu64 "\",\"units\":%" PRId64 ",\"rows\":%" PRId64 "}\n",seconds,steps,queries,updates,check,u,c);
 return 0;
}
