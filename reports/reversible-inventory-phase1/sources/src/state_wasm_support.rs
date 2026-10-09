// Appended verbatim to generated applications. This is a host ABI, not an optimiser.
#[cfg(target_arch = "wasm32")]
mod state_wasm {
    use super::*;
    use std::cell::RefCell;
    const MAX_BUFFER: usize = 64 * 1024 * 1024;
    const MAX_TOTAL: usize = 128 * 1024 * 1024;
    const MAX_JSON: usize = 4 * 1024 * 1024;
    const MAX_BUFFERS: usize = 256;
    const MAX_STATES: usize = 128;
    struct Registry {
        next: u32,
        states: BTreeMap<u32, State>,
        buffers: BTreeMap<u32, Vec<u8>>,
        bytes: usize,
        error: String,
    }
    impl Registry {
        fn new() -> Self {
            Self {
                next: 0,
                states: BTreeMap::new(),
                buffers: BTreeMap::new(),
                bytes: 0,
                error: String::new(),
            }
        }
        fn id(&mut self) -> Result<u32, String> {
            self.next = self
                .next
                .checked_add(1)
                .ok_or("ABI handle sequence exhausted")?;
            Ok(self.next)
        }
        fn fail(&mut self, error: impl Into<String>) -> u32 {
            self.error = error.into();
            0
        }
        fn insert_buffer(&mut self, bytes: Vec<u8>) -> Result<u32, String> {
            if bytes.len() > MAX_BUFFER
                || self.buffers.len() >= MAX_BUFFERS
                || self
                    .bytes
                    .checked_add(bytes.len())
                    .is_none_or(|n| n > MAX_TOTAL)
            {
                return Err("ABI buffer limit".into());
            }
            let id = self.id()?;
            self.bytes += bytes.len();
            self.buffers.insert(id, bytes);
            Ok(id)
        }
        fn reserve_output(&mut self) -> Result<u32, String> {
            // Reserve an output slot and enough accounting space before a change.
            if self
                .bytes
                .checked_add(MAX_BUFFER)
                .is_none_or(|n| n > MAX_TOTAL)
            {
                return Err("ABI output capacity unavailable".into());
            }
            self.insert_buffer(Vec::new())
        }
        fn finish(&mut self, id: u32, bytes: Vec<u8>) -> u32 {
            self.bytes += bytes.len();
            *self.buffers.get_mut(&id).expect("reserved output slot") = bytes;
            id
        }
        fn envelope(&mut self, id: u32, result: Result<Json, String>, committed: bool) -> u32 {
            let payload = match result {
                Ok(value) => serde_json::json!({"ok":value}),
                Err(message) => {
                    serde_json::json!({"error":{"message":message,"committed":committed}})
                }
            };
            let mut bytes = serde_json::to_vec(&payload).expect("JSON value serialization");
            if bytes.len() > MAX_BUFFER {
                bytes=serde_json::to_vec(&serde_json::json!({"error":{"message":"ABI response exceeds 64 MiB","committed":committed}})).expect("JSON error serialization");
            }
            self.finish(id, bytes)
        }
    }
    thread_local! {static REGISTRY:RefCell<Registry>=RefCell::new(Registry::new());}
    #[no_mangle]
    pub extern "C" fn lang_abi_version() -> u32 {
        1
    }
    #[no_mangle]
    pub extern "C" fn lang_buffer_alloc(length: u32) -> u32 {
        REGISTRY.with(|r| {
            let mut r = r.borrow_mut();
            let length = length as usize;
            if length > MAX_BUFFER
                || r.buffers.len() >= MAX_BUFFERS
                || r.bytes.checked_add(length).is_none_or(|n| n > MAX_TOTAL)
            {
                return r.fail("ABI buffer limit");
            }
            match r.insert_buffer(vec![0; length]) {
                Ok(id) => id,
                Err(e) => r.fail(e),
            }
        })
    }
    #[no_mangle]
    pub extern "C" fn lang_buffer_ptr(handle: u32) -> u32 {
        REGISTRY.with(|r| {
            let mut r = r.borrow_mut();
            match r.buffers.get(&handle) {
                Some(bytes) => bytes.as_ptr() as u32,
                None => r.fail("unknown buffer handle"),
            }
        })
    }
    #[no_mangle]
    pub extern "C" fn lang_buffer_len(handle: u32) -> u32 {
        REGISTRY.with(|r| {
            let mut r = r.borrow_mut();
            match r.buffers.get(&handle) {
                Some(bytes) => bytes.len() as u32,
                None => r.fail("unknown buffer handle"),
            }
        })
    }
    #[no_mangle]
    pub extern "C" fn lang_buffer_free(handle: u32) -> u32 {
        REGISTRY.with(|r| {
            let mut r = r.borrow_mut();
            match r.buffers.remove(&handle) {
                Some(bytes) => {
                    r.bytes -= bytes.len();
                    1
                }
                None => r.fail("unknown buffer handle"),
            }
        })
    }
    #[no_mangle]
    pub extern "C" fn lang_error() -> u32 {
        REGISTRY.with(|r| {
            let mut r = r.borrow_mut();
            let bytes = r.error.as_bytes().to_vec();
            match r.insert_buffer(bytes) {
                Ok(id) => id,
                Err(_) => 0,
            }
        })
    }
    #[no_mangle]
    pub extern "C" fn lang_init() -> u32 {
        REGISTRY.with(|r| {
            let mut r = r.borrow_mut();
            if r.states.len() >= MAX_STATES {
                return r.fail("ABI state handle limit");
            }
            match r.id() {
                Ok(id) => {
                    r.states.insert(id, State::new());
                    id
                }
                Err(e) => r.fail(e),
            }
        })
    }
    #[no_mangle]
    pub extern "C" fn lang_state_drop(handle: u32) -> u32 {
        REGISTRY.with(|r| {
            let mut r = r.borrow_mut();
            if r.states.remove(&handle).is_some() {
                1
            } else {
                r.fail("unknown state handle")
            }
        })
    }
    #[no_mangle]
    pub extern "C" fn lang_restore(buffer: u32) -> u32 {
        REGISTRY.with(|r| {
            let mut r = r.borrow_mut();
            if r.states.len() >= MAX_STATES {
                return r.fail("ABI state handle limit");
            }
            let id = match r.id() {
                Ok(id) => id,
                Err(e) => return r.fail(e),
            };
            let Some(bytes) = r.buffers.get(&buffer) else {
                return r.fail("unknown buffer handle");
            };
            match State::restore(bytes) {
                Ok(state) => {
                    r.states.insert(id, state);
                    id
                }
                Err(e) => r.fail(e),
            }
        })
    }
    #[no_mangle]
    pub extern "C" fn lang_checkpoint(state: u32) -> u32 {
        REGISTRY.with(|r| {
            let mut r = r.borrow_mut();
            let id = match r.reserve_output() {
                Ok(id) => id,
                Err(e) => return r.fail(e),
            };
            let result = r
                .states
                .get(&state)
                .ok_or_else(|| "unknown state handle".to_string())
                .and_then(|s| s.checkpoint());
            match result {
                Ok(bytes) => r.finish(id, bytes),
                Err(e) => {
                    r.buffers.remove(&id);
                    r.fail(e)
                }
            }
        })
    }
    #[no_mangle]
    pub extern "C" fn lang_invoke(state: u32, request: u32) -> u32 {
        REGISTRY.with(|r| {
            let mut r = r.borrow_mut();
            let id = match r.reserve_output() {
                Ok(id) => id,
                Err(e) => return r.fail(e),
            };
            let result = (|| -> Result<Json, String> {
                let bytes = r.buffers.get(&request).ok_or("unknown buffer handle")?;
                if bytes.len() > MAX_JSON {
                    return Err("ABI request exceeds 4 MiB".into());
                }
                let message: Json = serde_json::from_slice(bytes).map_err(|e| e.to_string())?;
                let name = message
                    .get("call")
                    .and_then(Json::as_str)
                    .ok_or("request needs call")?;
                let args = message.get("args").ok_or("request needs args")?;
                r.states
                    .get_mut(&state)
                    .ok_or("unknown state handle")?
                    .invoke_json(name, args)
            })();
            let committed = result
                .as_ref()
                .ok()
                .and_then(|v| v.get("committed"))
                .and_then(Json::as_bool)
                .unwrap_or(false);
            r.envelope(id, result, committed)
        })
    }
    #[no_mangle]
    pub extern "C" fn lang_events(state: u32) -> u32 {
        REGISTRY.with(|r| {
            let mut r = r.borrow_mut();
            let id = match r.reserve_output() {
                Ok(id) => id,
                Err(e) => return r.fail(e),
            };
            let result = r
                .states
                .get(&state)
                .ok_or_else(|| "unknown state handle".into())
                .map(|s| Json::Array(s.outbox().iter().map(Event::to_json).collect()));
            r.envelope(id, result, false)
        })
    }
    #[no_mangle]
    pub extern "C" fn lang_acknowledge(state: u32, commit: u64, position: u64) -> u32 {
        REGISTRY.with(|r| {
            let mut r = r.borrow_mut();
            match r.states.get_mut(&state) {
                Some(s) => {
                    s.acknowledge_through(commit, position);
                    1
                }
                None => r.fail("unknown state handle"),
            }
        })
    }
    #[no_mangle]
    pub extern "C" fn lang_version(state: u32) -> u64 {
        REGISTRY.with(|r| {
            let mut r = r.borrow_mut();
            match r.states.get(&state) {
                Some(s) => s.version(),
                None => {
                    r.fail("unknown state handle");
                    0
                }
            }
        })
    }
}
