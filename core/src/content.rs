//! Bounded content addressing shared by the current library and canonical store.
use crate::LangResult;
use serde::{Deserialize, Serialize};
use std::{fs::File, io::Read, path::Path};
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Lock {
    pub schema: u32,
    pub semantics: String,
    pub objects: Vec<String>,
}
pub(crate) fn identity(id: &str) -> LangResult<()> {
    if id.len() != 64
        || !id
            .bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
    {
        return Err("invalid knowledge identity".into());
    }
    Ok(())
}
pub(crate) fn read_bounded(path: &Path, limit: usize) -> LangResult<Vec<u8>> {
    let mut bytes = Vec::new();
    File::open(path)
        .map_err(|e| format!("{}: {e}", path.display()))?
        .take(limit as u64 + 1)
        .read_to_end(&mut bytes)
        .map_err(|e| e.to_string())?;
    if bytes.len() > limit {
        return Err("knowledge file exceeds size limit".into());
    }
    Ok(bytes)
}
