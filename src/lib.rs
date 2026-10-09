pub mod aggregate;
pub mod check;
pub mod eval;
pub mod native;
pub mod proof;
pub mod statecheck;
pub mod stateful;
pub mod syntax;

pub type LangResult<T> = Result<T, String>;
