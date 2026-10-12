pub mod action_ir;
pub mod action_model;
mod action_semantic;
mod action_types;
pub mod action_values;
pub mod analysis;
pub mod bitproof;
pub mod check;
pub mod collection_facts;
pub mod content;
pub mod core;
pub mod definition;
pub mod definition_context;
pub mod effect_model;
pub mod effects;
pub mod equality;
pub mod eval;
pub mod implementation;
pub mod law_author;
pub mod law_syntax;
pub mod laws;
pub mod library;
pub mod logic;
pub mod machine;
pub mod optimisation;
pub mod parallel;
pub mod recursion;
pub mod registry;
pub mod representation;
pub mod routing;
pub mod semantic;
pub mod snapshot;
pub mod snapshot_wire;
pub mod source_routing;
pub mod source_syntax;
pub mod statecheck;
pub mod stateful;
mod surface;
pub mod syntax;
pub mod transaction;
pub mod transaction_model;
pub mod word;

pub type LangResult<T> = Result<T, String>;

/// Shared reference wire codec used verbatim by external generated runtimes.
pub const SNAPSHOT_WIRE_RUST_SOURCE: &str = include_str!("snapshot_wire.rs");

/// Fixed transaction boundary used verbatim by generated stateful runtimes.
pub const TRANSACTION_RUST_SOURCE: &str = include_str!("transaction.rs");

pub mod compute_values;

pub mod local_collections;
pub mod temporary;

mod owned_semantic;

pub mod value_limits;

pub mod field_projection;
pub mod property;
pub mod physical;
pub mod planning;
pub use action_types::table_argument;
