//! Resource bounds for checked source value carriers.
#[derive(Clone, Copy, Debug)]
pub struct Limits {
    pub nodes: usize,
    pub depth: usize,
    pub bytes: usize,
}
impl Default for Limits {
    fn default() -> Self {
        Self {
            nodes: 10_000,
            depth: 128,
            bytes: 1_048_576,
        }
    }
}
