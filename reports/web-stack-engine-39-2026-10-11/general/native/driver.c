#define _POSIX_C_SOURCE 200809L
#include <stdint.h>
#include <stddef.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <inttypes.h>
#include <dlfcn.h>
#ifdef __APPLE__
#include <mach/mach_time.h>
#endif
typedef struct {const uint32_t *data;size_t len;uint64_t scalar;} BenchResult;
typedef BenchResult(*Call)(uint32_t,const uint32_t*,size_t,const uint32_t*,size_t,uint32_t,uint32_t,uint32_t*);
typedef void(*Reset)(void);
#ifdef __APPLE__
static mach_timebase_info_data_t timebase;
static uint64_t ticks(void){return mach_absolute_time();}
static double elapsed(uint64_t start){return (double)(ticks()-start)*timebase.numer/timebase.denom*1e-9;}
#else
static uint64_t ticks(void){struct timespec t;clock_gettime(CLOCK_MONOTONIC,&t);return (uint64_t)t.tv_sec*1000000000+t.tv_nsec;}
static double elapsed(uint64_t start){return (ticks()-start)*1e-9;}
#endif
static uint64_t consume(BenchResult r,int vector,uint32_t *sum,uint32_t *weighted){
 if(!vector)return r.scalar;
 uint32_t s=0,w=0;for(size_t i=0;i<r.len;i++){s+=r.data[i];w+=(uint32_t)(i+1)*r.data[i];}
 *sum=s;*weighted=w;return (uint64_t)s+((uint64_t)w<<32)+(uint64_t)r.len;
}
int main(int argc,char **argv){
 if(argc!=8)return 2;
#ifdef __APPLE__
 mach_timebase_info(&timebase);
#endif
 void *lib=dlopen(argv[1],RTLD_NOW|RTLD_LOCAL);if(!lib){fprintf(stderr,"%s\n",dlerror());return 3;}
 Call call=(Call)dlsym(lib,"bench_call");Reset reset=(Reset)dlsym(lib,"bench_reset");if(!call||!reset)return 4;
 FILE *f=fopen(argv[2],"rb");if(!f)return 5;uint64_t nx,ny;uint32_t seed,k;
 if(fread(&nx,8,1,f)!=1||fread(&ny,8,1,f)!=1||fread(&seed,4,1,f)!=1||fread(&k,4,1,f)!=1)return 6;
 uint32_t *x=malloc((nx?nx:1)*4),*y=malloc((ny?ny:1)*4),*out=malloc((nx+ny+2)*4);
 if(!x||!y||!out||fread(x,4,nx,f)!=nx||fread(y,4,ny,f)!=ny)return 7;fclose(f);
 uint32_t task=(uint32_t)strtoul(argv[3],0,10);int vector=atoi(argv[4]),snapshot=atoi(argv[6]),inputs=atoi(argv[7]);
 uint64_t it=strtoull(argv[5],0,10),acc=0;uint32_t sum=0,weighted=0;size_t output_len=0;
 BenchResult r=call(task,x,nx,y,ny,seed,k,out);uint64_t single=consume(r,vector,&sum,&weighted);output_len=r.len;reset();
 for(int w=0;w<3;w++){r=call(task,x,nx,y,ny,seed,k,out);consume(r,vector,&sum,&weighted);reset();}
 uint64_t start=ticks();
 for(uint64_t i=0;i<it;i++){
  uint32_t *sx=x,*sy=y;
  if(snapshot){sx=malloc((nx?nx:1)*4);memcpy(sx,x,nx*4);if(inputs==2){sy=malloc((ny?ny:1)*4);memcpy(sy,y,ny*4);}}
  r=call(task,sx,nx,sy,ny,seed,k,out);acc+=consume(r,vector,&sum,&weighted);reset();
  if(snapshot){free(sx);if(inputs==2)free(sy);}
 }
 double seconds=elapsed(start);
 if(vector)printf("{\"single\":\"array:%zu:%"PRIu32":%"PRIu32"\",",output_len,sum,weighted);
 else printf("{\"single\":\"%"PRIu64"\",",single);
 printf("\"code\":\"%"PRIu64"\",\"checksum\":\"%"PRIu64"\",\"iterations\":%"PRIu64",\"seconds\":%.12f}\n",single,acc,it,seconds);
 free(x);free(y);free(out);dlclose(lib);return 0;
}
