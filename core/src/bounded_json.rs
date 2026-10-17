//! Bound complete envelopes separately from independently checked JSON fields.
//! No private serde JSON tokens or changes to ordinary JSON value meanings.
use serde::{
    de::{DeserializeOwned, DeserializeSeed, Error, MapAccess, SeqAccess, Visitor},
    Deserialize, Deserializer,
};
use serde_json::Value;
use std::collections::BTreeMap;
use std::fmt;

pub(crate) fn decode<T: DeserializeOwned>(bytes: &[u8]) -> Result<T, String> {
    if bytes.len() > crate::registry::MAX_VIEW_BYTES {
        return Err("source packet byte limit".into());
    }
    let (mut depth, mut quoted, mut escaped) = (0usize, false, false);
    for &byte in bytes {
        if quoted {
            if escaped {
                escaped = false;
            } else if byte == b'\\' {
                escaped = true;
            } else if byte == b'"' {
                quoted = false;
            }
        } else {
            match byte {
                b'"' => quoted = true,
                b'{' | b'[' => {
                    depth += 1;
                    if depth > 256 {
                        return Err("source packet envelope depth limit".into());
                    }
                }
                b'}' | b']' => {
                    depth = depth
                        .checked_sub(1)
                        .ok_or("invalid source packet nesting")?
                }
                _ => {}
            }
        }
    }
    let mut parser = serde_json::Deserializer::from_slice(bytes);
    // The scanner above bounded the whole envelope before deserialization.
    // Value fields below retain a separate 128-level budget; every payload
    // still reaches its ordinary canonical, type and proof checks afterward.
    parser.disable_recursion_limit();
    let value = T::deserialize(&mut parser).map_err(|e| e.to_string())?;
    parser.end().map_err(|e| e.to_string())?;
    Ok(value)
}

struct Seed(usize);
struct Bounded(Value);
impl<'de> DeserializeSeed<'de> for Seed {
    type Value = Value;
    fn deserialize<D: Deserializer<'de>>(self, input: D) -> Result<Value, D::Error> {
        if self.0 >= 128 {
            return Err(D::Error::custom("JSON field depth limit"));
        }
        input.deserialize_any(self)
    }
}
impl<'de> Visitor<'de> for Seed {
    type Value = Value;
    fn expecting(&self, f: &mut fmt::Formatter) -> fmt::Result {
        f.write_str("a bounded JSON value")
    }
    fn visit_bool<E: Error>(self, v: bool) -> Result<Value, E> {
        Ok(Value::Bool(v))
    }
    fn visit_i64<E: Error>(self, v: i64) -> Result<Value, E> {
        Ok(v.into())
    }
    fn visit_u64<E: Error>(self, v: u64) -> Result<Value, E> {
        Ok(v.into())
    }
    fn visit_f64<E: Error>(self, v: f64) -> Result<Value, E> {
        serde_json::Number::from_f64(v)
            .map(Value::Number)
            .ok_or_else(|| E::custom("non-finite JSON number"))
    }
    fn visit_str<E: Error>(self, v: &str) -> Result<Value, E> {
        Ok(v.into())
    }
    fn visit_string<E: Error>(self, v: String) -> Result<Value, E> {
        Ok(Value::String(v))
    }
    fn visit_unit<E: Error>(self) -> Result<Value, E> {
        Ok(Value::Null)
    }
    fn visit_none<E: Error>(self) -> Result<Value, E> {
        Ok(Value::Null)
    }
    fn visit_some<D: Deserializer<'de>>(self, input: D) -> Result<Value, D::Error> {
        self.deserialize(input)
    }
    fn visit_seq<A: SeqAccess<'de>>(self, mut input: A) -> Result<Value, A::Error> {
        let mut values = Vec::new();
        while let Some(value) = input.next_element_seed(Seed(self.0 + 1))? {
            values.push(value);
        }
        Ok(Value::Array(values))
    }
    fn visit_map<A: MapAccess<'de>>(self, mut input: A) -> Result<Value, A::Error> {
        let mut values = serde_json::Map::new();
        while let Some(name) = input.next_key::<String>()? {
            values.insert(name, input.next_value_seed(Seed(self.0 + 1))?);
        }
        Ok(Value::Object(values))
    }
}
impl<'de> Deserialize<'de> for Bounded {
    fn deserialize<D: Deserializer<'de>>(input: D) -> Result<Self, D::Error> {
        Seed(0).deserialize(input).map(Self)
    }
}

pub(crate) fn value<'de, D: Deserializer<'de>>(input: D) -> Result<Value, D::Error> {
    Seed(0).deserialize(input)
}
pub(crate) fn values<'de, D: Deserializer<'de>>(input: D) -> Result<Vec<Value>, D::Error> {
    Vec::<Bounded>::deserialize(input).map(|values| values.into_iter().map(|v| v.0).collect())
}
pub(crate) fn parameters<'de, D: Deserializer<'de>>(
    input: D,
) -> Result<BTreeMap<String, Value>, D::Error> {
    BTreeMap::<String, Bounded>::deserialize(input)
        .map(|values| values.into_iter().map(|(k, v)| (k, v.0)).collect())
}
