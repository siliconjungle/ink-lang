#include <stdbool.h>
#include <stdint.h>
uint64_t lang_fn_add_zero(uint64_t);
uint64_t lang_fn_subtract_self(uint64_t);
uint64_t lang_fn_add_commute(uint64_t,uint64_t);
uint64_t lang_fn_cancel_add(uint64_t,uint64_t);
uint64_t lang_fn_multiply_zero(uint64_t);
bool lang_fn_unsigned_reflexive(uint64_t);
bool lang_fn_unsigned_maximum(uint64_t);
uint64_t lang_fn_choose_equal(uint64_t,bool);
#define UNARY(name) uint64_t bench_fn_##name(uint64_t x,uint64_t y){(void)y;return lang_fn_##name(x);}
UNARY(add_zero)
UNARY(subtract_self)
UNARY(multiply_zero)
UNARY(unsigned_reflexive)
UNARY(unsigned_maximum)
uint64_t bench_fn_add_commute(uint64_t x,uint64_t y){return lang_fn_add_commute(x,y);}
uint64_t bench_fn_cancel_add(uint64_t x,uint64_t y){return lang_fn_cancel_add(x,y);}
uint64_t bench_fn_choose_equal(uint64_t x,uint64_t y){return lang_fn_choose_equal(x,(y&1)!=0);}
