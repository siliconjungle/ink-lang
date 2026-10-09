#include <cstdint>
#include <cstddef>
#include <numeric>
using u64=std::uint64_t;
extern "C" {
u64 lang_fn_sum_values(const u64* xs,std::size_t n){return std::accumulate(xs,xs+n,u64{0});}
u64 lang_fn_affine(const u64* xs,std::size_t n,u64 a,u64 b){return std::accumulate(xs,xs+n,u64{0},[=](u64 s,u64 x){return s+x*a+b;});}
u64 lang_fn_squares(const u64* xs,std::size_t n){return std::accumulate(xs,xs+n,u64{0},[](u64 s,u64 x){return s+x*x;});}
u64 lang_fn_filter_sum(const u64* xs,std::size_t n,u64 t){return std::accumulate(xs,xs+n,u64{0},[=](u64 s,u64 x){return s+(x<t?x:0);});}
u64 lang_fn_pipeline(const u64* xs,std::size_t n,u64 a,u64 b,u64 t){return std::accumulate(xs,xs+n,u64{0},[=](u64 s,u64 x){u64 y=x*a+b;return s+(y<t?y*y+7:0);});}
u64 lang_fn_expanded(const u64* xs,std::size_t n){return std::accumulate(xs,xs+n,u64{0},[](u64 s,u64 x){u64 y=x+3;return s+y*y;});}
u64 lang_fn_count_under(const u64* xs,std::size_t n,u64 t){return std::accumulate(xs,xs+n,u64{0},[=](u64 s,u64 x){return s+(x<t);});}
}
