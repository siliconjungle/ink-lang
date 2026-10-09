#ifndef STATE_BENCH_API_H
#define STATE_BENCH_API_H
#include <stdint.h>
#include <stddef.h>
#ifdef __cplusplus
extern "C" {
#endif
void *st_new(uint64_t rows);
void st_free(void *state);
/* op 0=create, 1=restock, 2=remove, 3=aborting transaction.
   result 0=success, 1=missing, 2=exists, 3=overflow. */
uint32_t st_apply(void *state,uint32_t op,uint64_t key,uint32_t value);
uint32_t st_stock(void *state,uint64_t key,uint32_t *found);
void st_total(void *state,uint64_t *lo,uint64_t *hi);
uint64_t st_version(void *state);
uint64_t st_event_count(void *state);
uint64_t st_event_hash(void *state);
#ifdef __cplusplus
}
#endif
#endif
