//! Lossless reification of the complete checked module and resolved actions.
//! This binds code data, not the meaning of an interpreter or a replacement.
use crate::{
    action_ir::CheckedActions,
    logic::{Constructor, Context, Declaration, Sort, Term},
    registry::{Bundle, CheckedBundle},
    LangResult,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;
pub const SEMANTICS: &str = "ink-source-syntax-v1";
const MAX_TERMS: usize = 100_000;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Roles {
    pub schema: u32,
    pub semantics: String,
    pub words: String,
    pub fields: String,
    pub node: String,
    pub nodes: String,
    pub image: String,
    pub program: String,
}
fn ctor(id: &str, constructor: usize, arguments: Vec<Term>) -> Term {
    Term::Construct {
        datatype: id.into(),
        constructor,
        arguments,
    }
}
fn datatype(constructors: Vec<(&str, Vec<Sort>)>) -> Declaration {
    Declaration::Datatype {
        constructors: constructors
            .into_iter()
            .map(|(name, fields)| Constructor {
                name: name.into(),
                fields,
            })
            .collect(),
    }
}
/// General syntax grammar, independent of a program's algorithms and layouts.
/// Arrays and fields refer to a flat postorder node table. Trees preserve order
/// with logarithmic nesting; cached left counts are computed, never supplied.
pub fn grammar(r: &Roles) -> Vec<(String, Declaration)> {
    let data = |id: &str| Sort::Data(id.into());
    vec![
        (
            r.words.clone(),
            datatype(vec![
                ("Empty", vec![]),
                ("Word", vec![Sort::U64]),
                ("Branch", vec![Sort::U64, Sort::SelfType, Sort::SelfType]),
            ]),
        ),
        (
            r.fields.clone(),
            datatype(vec![
                ("Empty", vec![]),
                ("Field", vec![Sort::U64, Sort::U64]),
                ("Branch", vec![Sort::U64, Sort::SelfType, Sort::SelfType]),
            ]),
        ),
        (
            r.node.clone(),
            datatype(vec![
                ("Null", vec![]),
                ("Bool", vec![Sort::Bool]),
                ("Number", vec![Sort::U64]),
                ("Text", vec![Sort::U64, data(&r.words)]),
                ("Array", vec![data(&r.words)]),
                ("Object", vec![data(&r.fields)]),
            ]),
        ),
        (
            r.nodes.clone(),
            datatype(vec![
                ("Empty", vec![]),
                ("Node", vec![data(&r.node)]),
                ("Branch", vec![Sort::U64, Sort::SelfType, Sort::SelfType]),
            ]),
        ),
        (
            r.image.clone(),
            datatype(vec![("Image", vec![data(&r.nodes), Sort::U64])]),
        ),
    ]
}
struct Encoder<'a> {
    roles: &'a Roles,
    nodes: Vec<Term>,
    left: usize,
}
impl Encoder<'_> {
    fn construct(&mut self, id: &str, tag: usize, args: Vec<Term>) -> LangResult<Term> {
        // Charge primitive argument terms as well as every constructor.
        let charge = 1 + args
            .iter()
            .filter(|t| matches!(t, Term::U64(_) | Term::Bool(_)))
            .count();
        self.left = self
            .left
            .checked_sub(charge)
            .ok_or("source syntax term budget exhausted")?;
        Ok(ctor(id, tag, args))
    }
    fn tree(&mut self, id: &str, leaves: &[Term]) -> LangResult<Term> {
        match leaves.len() {
            0 => self.construct(id, 0, vec![]),
            1 => Ok(leaves[0].clone()),
            n => {
                let half = n / 2;
                let a = self.tree(id, &leaves[..half])?;
                let b = self.tree(id, &leaves[half..])?;
                self.construct(id, 2, vec![Term::U64(half as u64), a, b])
            }
        }
    }
    fn words(&mut self, words: &[u64]) -> LangResult<Term> {
        let id = self.roles.words.clone();
        let leaves = words
            .iter()
            .map(|&n| self.construct(&id, 1, vec![Term::U64(n)]))
            .collect::<LangResult<Vec<_>>>()?;
        self.tree(&id, &leaves)
    }
    fn node(&mut self, v: &Value, depth: usize) -> LangResult<u64> {
        if depth > 128 {
            return Err("source syntax JSON depth limit".into());
        }
        let id = self.roles.node.clone();
        let node = match v {
            Value::Null => self.construct(&id, 0, vec![])?,
            Value::Bool(v) => self.construct(&id, 1, vec![Term::Bool(*v)])?,
            Value::Number(n) => self.construct(
                &id,
                2,
                vec![Term::U64(
                    n.as_u64()
                        .ok_or("source syntax requires unsigned integer JSON")?,
                )],
            )?,
            Value::String(text) => {
                let bytes = text.as_bytes();
                let words = bytes
                    .chunks(8)
                    .map(|chunk| {
                        let mut word = [0; 8];
                        word[..chunk.len()].copy_from_slice(chunk);
                        u64::from_le_bytes(word)
                    })
                    .collect::<Vec<_>>();
                let words = self.words(&words)?;
                self.construct(&id, 3, vec![Term::U64(bytes.len() as u64), words])?
            }
            Value::Array(xs) => {
                let refs = xs
                    .iter()
                    .map(|x| self.node(x, depth + 1))
                    .collect::<LangResult<Vec<_>>>()?;
                let words = self.words(&refs)?;
                self.construct(&id, 4, vec![words])?
            }
            Value::Object(xs) => {
                let fields = self.roles.fields.clone();
                let mut leaves = vec![];
                let mut sorted = xs.iter().collect::<Vec<_>>();
                sorted.sort_by(|a, b| a.0.cmp(b.0));
                for (k, v) in sorted {
                    let key = self.node(&Value::String(k.clone()), depth + 1)?;
                    let value = self.node(v, depth + 1)?;
                    leaves.push(self.construct(
                        &fields,
                        1,
                        vec![Term::U64(key), Term::U64(value)],
                    )?);
                }
                let fields = self.tree(&fields, &leaves)?;
                self.construct(&id, 5, vec![fields])?
            }
        };
        let index = self.nodes.len() as u64;
        self.nodes.push(node);
        Ok(index)
    }
}
fn roles(r: &Roles) -> LangResult<()> {
    if r.schema != 1 || r.semantics != SEMANTICS {
        return Err("incompatible source syntax model".into());
    }
    let ids = [&r.words, &r.fields, &r.node, &r.nodes, &r.image, &r.program];
    for id in ids {
        crate::knowledge::identity(id)?;
    }
    let unique = ids.into_iter().collect::<std::collections::BTreeSet<_>>();
    if unique.len() != ids.len() {
        return Err("source syntax roles must be distinct".into());
    }
    Ok(())
}
/// Expected literal definition; no producer controls the source or typed tree.
pub fn definition(actions: &CheckedActions, r: &Roles) -> LangResult<Declaration> {
    roles(r)?;
    let module: Value =
        serde_json::from_slice(&actions.module().bytes()?).map_err(|e| e.to_string())?;
    let actions: Value = serde_json::from_slice(&actions.bytes()?).map_err(|e| e.to_string())?;
    let value = serde_json::json!({"schema":1,"semantics":SEMANTICS,"module":module,"typed_actions":actions});
    let bytes = serde_json::to_vec(&value).map_err(|e| e.to_string())?;
    if bytes.len() > crate::core::MAX_BYTES * 2 {
        return Err("source syntax image byte limit".into());
    }
    let body = image(&value, r)?;
    Ok(Declaration::Function {
        params: vec![],
        result: Sort::Data(r.image.clone()),
        body,
        recursive: None,
    })
}
fn image(value: &Value, r: &Roles) -> LangResult<Term> {
    let mut encoder = Encoder {
        roles: r,
        nodes: vec![],
        left: MAX_TERMS,
    };
    let root = encoder.node(value, 0)?;
    let nodes = std::mem::take(&mut encoder.nodes);
    let leaves = nodes
        .into_iter()
        .map(|n| encoder.construct(&r.nodes, 1, vec![n]))
        .collect::<LangResult<Vec<_>>>()?;
    let table = encoder.tree(&r.nodes, &leaves)?;
    encoder.construct(&r.image, 0, vec![table, Term::U64(root)])
}

