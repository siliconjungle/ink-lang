//! Literal host observation selection from an already checked representation.
//! Observer construction and demand reduction belong to knowledge producers.
use crate::{logic::Declaration, representation::CheckedRepresentation, LangResult};
use std::collections::BTreeMap;

/// Select an admitted compact observer, or the complete original observer.
/// This adapter neither synthesises declarations nor drops fields from a body.
pub fn host_observers(
    checked: &CheckedRepresentation,
) -> LangResult<(BTreeMap<String, Declaration>, BTreeMap<String, String>)> {
    Ok((
        BTreeMap::new(),
        checked
            .plan()
            .actions
            .iter()
            .map(|(name, action)| {
                (
                    name.clone(),
                    action
                        .compact
                        .as_ref()
                        .map_or_else(|| action.observe.clone(), |compact| compact.observe.clone()),
                )
            })
            .collect(),
    ))
}
