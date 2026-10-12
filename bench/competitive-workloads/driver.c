#define _POSIX_C_SOURCE 200809L
#include <dlfcn.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <assert.h>
#include <lz4.h>
#include <zstd.h>
#define ROUNDS 11
static volatile uint64_t sink;
static double now(void){struct timespec t;clock_gettime(CLOCK_MONOTONIC,&t);return (double)t.tv_sec*1e9+t.tv_nsec;}
static uint32_t rng=104729;
static uint32_t random32(void){rng^=rng<<13;rng^=rng>>17;rng^=rng<<5;return rng;}
typedef struct {
 void *lib;void *(*mesh)(const uint32_t*,size_t,uint32_t,uint32_t);size_t(*mesh_size)(const void*);void(*snapshot)(const void*,uint32_t*);void(*mesh_free)(void*);
 void *(*ecs_new)(size_t,uint32_t);void(*step)(void*);uint32_t(*read)(const void*,size_t);void(*ecs_free)(void*);uintptr_t(*storage)(const void*);
 void *(*encode)(const uint32_t*,size_t);void *(*decode)(const void*,size_t);const uint32_t*(*words)(const void*);size_t(*size)(const void*);void *(*adaptive_enc)(const uint32_t*,size_t);void *(*adaptive_dec)(const void*,size_t);void(*free_words)(void*);
} API;
static API load(const char *path){API a={0};a.lib=dlopen(path,RTLD_NOW|RTLD_LOCAL);if(!a.lib){fprintf(stderr,"%s\n",dlerror());exit(1);}
#define SYM(field,name) a.field=dlsym(a.lib,name);assert(a.field)
 SYM(mesh,"mesh_run");SYM(mesh_size,"mesh_size");SYM(snapshot,"mesh_snapshot");SYM(mesh_free,"mesh_free");SYM(ecs_new,"ink_ecs_new");SYM(step,"ink_ecs_step");SYM(read,"ink_ecs_read");SYM(ecs_free,"ink_ecs_free");SYM(storage,"ink_ecs_storage");SYM(encode,"ink_encode");SYM(decode,"ink_decode");SYM(words,"ink_words");SYM(size,"ink_size");SYM(free_words,"ink_free");SYM(adaptive_enc,"ink_encode_adaptive");SYM(adaptive_dec,"ink_decode_adaptive");return a;}
