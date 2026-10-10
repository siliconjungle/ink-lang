fn main() {
    println!("cargo:rerun-if-changed=cpu.c");
    cc::Build::new()
        .file("cpu.c")
        .opt_level(3)
        .flag_if_supported("-std=c11")
        .compile("ink_cpu");
}
