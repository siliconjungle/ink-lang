//! External storage policy for trusted native Table primitives.
//! Checking a policy is not a formal proof of its Rust implementation.
use crate::{
    aggregate::Certificate,
    syntax::{Program, Type},
    LangResult,
};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
pub const SEMANTICS: &str = "ordered-table-storage-policy-v1";
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum Layout {
    InlineRows,
    Columns,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TableStorage {
    pub layout: Layout,
    /// Stay contiguous until this many rows; promote once when insertion exceeds it.
    /// None keeps contiguous storage. This is an external policy, not a measured selector.
    pub promote_at: Option<usize>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Policy {
    pub schema: u32,
    pub semantics: String,
    pub maintenance_id: Option<String>,
    pub roots: BTreeMap<String, TableStorage>,
}
impl Policy {
    pub fn check(&self, p: &Program, c: Option<&Certificate>) -> LangResult<()> {
        if self.schema != 1
            || self.semantics != SEMANTICS
            || self.roots.is_empty()
            || self.roots.len() > 256
        {
            return Err("unsupported native storage policy".into());
        }
        if let Some(id) = &self.maintenance_id {
            if c.map(|c| &c.id) != Some(id) {
                return Err("storage policy maintenance identity mismatch".into());
            }
        }
        for (name, storage) in &self.roots {
            if !p
                .states
                .iter()
                .any(|s| s.name == *name && matches!(s.ty, Type::Table(..)))
            {
                return Err(format!("storage policy names unknown table {name}"));
            }
            if storage.promote_at.is_some_and(|n| n == 0 || n > 1_000_000) {
                return Err("storage promotion threshold must be 1..1000000".into());
            }
        }
        Ok(())
    }
}
