#include <entt/entt.hpp>
#include "flecs.h"
#include <algorithm>
#include <cassert>
#include <chrono>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <dlfcn.h>
#include <vector>
using U=uint32_t;
struct Command {U kind,slot,generation,value;};
static_assert(sizeof(Command)==4*sizeof(U));
struct Position {U value;};struct Velocity {U value;};
using Run=size_t(*)(U,const U*,size_t,U*,size_t);
struct Slot {U generation=0,pos=0,vel=0;bool alive=false,has_pos=false,has_vel=false;};
static size_t snapshot(const std::vector<Slot>&slots,U*out){
 size_t at=0;for(auto&s:slots)out[at++]=s.generation;
 size_t count=at++;out[count]=0;std::vector<U>query;
 for(U i=0;i<slots.size();i++){auto&s=slots[i];if(s.alive){out[count]++;out[at++]=i;out[at++]=s.generation;out[at++]=s.has_pos?s.pos:0;out[at++]=s.has_vel?s.vel:0;out[at++]=s.has_pos;out[at++]=s.has_vel;if(s.has_pos&&s.has_vel)query.push_back(i);}}
 out[at++]=U(query.size());for(U i:query)out[at++]=i;return at;
}
__attribute__((noinline)) size_t slots_run(U n,const U*raw,size_t count,U*out,size_t){
 const auto*ptr=reinterpret_cast<const Command*>(raw);std::vector<Command>commands(ptr,ptr+count);std::vector<Slot>slots(n);
 for(auto c:commands){
  if(c.kind==6){for(auto&s:slots)if(s.alive&&s.has_pos&&s.has_vel)s.pos+=s.vel;continue;}
  if(c.slot>=n)continue;auto&s=slots[c.slot];if(c.generation!=s.generation)continue;
  if(c.kind==0){if(!s.alive){s.alive=true;s.has_pos=s.has_vel=false;s.pos=s.vel=0;}}else if(s.alive){
   switch(c.kind){case 1:s.alive=false;s.generation++;break;case 2:s.pos=c.value;s.has_pos=true;break;case 3:s.vel=c.value;s.has_vel=true;break;case 4:s.has_pos=false;break;case 5:s.has_vel=false;break;}
  }
 }
 return snapshot(slots,out);
}
struct PackedRow {U slot,generation,pos,vel;bool has_pos,has_vel;};
__attribute__((noinline)) size_t packed_run(U n,const U*raw,size_t count,U*out,size_t){
 const auto*ptr=reinterpret_cast<const Command*>(raw);std::vector<Command>commands(ptr,ptr+count);
 std::vector<U>slots(n,0),generations(n,0);std::vector<PackedRow>packed;
 for(auto c:commands){
  if(c.kind==6){for(auto&r:packed)if(r.has_pos&&r.has_vel)r.pos+=r.vel;continue;}
  if(c.slot>=n||c.generation!=generations[c.slot])continue;U encoded=slots[c.slot];
  if(c.kind==0){if(!encoded){packed.push_back({c.slot,c.generation,0,0,false,false});slots[c.slot]=U(packed.size());}}else if(encoded){
   U index=encoded-1;auto&r=packed[index];switch(c.kind){
    case 1:{auto last=packed.back();packed[index]=last;packed.pop_back();slots[last.slot]=encoded;slots[c.slot]=0;generations[c.slot]++;break;}
    case 2:r.pos=c.value;r.has_pos=true;break;case 3:r.vel=c.value;r.has_vel=true;break;
    case 4:r.pos=0;r.has_pos=false;break;case 5:r.vel=0;r.has_vel=false;break;
   }
  }
 }
 std::vector<PackedRow>rows;std::vector<U>query;
 for(U i=0;i<n;i++)if(slots[i]){auto&r=packed[slots[i]-1];rows.push_back(r);if(r.has_pos&&r.has_vel)query.push_back(i);}
 size_t at=0;for(auto g:generations)out[at++]=g;out[at++]=U(rows.size());
 for(auto&r:rows){out[at++]=r.slot;out[at++]=r.generation;out[at++]=r.pos;out[at++]=r.vel;out[at++]=r.has_pos;out[at++]=r.has_vel;}
 out[at++]=U(query.size());for(U i:query)out[at++]=i;return at;
}
__attribute__((noinline)) size_t indexed_run(U n,const U*raw,size_t count,U*out,size_t){
 const auto*ptr=reinterpret_cast<const Command*>(raw);std::vector<Command>commands(ptr,ptr+count);
 std::vector<U>slots(n,0),generations(n,0);std::vector<PackedRow>packed;std::vector<U>matching,membership(n,0);
 auto maintain=[&](U slot,bool present){U member=membership[slot];
  if(present){if(!member){matching.push_back(slot);membership[slot]=U(matching.size());}}
  else if(member){U last=matching.back();matching[member-1]=last;matching.pop_back();membership[last]=member;membership[slot]=0;}
 };
 for(auto c:commands){
  if(c.kind==6){for(U slot:matching){auto&r=packed[slots[slot]-1];if(r.has_pos&&r.has_vel)r.pos+=r.vel;}continue;}
  if(c.slot>=n||c.generation!=generations[c.slot])continue;U encoded=slots[c.slot];
  if(c.kind==0){if(!encoded){packed.push_back({c.slot,c.generation,0,0,false,false});slots[c.slot]=U(packed.size());}}else if(encoded){
   U index=encoded-1;auto&r=packed[index];switch(c.kind){
    case 1:{maintain(c.slot,false);auto last=packed.back();packed[index]=last;packed.pop_back();slots[last.slot]=encoded;slots[c.slot]=0;generations[c.slot]++;break;}
    case 2:r.pos=c.value;r.has_pos=true;maintain(c.slot,r.has_pos&&r.has_vel);break;case 3:r.vel=c.value;r.has_vel=true;maintain(c.slot,r.has_pos&&r.has_vel);break;
    case 4:r.pos=0;r.has_pos=false;maintain(c.slot,false);break;case 5:r.vel=0;r.has_vel=false;maintain(c.slot,false);break;
   }
  }
 }
 std::vector<PackedRow>rows;std::vector<U>query;
 for(U i=0;i<n;i++)if(slots[i]){auto&r=packed[slots[i]-1];rows.push_back(r);if(r.has_pos&&r.has_vel)query.push_back(i);}
 size_t at=0;for(auto g:generations)out[at++]=g;out[at++]=U(rows.size());
 for(auto&r:rows){out[at++]=r.slot;out[at++]=r.generation;out[at++]=r.pos;out[at++]=r.vel;out[at++]=r.has_pos;out[at++]=r.has_vel;}
 out[at++]=U(query.size());for(U i:query)out[at++]=i;return at;
}
__attribute__((noinline)) size_t entt_run(U n,const U*raw,size_t count,U*out,size_t){
 const auto*ptr=reinterpret_cast<const Command*>(raw);std::vector<Command>commands(ptr,ptr+count);
 entt::registry world;std::vector<entt::entity>handles(n,entt::null);std::vector<Slot>slots(n);
 for(auto c:commands){
  if(c.kind==6){world.view<Position,Velocity>().each([](Position&p,const Velocity&v){p.value+=v.value;});continue;}
  if(c.slot>=n||c.generation!=slots[c.slot].generation)continue;auto&e=handles[c.slot];
  if(c.kind==0){if(e==entt::null)e=world.create();}else if(e!=entt::null){switch(c.kind){
   case 1:world.destroy(e);e=entt::null;slots[c.slot].generation++;break;
   case 2:world.emplace_or_replace<Position>(e,c.value);break;case 3:world.emplace_or_replace<Velocity>(e,c.value);break;
   case 4:world.remove<Position>(e);break;case 5:world.remove<Velocity>(e);break;
  }}
 }
 for(U i=0;i<n;i++)if(handles[i]!=entt::null){auto&s=slots[i];s.alive=true;if(auto*p=world.try_get<Position>(handles[i])){s.pos=p->value;s.has_pos=true;}if(auto*v=world.try_get<Velocity>(handles[i])){s.vel=v->value;s.has_vel=true;}}
 return snapshot(slots,out);
}
__attribute__((noinline)) size_t flecs_run(U n,const U*raw,size_t count,U*out,size_t){
 const auto*ptr=reinterpret_cast<const Command*>(raw);std::vector<Command>commands(ptr,ptr+count);
 ecs_world_t*world=ecs_mini();ECS_COMPONENT(world,Position);ECS_COMPONENT(world,Velocity);
 auto pos=ecs_id(Position),vel=ecs_id(Velocity);std::vector<ecs_entity_t>handles(n,0);std::vector<Slot>slots(n);
 ecs_query_desc_t desc={};desc.terms[0].id=pos;desc.terms[1].id=vel;desc.terms[1].inout=EcsIn;desc.cache_kind=EcsQueryCacheAuto;
 ecs_query_t*query=ecs_query_init(world,&desc);assert(query);
 for(auto c:commands){
  if(c.kind==6){auto it=ecs_query_iter(world,query);while(ecs_query_next(&it)){auto*p=ecs_field(&it,Position,0);auto*v=ecs_field(&it,Velocity,1);for(int32_t i=0;i<it.count;i++)p[i].value+=v[i].value;}continue;}
  if(c.slot>=n||c.generation!=slots[c.slot].generation)continue;auto&e=handles[c.slot];
  if(c.kind==0){if(!e)e=ecs_new(world);}else if(e){switch(c.kind){
   case 1:ecs_delete(world,e);e=0;slots[c.slot].generation++;break;
   case 2:{Position p{c.value};ecs_set_id(world,e,pos,sizeof(p),&p);break;}
   case 3:{Velocity v{c.value};ecs_set_id(world,e,vel,sizeof(v),&v);break;}
   case 4:ecs_remove_id(world,e,pos);break;case 5:ecs_remove_id(world,e,vel);break;
  }}
 }
 for(U i=0;i<n;i++)if(handles[i]){auto&s=slots[i];s.alive=true;if(auto*p=static_cast<const Position*>(ecs_get_id(world,handles[i],pos))){s.pos=p->value;s.has_pos=true;}if(auto*v=static_cast<const Velocity*>(ecs_get_id(world,handles[i],vel))){s.vel=v->value;s.has_vel=true;}}
 auto size=snapshot(slots,out);ecs_query_fini(query);ecs_fini(world);return size;
}
std::vector<Command> history(U n,U pattern){
 std::vector<Command>commands;std::vector<U>generations(n,0);
 for(U i=0;i<n;i++){commands.push_back({0,i,0,0});commands.push_back({2,i,0,UINT32_MAX-i});if((pattern!=1&&pattern!=3)||i%16==0)commands.push_back({3,i,0,i%7+1});}
 for(U step=0;step<(pattern==3?256:16);step++){
  commands.push_back({6,0,0,0});
  if(pattern==2)for(U j=0;j<n/16+1;j++){
   U i=(j*17+step*97)%n;U g=generations[i];
   commands.push_back({1,i,g,0});commands.push_back({2,i,g,99});g++;generations[i]=g;
   commands.push_back({0,i,g,0});commands.push_back({2,i,g,step+j});commands.push_back({3,i,g,UINT32_MAX-j});
   if(j%2==0)commands.push_back({5,i,g,0});
  }
 }
 return commands;
}
int main(int argc,char**argv){
 assert(argc==2);void*lib=dlopen(argv[1],RTLD_NOW|RTLD_LOCAL);if(!lib){std::fprintf(stderr,"%s\n",dlerror());return 1;}
 Run ink=reinterpret_cast<Run>(dlsym(lib,"ink_ecs_run"));assert(ink);
 Run indexed=reinterpret_cast<Run>(dlsym(lib,"ink_ecs_indexed"));assert(indexed);
 Run runs[]={ink,indexed,slots_run,packed_run,indexed_run,entt_run,flecs_run};const char*names[]={"ink","ink_indexed","slot_oracle","packed_control","indexed_control","entt","flecs"};
 for(U n:{16,1024,16384})for(U pattern=0;pattern<4;pattern++){
  auto commands=history(n,pattern);std::vector<U>expected(n*9+2),out(n*9+2);auto raw=reinterpret_cast<const U*>(commands.data());
  size_t size=slots_run(n,raw,commands.size(),expected.data(),expected.size());
  for(auto run:runs){assert(run(n,raw,commands.size(),out.data(),out.size())==size);assert(std::equal(out.begin(),out.begin()+size,expected.begin()));}
  // Preflight every short prefix catches stale handle or deletion corruption.
  if(n==16)for(size_t end=0;end<=commands.size();end++){
   auto want=slots_run(n,raw,end,expected.data(),expected.size());
   for(auto run:runs){assert(run(n,raw,end,out.data(),out.size())==want);assert(std::equal(out.begin(),out.begin()+want,expected.begin()));}
  }
  size=slots_run(n,raw,commands.size(),expected.data(),expected.size());
  std::vector<double>samples[7];
  for(U round=0;round<14;round++)for(U offset=0;offset<7;offset++){
   U k=(offset+round)%7;if((round/7)%2)k=6-k;Run run=runs[k];U iterations=n<100?20:(n<2000?5:2);
   auto start=std::chrono::steady_clock::now();for(U i=0;i<iterations;i++){auto len=run(n,raw,commands.size(),out.data(),out.size());asm volatile("" : : "r"(out.data()),"r"(len) : "memory");}
   double elapsed=std::chrono::duration<double,std::nano>(std::chrono::steady_clock::now()-start).count()/iterations;samples[k].push_back(elapsed);
   assert(run(n,raw,commands.size(),out.data(),out.size())==size);assert(std::equal(out.begin(),out.begin()+size,expected.begin()));
  }
  for(U k=0;k<7;k++){std::printf("{\"variant\":\"%s\",\"capacity\":%u,\"pattern\":%u,\"commands\":%zu,\"output_words\":%zu,\"samples_ns\":[",names[k],n,pattern,commands.size(),size);for(size_t i=0;i<samples[k].size();i++)std::printf("%s%.1f",i?",":"",samples[k][i]);std::puts("]}");}
 }
 dlclose(lib);
}
