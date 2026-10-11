#ifndef INK_STATE_ABI_H
#define INK_STATE_ABI_H
#include <stdint.h>
#include <stddef.h>
/* Handles belong to the calling thread. Zero means failure; lang_error returns
   an owned UTF-8 error buffer. Buffer pointers remain valid until free. */
uint32_t lang_abi_version(void);
uint32_t lang_init(void);
uint32_t lang_state_drop(uint32_t state);
uint32_t lang_buffer_alloc(uint32_t bytes);
uintptr_t lang_buffer_ptr(uint32_t buffer);
uint32_t lang_buffer_len(uint32_t buffer);
uint32_t lang_buffer_free(uint32_t buffer);
uint32_t lang_error(void);
/* JSON requests: {"call":"action","args":[...]} or {"pure":"fn","args":[...]}.
   Responses: {"ok":...} or {"error":{"message":...,"committed":false}}. */
uint32_t lang_invoke(uint32_t state, uint32_t request);
uint32_t lang_checkpoint(uint32_t state);
uint32_t lang_restore(uint32_t snapshot);
uint32_t lang_events(uint32_t state);
uint32_t lang_acknowledge(uint32_t state, uint64_t commit, uint64_t position);
uint64_t lang_version(uint32_t state);
#endif
