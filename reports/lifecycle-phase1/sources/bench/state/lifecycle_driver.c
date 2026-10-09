#define _POSIX_C_SOURCE 200809L
#include "api.h"
#include <inttypes.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
typedef struct {uint64_t calls,resizes,requested,live,peak;} ProbeStats;
#ifdef PROFILE_ALLOCATIONS
void st_probe_reset(void);
void st_probe_stats(ProbeStats*);
#else
static void st_probe_reset(void){}
static void st_probe_stats(ProbeStats*s){memset(s,0,sizeof(*s));}
#endif
typedef struct {uint64_t checksum,total_lo,total_hi,version,events,event_hash,state_hash,statuses[4];} Observation;
static uint64_t rng(uint64_t*s){*s^=*s<<13;*s^=*s>>7;*s^=*s<<17;return *s;}
static double now(void){struct timespec t;clock_gettime(CLOCK_MONOTONIC,&t);return (double)t.tv_sec+(double)t.tv_nsec*1e-9;}
static void apply(void*s,uint32_t op,uint64_t key,uint32_t value,Observation*out){uint32_t status=st_apply(s,op,key,value);if(status>3)abort();out->statuses[status]++;out->checksum=out->checksum*1099511628211ULL+status;}
static Observation observe(void*s,uint64_t n,Observation stream){st_total(s,&stream.total_lo,&stream.total_hi);stream.version=st_version(s);stream.events=st_event_count(s);stream.event_hash=st_event_hash(s);stream.state_hash=0;for(uint64_t k=0;k<2*n;k++){uint32_t found=0,v=st_stock(s,k,&found);stream.state_hash=stream.state_hash*1099511628211ULL+v+found;}return stream;}
int main(int argc,char**argv){
 if(argc!=5)return 2;
 uint64_t n=strtoull(argv[1],0,10),steps=strtoull(argv[2],0,10),cycles=strtoull(argv[4],0,10);int bulk=!strcmp(argv[3],"bulk");
 if(n<64||n>1000000||steps<1||steps>10000000||cycles<1||cycles>1000||(!bulk&&strcmp(argv[3],"incremental")))return 2;
#ifdef PROFILE_ALLOCATIONS
 if(cycles!=1)return 2;
#endif
 const char*names[]={"initialization","growth","steady","mixed","clear","final_observation","destruction"};
 double times[7]={0};Observation outcomes[6]={0};ProbeStats memory[7]={0};
 for(uint64_t cycle=0;cycle<cycles;cycle++){
  Observation stream={0},got[6];uint64_t random=123456789;st_probe_reset();double start=now();void*s=st_new(bulk?n:0);
  if(!bulk)for(uint64_t k=0;k<64;k++){if(st_apply(s,0,k,k%10)!=0)abort();}
  times[0]+=now()-start;got[0]=observe(s,n,stream);st_probe_stats(&memory[0]);
  start=now();if(!bulk)for(uint64_t k=64;k<n;k++){if(st_apply(s,0,k,k%10)!=0)abort();}
  times[1]+=now()-start;got[1]=observe(s,n,stream);st_probe_stats(&memory[1]);
  start=now();for(uint64_t i=0;i<steps;i++)apply(s,1,rng(&random)%n,1,&stream);
  times[2]+=now()-start;got[2]=observe(s,n,stream);st_probe_stats(&memory[2]);
  start=now();for(uint64_t i=0;i<steps;i++){
   uint64_t r=rng(&random),key=r%(2*n);uint32_t op=1,value=1;
   switch((r>>32)%10){case 0:case 1:op=0;value=(uint32_t)(r%1024);break;case 2:op=2;break;case 3:case 4:op=3;break;case 5:value=UINT32_MAX;break;default:break;}
   apply(s,op,key,value,&stream);
  }
  times[3]+=now()-start;got[3]=observe(s,n,stream);st_probe_stats(&memory[3]);
  start=now();for(uint64_t k=0;k<2*n;k++)apply(s,2,k,0,&stream);
  times[4]+=now()-start;got[4]=observe(s,n,stream);st_probe_stats(&memory[4]);
  start=now();got[5]=observe(s,n,stream);times[5]+=now()-start;st_probe_stats(&memory[5]);
  start=now();st_free(s);times[6]+=now()-start;st_probe_stats(&memory[6]);
#ifdef PROFILE_ALLOCATIONS
  if(memory[6].live)abort();
#endif
  if(cycle==0)memcpy(outcomes,got,sizeof(got));else if(memcmp(outcomes,got,sizeof(got)))abort();
 }
 double total=0;for(int i=0;i<7;i++)total+=times[i];
 printf("{\"rows\":%"PRIu64",\"steps\":%"PRIu64",\"cycles\":%"PRIu64",\"initialization\":\"%s\",\"seconds\":%.12f,\"phases\":[",n,steps,cycles,argv[3],total);
 for(int i=0;i<7;i++){ProbeStats*m=&memory[i];printf("%s{\"name\":\"%s\",\"seconds\":%.12f,\"allocation_calls\":%"PRIu64",\"reallocations\":%"PRIu64",\"requested_bytes\":%"PRIu64",\"live_bytes\":%"PRIu64",\"peak_bytes\":%"PRIu64,i?",":"",names[i],times[i],m->calls,m->resizes,m->requested,m->live,m->peak);
  if(i<6){Observation*o=&outcomes[i];printf(",\"observation\":{\"checksum\":\"%"PRIu64"\",\"total_lo\":\"%"PRIu64"\",\"total_hi\":\"%"PRIu64"\",\"version\":%"PRIu64",\"events\":%"PRIu64",\"event_hash\":\"%"PRIu64"\",\"state_hash\":\"%"PRIu64"\",\"statuses\":[%"PRIu64",%"PRIu64",%"PRIu64",%"PRIu64"]}",o->checksum,o->total_lo,o->total_hi,o->version,o->events,o->event_hash,o->state_hash,o->statuses[0],o->statuses[1],o->statuses[2],o->statuses[3]);}printf("}");
 }printf("]}\n");return 0;
}
