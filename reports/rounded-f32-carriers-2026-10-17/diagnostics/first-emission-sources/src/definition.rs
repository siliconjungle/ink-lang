//! Literal checked first-order bodies. Iterative evaluation, bounded work and
//! immutable constructor sharing; no optimisation or source-admission rules.
use ink_core::{definition::CheckedDefinition, LangResult};
use serde_json::json;
pub fn lower(checked: &CheckedDefinition) -> LangResult<String> {
    let mut image = json!({"definitions":checked.executable_declarations()?,"exports":checked.exports(),"choices":checked.choices()});
    fn literals(v: &mut serde_json::Value) {
        match v {
            serde_json::Value::Object(m) => {
                if let Some(n) = m.get_mut("U64") {
                    if let Some(x) = n.as_u64() {
                        *n = x.to_string().into();
                    }
                }
                for x in m.values_mut() {
                    literals(x);
                }
            }
            serde_json::Value::Array(xs) => {
                for x in xs {
                    literals(x);
                }
            }
            _ => {}
        }
    }
    literals(&mut image);
    let identity = ink_core::registry::identity(&(
        "ink-sealed-executable-v1",
        checked.bundle_sha256(),
        checked.exports(),
        checked.choices(),
    ))?;
    Ok(format!(
        "export const identity={identity:?};\nconst image={};\n{}",
        serde_json::to_string(&image).map_err(|e| e.to_string())?,
        &(include_str!("definition-f32.mjs.txt").to_owned() + include_str!("definition.mjs.txt"))
    ))
}
