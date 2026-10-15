fn main(){if std::env::var("TARGET").unwrap().starts_with("wasm32"){println!("cargo:rustc-link-arg=-zstack-size=8388608");}}
