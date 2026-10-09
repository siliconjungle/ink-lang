#define _POSIX_C_SOURCE 200809L
#include "api.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <inttypes.h>
static uint64_t rng(uint64_t*s){*s^=*s<<13;*s^=*s>>7;*s^=*s<<17;return *s;}
static double now(void){struct timespec t;clock_gettime(CLOCK_MONOTONIC,&t);return (double)t.tv_sec+(double)t.tv_nsec*1e-9;}
int main(int argc,char**argv){
 if(argc!=5)return 2;uint64_t n=strtoull(argv[1],0,10),steps=strtoull(argv[2],0,10),qpu=strtoull(argv[3],0,10);int mixed=!strcmp(argv[4],"mixed");
 if(!n||n>1000000||!steps||steps>10000000||qpu>100)return 2;
 void*s=st_new(n);uint64_t random=123456789,check=0,lo=0,hi=0,counts[4]={0};double start=now();
 for(uint64_t i=0;i<steps;i++){
  uint64_t r=rng(&random),key=r%(mixed?2*n:n);uint32_t op=1,value=1;
  if(mixed){switch((r>>32)%10){case 0:case 1:op=0;value=(uint32_t)(r%1024);break;case 2:op=2;break;case 3:case 4:op=3;break;case 5:value=UINT32_MAX;break;default:break;}}
  uint32_t status=st_apply(s,op,key,value);if(status>3)abort();counts[status]++;check=check*1099511628211ULL+status;
  for(uint64_t j=0;j<qpu;j++){st_total(s,&lo,&hi);check=check*1099511628211ULL+lo+hi;}
 }
 double seconds=now()-start;st_total(s,&lo,&hi);uint64_t state_hash=0;
 for(uint64_t i=0;i<2*n;i++){uint32_t found=0,v=st_stock(s,i,&found);state_hash=state_hash*1099511628211ULL+v+found;}
 printf("{\"seconds\":%.12f,\"steps\":%"PRIu64",\"checksum\":\"%"PRIu64"\",\"total_lo\":\"%"PRIu64"\",\"total_hi\":\"%"PRIu64"\",\"version\":%"PRIu64",\"events\":%"PRIu64",\"event_hash\":\"%"PRIu64"\",\"state_hash\":\"%"PRIu64"\",\"statuses\":[%"PRIu64",%"PRIu64",%"PRIu64",%"PRIu64"]}\n",seconds,steps,check,lo,hi,st_version(s),st_event_count(s),st_event_hash(s),state_hash,counts[0],counts[1],counts[2],counts[3]);st_free(s);return 0;
}
