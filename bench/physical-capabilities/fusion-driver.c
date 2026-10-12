#define _POSIX_C_SOURCE 200809L
#include <dlfcn.h>
#include <time.h>
#include <stdint.h>
#include <stdio.h>
#include <assert.h>
#include <stdlib.h>
#define ROUNDS 11
static volatile uint64_t sink;
static double now(void){struct timespec t;clock_gettime(CLOCK_MONOTONIC,&t);return(double)t.tv_sec*1e9+t.tv_nsec;}
static uint32_t seed=104729;
static uint32_t random32(void){seed^=seed<<13;seed^=seed>>17;seed^=seed<<5;return seed;}
typedef struct{void*(*run)(const uint32_t*,size_t,uint32_t);uint32_t(*get)(const void*,size_t);size_t(*len)(const void*);void(*free)(void*);}API;
static API load(const char*p){void*l=dlopen(p,RTLD_NOW|RTLD_LOCAL);assert(l);return(API){dlsym(l,"pipeline_run"),dlsym(l,"pipeline_get"),dlsym(l,"pipeline_len"),dlsym(l,"pipeline_free")};}
int main(int argc,char**argv){assert(argc==3);API api[]={load(argv[1]),load(argv[2])};for(size_t n=1024;n<=65536;n*=8){uint32_t*xs=malloc(n*4);for(size_t i=0;i<n;i++)xs[i]=random32();for(uint32_t mode=0;mode<2;mode++){uint32_t sum=0;for(size_t i=0;i<n;i++)sum+=xs[i]+(uint32_t)(i%7);for(int k=0;k<2;k++){void*p=api[k].run(xs,n,mode);assert(api[k].len(p)==(mode?1:n));if(mode){assert(api[k].get(p,0)==sum);}else for(size_t i=0;i<n;i++)assert(api[k].get(p,i)==(xs[i]+(uint32_t)(i%7))*2);api[k].free(p);}double ts[2][ROUNDS];for(int r=-1;r<ROUNDS;r++){int first=random32()%2;for(int j=0;j<2;j++){int k=(first+j)%2;double t=now();for(int rep=0;rep<64;rep++){void*p=api[k].run(xs,n,mode);sink+=api[k].get(p,0);api[k].free(p);}if(r>=0)ts[k][r]=(now()-t)/64;}}for(int k=0;k<2;k++){printf("{\"family\":\"%s\",\"n\":%zu,\"variant\":\"%s\",\"samples_ns\":[",mode?"record_map_fold":"record_map_map",n,k?"fused":"baseline");for(int r=0;r<ROUNDS;r++)printf("%s%.3f",r?",":"",ts[k][r]);printf("]}\n");}}free(xs);}return 0;}
