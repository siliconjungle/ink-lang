#include "api.h"
#include <map>
#include <vector>
#include <cstdlib>
struct Event {uint64_t commit,position,key;uint32_t before,after;};
struct State {std::map<uint64_t,uint32_t> rows;std::vector<Event> events;uint64_t version=0;__uint128_t total=0;};
extern "C" void *st_new(uint64_t n){auto*s=new State;for(uint64_t i=0;i<n;i++){s->rows.emplace(i,i%10);s->total+=i%10;}s->version=n;return s;}
extern "C" void st_free(void*p){delete static_cast<State*>(p);}
extern "C" uint32_t st_apply(void*p,uint32_t op,uint64_t key,uint32_t value){
 auto&s=*static_cast<State*>(p);auto it=s.rows.lower_bound(key);bool found=it!=s.rows.end()&&it->first==key;
 if(op==3)return found?3:1;
 if(op==0){if(found)return 2;s.rows.emplace_hint(it,key,value);s.total+=value;}
 else if(op==1){if(!found)return 1;uint32_t old=it->second;if(value>UINT32_MAX-old)return 3;it->second+=value;s.total+=value;s.events.push_back({s.version+1,0,key,old,it->second});}
 else if(op==2){if(found){s.total-=it->second;s.rows.erase(it);}}
 else std::abort();s.version++;return 0;
}
extern "C" uint32_t st_stock(void*p,uint64_t key,uint32_t*found){auto&s=*static_cast<State*>(p);auto it=s.rows.find(key);*found=it!=s.rows.end();return *found?it->second:0;}
extern "C" void st_total(void*p,uint64_t*lo,uint64_t*hi){auto t=static_cast<State*>(p)->total;*lo=uint64_t(t);*hi=uint64_t(t>>64);}
extern "C" uint64_t st_version(void*p){return static_cast<State*>(p)->version;}
extern "C" uint64_t st_event_count(void*p){return static_cast<State*>(p)->events.size();}
extern "C" uint64_t st_event_hash(void*p){uint64_t h=0;for(auto&e:static_cast<State*>(p)->events){uint64_t fields[]={e.commit,e.position,e.key,e.before,e.after};for(auto v:fields)h=h*1099511628211ULL^v;}return h;}
