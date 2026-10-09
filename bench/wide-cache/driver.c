#define _POSIX_C_SOURCE 200809L
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <time.h>
#include <inttypes.h>
extern void*wide_new(uint32_t,uint32_t);
extern void wide_free(void*);
extern uint32_t wide_set(void*,uint32_t);
extern uint64_t wide_query(void*);
extern char*wide_observe(void*);
extern void wide_string_free(char*);
static uint64_t rng(uint64_t*s){*s^=*s<<13;*s^=*s>>7;*s^=*s<<17;return *s;}
static double now(void){struct timespec t;clock_gettime(CLOCK_MONOTONIC,&t);return (double)t.tv_sec+(double)t.tv_nsec*1e-9;}
int main(int argc,char**argv){
 if(argc!=5)return 2;
 uint32_t bits=(uint32_t)strtoul(argv[1],0,10),profile=(uint32_t)strtoul(argv[2],0,10);
 uint64_t steps=strtoull(argv[3],0,10),qpu=strtoull(argv[4],0,10);
 if(!bits||bits>16384||profile>1||!steps||steps>10000000||qpu>10)return 2;
 void*s=wide_new(bits,profile);uint64_t random=76231749,check=0;double start=now();
 for(uint64_t i=0;i<steps;i++){
  uint32_t index=(uint32_t)(rng(&random)%32);uint32_t status=wide_set(s,index);if(status)abort();
  check=check*1099511628211ULL+status;
  for(uint64_t q=0;q<qpu;q++)check=check*1099511628211ULL+wide_query(s);
 }
 double seconds=now()-start;char*observation=wide_observe(s);
 printf("{\"seconds\":%.12f,\"steps\":%"PRIu64",\"checksum\":\"%"PRIu64"\",\"observation\":%s}\n",seconds,steps,check,observation);
 wide_string_free(observation);wide_free(s);return 0;
}
