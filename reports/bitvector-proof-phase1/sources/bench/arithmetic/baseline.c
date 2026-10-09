#include <stdbool.h>
#include <stdint.h>
#ifdef __cplusplus
extern "C" {
#endif
uint64_t lang_fn_add_zero(uint64_t x) { return x + UINT64_C(0); }
uint64_t lang_fn_subtract_self(uint64_t x) { return x - x; }
uint64_t lang_fn_add_commute(uint64_t x, uint64_t y) { return x + y; }
uint64_t lang_fn_cancel_add(uint64_t x, uint64_t y) { return (x + y) - y; }
uint64_t lang_fn_multiply_zero(uint64_t x) { return x * UINT64_C(0); }
bool lang_fn_unsigned_reflexive(uint64_t x) { return x <= x; }
bool lang_fn_unsigned_maximum(uint64_t x) { return x <= UINT64_MAX; }
uint64_t lang_fn_choose_equal(uint64_t x, bool b) { return b ? x : x; }
#ifdef __cplusplus
}
#endif