#[cfg(test)]
mod tests {
    use super::*;
    fn roles() -> Roles {
        Roles {
            schema: 1,
            semantics: SEMANTICS.into(),
            words: format!("{:064x}", 1),
            fields: format!("{:064x}", 2),
            node: format!("{:064x}", 3),
            nodes: format!("{:064x}", 4),
            image: format!("{:064x}", 5),
            program: format!("{:064x}", 6),
        }
    }
    fn parts(t: &Term) -> (usize, &[Term]) {
        if let Term::Construct {
            constructor,
            arguments,
            ..
        } = t
        {
            (*constructor, arguments)
        } else {
            panic!("constructor expected")
        }
    }
    fn number(t: &Term) -> u64 {
        if let Term::U64(n) = t {
            *n
        } else {
            panic!("number expected")
        }
    }
    fn leaves(t: &Term) -> Vec<&[Term]> {
        let (tag, args) = parts(t);
        match tag {
            0 => {
                assert!(args.is_empty());
                vec![]
            }
            1 => vec![args],
            2 => {
                let mut left = leaves(&args[1]);
                assert_eq!(number(&args[0]) as usize, left.len());
                left.extend(leaves(&args[2]));
                left
            }
            _ => panic!("tree tag"),
        }
    }
    // Independent decoder also validates that references always point backwards.
    fn decode(t: &Term) -> Value {
        let (_, image) = parts(t);
        let mut values = Vec::<Value>::new();
        for leaf in leaves(&image[0]) {
            let (tag, args) = parts(&leaf[0]);
            let value = match tag {
                0 => Value::Null,
                1 => {
                    if let Term::Bool(b) = args[0] {
                        Value::Bool(b)
                    } else {
                        panic!("bool")
                    }
                }
                2 => Value::from(number(&args[0])),
                3 => {
                    let bytes = leaves(&args[1])
                        .iter()
                        .flat_map(|x| number(&x[0]).to_le_bytes())
                        .collect::<Vec<_>>();
                    let len = number(&args[0]) as usize;
                    assert!(len <= bytes.len());
                    assert!(bytes[len..].iter().all(|&b| b == 0));
                    Value::String(String::from_utf8(bytes[..len].to_vec()).unwrap())
                }
                4 => Value::Array(
                    leaves(&args[0])
                        .iter()
                        .map(|a| values[number(&a[0]) as usize].clone())
                        .collect(),
                ),
                5 => {
                    let mut object = serde_json::Map::new();
                    for field in leaves(&args[0]) {
                        let key = values[number(&field[0]) as usize]
                            .as_str()
                            .unwrap()
                            .to_owned();
                        assert!(object
                            .insert(key, values[number(&field[1]) as usize].clone())
                            .is_none());
                    }
                    Value::Object(object)
                }
                _ => panic!("JSON tag"),
            };
            values.push(value);
        }
        values[number(&image[1]) as usize].clone()
    }
    #[test]
    fn lossless_unicode_words_order_and_balancing_boundaries() {
        let roles = roles();
        for n in [0, 1, 2, 3, 7, 8, 9, 63, 64, 65, 255, 256, 257] {
            let value = serde_json::json!({"text":"\u{0}🙂é\r\n", "maximum":u64::MAX,
                "empty":{}, "booleans":[true,false,null], "ordered":(0..n).collect::<Vec<u64>>()});
            let term = image(&value, &roles).unwrap();
            assert_eq!(decode(&term), value);
            // The immutable database's existing depth bound must accept the encoding.
            crate::registry::canonical(&term).unwrap();
        }
    }
    #[test]
    fn full_module_and_typed_actions_roundtrip_through_unchanged_kernel() {
        let roles = roles();
        let module = crate::core::CheckedModule::from_source(crate::syntax::parse(
            "module demo; record Row { value:u32, } state Rows:Table<u32,Row> = Table.empty(); fn twice(x:u64)->u64 {return x+x;} query read()->Option<Row> reads(Rows) {return Rows.get(1);}"
        ).unwrap()).unwrap();
        let actions = CheckedActions::elaborate(&module).unwrap();
        let declaration = definition(&actions, &roles).unwrap();
        let mut context = Context::default();
        for (id, d) in grammar(&roles) {
            context.declare(id, &d).unwrap();
        }
        context
            .declare(roles.program.clone(), &declaration)
            .unwrap();
        let actual = context
            .evaluate(
                &[],
                &Term::Call {
                    function: roles.program.clone(),
                    arguments: vec![],
                },
            )
            .unwrap();
        let expected = serde_json::json!({"schema":1,"semantics":SEMANTICS,
            "module":serde_json::from_slice::<Value>(&module.bytes().unwrap()).unwrap(),
            "typed_actions":serde_json::from_slice::<Value>(&actions.bytes().unwrap()).unwrap()});
        assert_eq!(decode(&actual), expected);
    }
    #[test]
    fn bounded_invalid_values_fail_without_relaxing_kernel_limits() {
        let roles = roles();
        for invalid in [serde_json::json!(-1), serde_json::json!(1.5)] {
            assert!(image(&invalid, &roles).is_err());
        }
        let wide = Value::Array(vec![Value::Null; 30_000]);
        assert!(image(&wide, &roles).unwrap_err().contains("budget"));
        let mut deep = Value::Null;
        for _ in 0..130 {
            deep = Value::Array(vec![deep]);
        }
        assert!(image(&deep, &roles).unwrap_err().contains("depth"));
    }
}
/// Private witness authenticates complete code data. It does not bind an
/// interpreter, install a replacement or certify a generated representation.
pub struct BoundSyntax {
    source: String,
    actions: String,
    roles: Roles,
    context: Context,
}
impl BoundSyntax {
    pub fn bind(actions: &CheckedActions, bundle: &Bundle, r: &Roles) -> LangResult<Self> {
        roles(r)?;
        if !bundle.roots.contains(&r.program) {
            return Err("source syntax program is not a public root".into());
        }
        let context = CheckedBundle::check(bundle)?.first_order_context()?;
        for (id, declaration) in grammar(r) {
            context.matches_definition(&id, &declaration)?;
        }
        context.matches_definition(&r.program, &definition(actions, r)?)?;
        Ok(Self {
            source: actions.source_identity().into(),
            actions: actions.identity()?,
            roles: r.clone(),
            context,
        })
    }
    pub fn source_identity(&self) -> &str {
        &self.source
    }
    pub fn actions_identity(&self) -> &str {
        &self.actions
    }
    pub fn roles(&self) -> &Roles {
        &self.roles
    }
    pub fn context(&self) -> &Context {
        &self.context
    }
    pub fn program_call(&self) -> Term {
        Term::Call {
            function: self.roles.program.clone(),
            arguments: vec![],
        }
    }
}