void *flecs_new(size_t,uint32_t);void flecs_step(void*);uint32_t flecs_read(const void*,size_t);void bench_flecs_free(void*);
static int quadcmp(const void *a,const void *b){const uint32_t*x=a,*y=b;for(int i=0;i<4;i++)if(x[i]!=y[i])return x[i]>y[i]?1:-1;return 0;}
static size_t oracle_mesh(const uint32_t *v,uint32_t s,uint32_t *out){size_t count=0;int64_t offsets[]={-1,1,-(int64_t)s,s,-(int64_t)s*s,(int64_t)s*s};for(uint32_t z=1;z<s-1;z++)for(uint32_t y=1;y<s-1;y++)for(uint32_t x=1;x<s-1;x++){size_t i=(z*s+y)*s+x;if(!v[i])continue;for(uint32_t d=0;d<6;d++)if(!v[i+offsets[d]]){uint32_t q[]={x,y,z,d};memcpy(out+4*count++,q,16);}}return count;}
static void samples(const char *family,const char *pattern,size_t n,const char *variant,const char *phase,const double *values,size_t bytes){printf("{\"family\":\"%s\",\"pattern\":\"%s\",\"n\":%zu,\"variant\":\"%s\",\"phase\":\"%s\",\"output_bytes\":%zu,\"samples_ns\":[",family,pattern,n,variant,phase,bytes);for(int r=0;r<ROUNDS;r++)printf("%s%.3f",r?",":"",values[r]);printf("]}\n");}
static void meshes(API *a){const char*patterns[]={"empty","solid","checkerboard","terrain","sparse"};for(uint32_t s0=16;s0<=32;s0*=2)for(int pattern=0;pattern<5;pattern++){
 uint32_t s=s0+2;size_t n=(size_t)s*s*s;uint32_t *v=calloc(n,4);rng=104729;
 for(uint32_t z=1;z<s-1;z++)for(uint32_t y=1;y<s-1;y++)for(uint32_t x=1;x<s-1;x++){uint32_t value=pattern==1?1:pattern==2?((x+y+z)%2):pattern==3?(y<s/2+(x*z)%5):pattern==4?(random32()%19==0):0;v[(z*s+y)*s+x]=value;}
 uint32_t *want=malloc(n*6*16);size_t faces=oracle_mesh(v,s,want);qsort(want,faces,16,quadcmp);
 for(int k=0;k<4;k++){API *api=&a[k==0?0:1];void *out=api->mesh(v,n,s,k==2?2:k==3?1:0);assert(api->mesh_size(out)==faces);uint32_t *got=malloc(faces*16+1);api->snapshot(out,got);qsort(got,faces,16,quadcmp);assert(memcmp(want,got,faces*16)==0);free(got);api->mesh_free(out);}
 double ts[4][ROUNDS];int reps=pattern==2?5:20;
 for(int round=-1;round<ROUNDS;round++){int order[]={0,1,2,3};for(int i=3;i>0;i--){int j=random32()%(i+1),tmp=order[j];order[j]=order[i];order[i]=tmp;}for(int o=0;o<4;o++){int k=order[o];API *api=&a[k==0?0:1];double t=now();for(int j=0;j<reps;j++){void*out=api->mesh(v,n,s,k==2?2:k==3?1:0);sink+=api->mesh_size(out);api->mesh_free(out);}if(round>=0)ts[k][round]=(now()-t)/reps;}}
 for(int k=0;k<4;k++)samples("voxel_faces",patterns[pattern],s0,k==0?"ink_before":k==1?"ink":k==2?"block_mesh":"ink_linear","lifecycle",ts[k],faces*(k==2?12:16));free(want);free(v);
}}
static void systems(API *a){for(size_t n=1024;n<=65536;n*=8){API variants[5]={a[0],a[1],a[1],{0},{0}};variants[3].ecs_new=flecs_new;variants[3].step=flecs_step;variants[3].read=flecs_read;variants[3].ecs_free=bench_flecs_free;variants[4]=variants[3];
 const char *names[]={"ink_before","ink","ink_owned_map","flecs","flecs_bulk"};double steady[5][ROUNDS],life[5][ROUNDS];size_t steps=128;
 for(int k=0;k<5;k++){API *api=&variants[k];void*w=api->ecs_new(n,k==2||k==4?2:k==3?1:0);size_t reused=0;for(int j=0;j<3;j++){uintptr_t before=api->storage?api->storage(w):0;api->step(w);if(api->storage&&api->storage(w)==before)reused++;}if(api->storage)printf("{\"observation\":\"ecs_allocation_reuse\",\"variant\":\"%s\",\"n\":%zu,\"steps\":3,\"reused\":%zu}\n",names[k],n,reused);for(size_t i=0;i<n;i++)assert(api->read(w,i)==(uint32_t)i+3*(uint32_t)(i%7));api->ecs_free(w);}
 for(int round=-1;round<ROUNDS;round++){int order[]={0,1,2,3,4};for(int i=4;i>0;i--){int j=random32()%(i+1),tmp=order[j];order[j]=order[i];order[i]=tmp;}for(int o=0;o<5;o++){int k=order[o];API *api=&variants[k];double t=now();void*w=api->ecs_new(n,k==2||k==4?2:k==3?1:0);double begin=now();for(size_t j=0;j<steps;j++)api->step(w);double end=now();for(size_t i=0;i<n;i++)assert(api->read(w,i)==(uint32_t)i+(uint32_t)steps*(uint32_t)(i%7));sink+=api->read(w,n/2);double destroy=now();api->ecs_free(w);double done=now();if(round>=0){steady[k][round]=(end-begin)/steps;life[k][round]=(end-t)+(done-destroy);}}}
 for(int k=0;k<5;k++){samples("ecs_update","all_entities_pos_vel",n,names[k],"steady_step",steady[k],n*8);samples("ecs_update","all_entities_pos_vel",n,names[k],"lifecycle_128_steps",life[k],n*8);}
}}
static void codecs(API *a){const char *patterns[]={"uniform","runs_16","terrain_columns","random"};for(size_t n=4096;n<=65536;n*=16)for(int pattern=0;pattern<4;pattern++){
 uint32_t*xs=malloc(n*4);rng=104729;for(size_t i=0;i<n;i++)xs[i]=pattern==0?7:pattern==1?(uint32_t)(i/(n/16)):pattern==2?(uint32_t)((i%64)<(16+(i/64)%32)):random32();
 API codec_api[5]={a[0],a[1],a[1],a[1],a[1]};codec_api[4].encode=a[1].adaptive_enc;codec_api[4].decode=a[1].adaptive_dec;void*words[5]={0};char*packed[2];size_t sizes[5];
 for(int k=0;k<5;k++){if(k==2||k==3)continue;API *api=&codec_api[k];words[k]=api->encode(xs,n);sizes[k]=api->size(words[k]);void*out=api->decode(words[k],n);assert(api->size(out)==n*4&&memcmp(api->words(out),xs,n*4)==0);api->free_words(out);}
 packed[0]=malloc(LZ4_compressBound(n*4));int lsize=LZ4_compress_default((char*)xs,packed[0],n*4,LZ4_compressBound(n*4));assert(lsize>0);sizes[2]=lsize;
 packed[1]=malloc(ZSTD_compressBound(n*4));sizes[3]=ZSTD_compress(packed[1],ZSTD_compressBound(n*4),xs,n*4,1);assert(!ZSTD_isError(sizes[3]));
 char*check=malloc(n*4);assert(LZ4_decompress_safe(packed[0],check,sizes[2],n*4)==n*4&&memcmp(check,xs,n*4)==0);assert(ZSTD_decompress(check,n*4,packed[1],sizes[3])==n*4&&memcmp(check,xs,n*4)==0);free(check);
 double enc[5][ROUNDS],dec[5][ROUNDS];int reps=32;
 for(int round=-1;round<ROUNDS;round++){int order[]={0,1,2,3,4};for(int i=4;i>0;i--){int j=random32()%(i+1),tmp=order[j];order[j]=order[i];order[i]=tmp;}for(int o=0;o<5;o++){int k=order[o];double t=now();for(int j=0;j<reps;j++){
 if(k<2||k==4){API *api=&codec_api[k];void*out=api->encode(xs,n);sink+=api->size(out);api->free_words(out);}else{char*input=malloc(n*4);memcpy(input,xs,n*4);size_t cap=k==2?(size_t)LZ4_compressBound(n*4):ZSTD_compressBound(n*4);char*out=malloc(cap);size_t result=k==2?(size_t)LZ4_compress_default(input,out,n*4,cap):ZSTD_compress(out,cap,input,n*4,1);sink+=result;free(input);free(out);}}
 double mid=now();for(int j=0;j<reps;j++){if(k<2||k==4){API *api=&codec_api[k];void*out=api->decode(words[k],n);sink+=api->size(out);api->free_words(out);}else{char*input=malloc(sizes[k]);memcpy(input,packed[k-2],sizes[k]);char*out=malloc(n*4);size_t result=k==2?(size_t)LZ4_decompress_safe(input,out,sizes[k],n*4):ZSTD_decompress(out,n*4,input,sizes[k]);sink+=result;free(input);free(out);}}
 if(round>=0){enc[k][round]=(mid-t)/reps;dec[k][round]=(now()-mid)/reps;}}}
 for(int k=0;k<5;k++){const char*name=k==0?"ink_rle_before":k==1?"ink_rle":k==2?"lz4":k==3?"zstd_level_1":"ink_adaptive";samples("codec",patterns[pattern],n,name,"encode_lifecycle",enc[k],sizes[k]);samples("codec",patterns[pattern],n,name,"decode_lifecycle",dec[k],sizes[k]);}
 for(int k=0;k<5;k++)if(words[k])codec_api[k].free_words(words[k]);for(int k=0;k<2;k++)free(packed[k]);free(xs);
}}
int main(int argc,char**argv){assert(argc==3);API api[]={load(argv[1]),load(argv[2])};meshes(api);systems(api);codecs(api);fprintf(stderr,"validated complete outputs; sink=%llu\n",(unsigned long long)sink);return 0;}
