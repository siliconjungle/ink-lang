mod definition; use definition::{Value,invoke}; fn main() { assert_eq!(invoke("52776482a4ed88f1811ea2e06a04f9558b250c4b8710de42972a08771e8aaf59", &[Value::U64(0u64)]).unwrap(), Value::U64(1u64));
assert_eq!(invoke("52776482a4ed88f1811ea2e06a04f9558b250c4b8710de42972a08771e8aaf59", &[Value::U64(1u64)]).unwrap(), Value::U64(2u64));
assert_eq!(invoke("52776482a4ed88f1811ea2e06a04f9558b250c4b8710de42972a08771e8aaf59", &[Value::U64(2u64)]).unwrap(), Value::U64(3u64));
assert_eq!(invoke("52776482a4ed88f1811ea2e06a04f9558b250c4b8710de42972a08771e8aaf59", &[Value::U64(18446744073709551615u64)]).unwrap(), Value::U64(0u64));
assert_eq!(invoke("52776482a4ed88f1811ea2e06a04f9558b250c4b8710de42972a08771e8aaf59", &[Value::U64(9223372036854775808u64)]).unwrap(), Value::U64(9223372036854775809u64));
assert_eq!(invoke("52776482a4ed88f1811ea2e06a04f9558b250c4b8710de42972a08771e8aaf59", &[Value::U64(9654226050825949314u64)]).unwrap(), Value::U64(9654226050825949315u64));
 }