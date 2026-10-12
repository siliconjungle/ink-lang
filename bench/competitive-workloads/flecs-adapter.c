#include "flecs.h"
#include <stdint.h>
#include <stdlib.h>
#include <string.h>
typedef struct {uint32_t value;} Position,Velocity;
typedef struct {ecs_world_t *world;ecs_query_t *query;ecs_entity_t pos,vel;ecs_entity_t *entities;size_t n;} World;
void *flecs_new(size_t n,uint32_t bulk){
 World *w=calloc(1,sizeof(World));w->n=n;w->world=ecs_mini();
 ECS_COMPONENT(w->world,Position);ECS_COMPONENT(w->world,Velocity);
 w->pos=ecs_id(Position);w->vel=ecs_id(Velocity);w->entities=malloc(n*sizeof(ecs_entity_t));
 if(bulk){
  Position *positions=malloc(n*sizeof(Position));Velocity *velocities=malloc(n*sizeof(Velocity));
  for(size_t i=0;i<n;i++){positions[i].value=(uint32_t)i;velocities[i].value=(uint32_t)(i%7);}
  void *data[]={positions,velocities};const ecs_entity_t *entities=ecs_bulk_init(w->world,&(ecs_bulk_desc_t){.count=(int32_t)n,.ids={w->pos,w->vel},.data=data});
  memcpy(w->entities,entities,n*sizeof(ecs_entity_t));free(positions);free(velocities);
 }else for(size_t i=0;i<n;i++){ecs_entity_t e=ecs_new(w->world);w->entities[i]=e;ecs_set(w->world,e,Position,{(uint32_t)i});ecs_set(w->world,e,Velocity,{(uint32_t)(i%7)});}
 w->query=ecs_query(w->world,{.terms={{.id=w->pos},{.id=w->vel,.inout=EcsIn}},.cache_kind=EcsQueryCacheAuto});
 return w;
}
void flecs_step(void *p){World *w=p;ecs_iter_t it=ecs_query_iter(w->world,w->query);while(ecs_query_next(&it)){Position *pos=ecs_field(&it,Position,0);const Velocity *vel=ecs_field(&it,Velocity,1);for(int32_t i=0;i<it.count;i++)pos[i].value+=vel[i].value;}}
uint32_t flecs_read(const void *p,size_t i){const World *w=p;const Position *v=ecs_get_id(w->world,w->entities[i],w->pos);return v->value;}
void bench_flecs_free(void *p){World *w=p;ecs_query_fini(w->query);ecs_fini(w->world);free(w->entities);free(w);}
