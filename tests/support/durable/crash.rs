// Fixture copied into a generated crate, not an independent Ink test binary.
use compiled_state::{
    durable::{FileStore, Host, Store},
    State,
};
struct Crash(FileStore);
impl Store for Crash {
    fn load(&mut self) -> Result<Option<(String, Vec<u8>)>, String> {
        self.0.load()
    }
    fn commit(&mut self, expected: Option<&str>, bytes: &[u8]) -> Result<String, String> {
        let _ = self.0.commit(expected, bytes)?;
        std::process::exit(73);
    }
}
fn main() {
    let file = std::env::args().nth(1).unwrap();
    if std::env::args().nth(2).as_deref() == Some("inspect") {
        let host = Host::<State, _>::open(FileStore::open(file).unwrap(), 256).unwrap();
        println!(
            "{}",
            serde_json::to_string(&host.events().unwrap()).unwrap()
        );
        return;
    }
    let mut host = Host::<State, _>::open(Crash(FileStore::open(file).unwrap()), 256).unwrap();
    host.invoke(
        "lost-reply",
        "restock",
        &serde_json::json!(["00000000000000000000000000000001", 5]),
    )
    .unwrap();
    panic!("crash injection did not execute");
}
