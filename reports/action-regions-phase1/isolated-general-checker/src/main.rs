fn main() {
 let args: Vec<String> = std::env::args().collect();
 if args.len()!=3 || args[1]!="verify-library" { std::process::exit(2); }
 match verified_language::library::load(std::path::Path::new(&args[2])) {
  Ok(library) => println!("checked {} entries with isolated ink-core",library.closure.len()),
  Err(e) => { eprintln!("{e}"); std::process::exit(1); }
 }
}
