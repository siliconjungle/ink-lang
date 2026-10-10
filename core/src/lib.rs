pub mod action_ir;
mod action_semantic;
mod action_types;
pub mod action_values;
pub mod aggregate;
pub mod bitproof;
pub mod check;
pub mod core;
pub mod definition;
pub mod effect_model;
pub mod effects;
pub mod equality;
pub mod eval;
pub mod exact_maintenance;
pub mod implementation;
pub mod knowledge;
pub mod laws;
pub mod library;
pub mod logic;
pub mod machine;
pub mod optimisation;
pub mod registry;
pub mod routing;
pub mod row_model;
pub mod semantic;
pub mod snapshot;
pub mod snapshot_wire;
pub mod source_routing;
pub mod source_syntax;
pub mod source_values;
pub mod statecheck;
pub mod stateful;
pub mod storage;
pub mod syntax;
pub mod table_maintenance;
pub mod transaction;
pub mod transaction_model;

pub type LangResult<T> = Result<T, String>;

/// Shared reference wire codec used verbatim by external generated runtimes.
pub const SNAPSHOT_WIRE_RUST_SOURCE: &str = include_str!("snapshot_wire.rs");

/// Fixed transaction boundary used verbatim by generated stateful runtimes.
pub const TRANSACTION_RUST_SOURCE: &str = include_str!("transaction.rs");

pub mod compute_values;
