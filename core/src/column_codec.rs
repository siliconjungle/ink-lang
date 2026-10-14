//! Fixed row/column codec meanings for checked physical carriers. Producers
//! prove the universally quantified round trip; this module defines the codec
//! that native storage implements and binds it to the actual source shape.
use crate::{
    logic::{self, Branch, Constructor, Declaration, Sort, Term},
    registry,
    syntax::{Program, Type},
    LangResult,
};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Schema {
    pub record: String,
    pub fields: Vec<(String, Type)>,
    pub entries: BTreeMap<String, registry::Entry>,
    pub row: String,
    pub rows: String,
    pub columns: String,
    pub field_lists: Vec<String>,
    pub prepend: String,
    pub encode: String,
    pub join: String,
    pub decode: String,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Packing {
    pub bits: u8,
    pub proof: crate::bitproof::Certificate,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Layout {
    pub record: String,
    pub knowledge: registry::Bundle,
    pub roundtrip: String,
    #[serde(default)]
    pub packing: BTreeMap<String, Packing>,
}
fn var(n: &str) -> Term {
    Term::Var(n.into())
}
fn call(f: &str, args: Vec<Term>) -> Term {
    Term::Call {
        function: f.into(),
        arguments: args,
    }
}
fn cons(d: &str, c: usize, args: Vec<Term>) -> Term {
    Term::Construct {
        datatype: d.into(),
        constructor: c,
        arguments: args,
    }
}
fn mat(t: Term, branches: Vec<(Vec<String>, Term)>) -> Term {
    Term::Match {
        scrutinee: Box::new(t),
        branches: branches
            .into_iter()
            .map(|(bindings, body)| Branch { bindings, body })
            .collect(),
    }
}
struct Build {
    entries: BTreeMap<String, registry::Entry>,
}
impl Build {
    fn add(&mut self, d: Declaration) -> LangResult<String> {
        let value = serde_json::to_value(&d).map_err(|e| e.to_string())?;
        let mut deps = vec![];
        fn walk(
            v: &serde_json::Value,
            entries: &BTreeMap<String, registry::Entry>,
            out: &mut Vec<String>,
        ) {
            match v {
                serde_json::Value::String(s) if entries.contains_key(s) => out.push(s.clone()),
                serde_json::Value::Array(v) => {
                    for x in v {
                        walk(x, entries, out)
                    }
                }
                serde_json::Value::Object(v) => {
                    for x in v.values() {
                        walk(x, entries, out)
                    }
                }
                _ => (),
            }
        }
        walk(&value, &self.entries, &mut deps);
        let e = registry::Entry::from_declaration(&d, deps)?;
        let id = registry::identity(&e)?;
        self.entries.insert(id.clone(), e);
        Ok(id)
    }
    fn data(&mut self, cs: Vec<Vec<Sort>>) -> LangResult<String> {
        self.add(Declaration::Datatype {
            constructors: cs
                .into_iter()
                .enumerate()
                .map(|(i, fields)| Constructor {
                    name: format!("C{i}"),
                    fields,
                })
                .collect(),
        })
    }
    fn fun(
        &mut self,
        params: Vec<(String, Sort)>,
        result: Sort,
        body: Term,
        recursive: Option<usize>,
    ) -> LangResult<String> {
        self.add(Declaration::Function {
            params,
            result,
            body,
            recursive,
        })
    }
}
pub fn schema(p: &Program, record: &str) -> LangResult<Schema> {
    let fields = match record {
        "@U32" => vec![("value".into(), Type::U32)],
        "@U64" => vec![("value".into(), Type::U64)],
        "@Bool" => vec![("value".into(), Type::Bool)],
        _ => p
            .records
            .get(record)
            .ok_or("column source record missing")?
            .clone(),
    };
    if fields.is_empty() || fields.len() > 16 {
        return Err("column field count limit".into());
    }
    let sorts = fields
        .iter()
        .map(|(_, t)| match t {
            Type::Bool => Ok(Sort::Bool),
            Type::U32 | Type::U64 | Type::I32 | Type::F32 => Ok(Sort::U64),
            _ => Err("column carrier requires flat scalar fields".into()),
        })
        .collect::<LangResult<Vec<_>>>()?;
    let mut b = Build {
        entries: BTreeMap::new(),
    };
    let row = b.data(vec![sorts.clone()])?;
    let rows = b.data(vec![vec![], vec![Sort::Data(row.clone()), Sort::SelfType]])?;
    let mut field_lists = vec![];
    for s in &sorts {
        field_lists.push(b.data(vec![vec![], vec![s.clone(), Sort::SelfType]])?);
    }
    let columns = b.data(vec![field_lists.iter().cloned().map(Sort::Data).collect()])?;
    let names: Vec<_> = (0..sorts.len()).map(|i| format!("column_{i}")).collect();
    let values: Vec<_> = (0..sorts.len()).map(|i| format!("value_{i}")).collect();
    let prep_body = mat(
        var("row"),
        vec![(
            values.clone(),
            mat(
                var("columns"),
                vec![(
                    names.clone(),
                    cons(
                        &columns,
                        0,
                        field_lists
                            .iter()
                            .enumerate()
                            .map(|(i, s)| cons(s, 1, vec![var(&values[i]), var(&names[i])]))
                            .collect(),
                    ),
                )],
            ),
        )],
    );
    let prepend = b.fun(
        vec![
            ("row".into(), Sort::Data(row.clone())),
            ("columns".into(), Sort::Data(columns.clone())),
        ],
        Sort::Data(columns.clone()),
        prep_body,
        None,
    )?;
    let encoded = mat(
        var("rows"),
        vec![
            (
                vec![],
                cons(
                    &columns,
                    0,
                    field_lists.iter().map(|s| cons(s, 0, vec![])).collect(),
                ),
            ),
            (
                vec!["head".into(), "tail".into()],
                call(
                    &prepend,
                    vec![var("head"), Term::SelfCall(vec![var("tail")])],
                ),
            ),
        ],
    );
    let encode = b.fun(
        vec![("rows".into(), Sort::Data(rows.clone()))],
        Sort::Data(columns.clone()),
        encoded,
        Some(0),
    )?;
    let heads: Vec<_> = (0..sorts.len()).map(|i| format!("head_{i}")).collect();
    let tails: Vec<_> = (0..sorts.len()).map(|i| format!("tail_{i}")).collect();
    let mut body = cons(
        &rows,
        1,
        vec![
            cons(&row, 0, heads.iter().map(|n| var(n)).collect()),
            Term::SelfCall(tails.iter().map(|n| var(n)).collect()),
        ],
    );
    for i in (0..sorts.len()).rev() {
        body = mat(
            var(&names[i]),
            vec![
                (vec![], cons(&rows, 0, vec![])),
                (vec![heads[i].clone(), tails[i].clone()], body),
            ],
        );
    }
    let join = b.fun(
        names
            .iter()
            .zip(&field_lists)
            .map(|(n, s)| (n.clone(), Sort::Data(s.clone())))
            .collect(),
        Sort::Data(rows.clone()),
        body,
        Some(0),
    )?;
    let decode = b.fun(
        vec![("columns".into(), Sort::Data(columns.clone()))],
        Sort::Data(rows.clone()),
        mat(
            var("columns"),
            vec![(
                names.clone(),
                call(&join, names.iter().map(|n| var(n)).collect()),
            )],
        ),
        None,
    )?;
    Ok(Schema {
        record: record.into(),
        fields,
        entries: b.entries,
        row,
        rows,
        columns,
        field_lists,
        prepend,
        encode,
        join,
        decode,
    })
}
pub fn packing_goal(
    bits: u8,
) -> LangResult<(Vec<(String, Sort)>, Vec<logic::Equation>, logic::Equation)> {
    if ![1, 8, 16, 32, 64].contains(&bits) {
        return Err("packed column bit width".into());
    }
    guarded_word_goal(bits)
}
/// Generic word-mask preservation under an explicit unsigned range guard.
/// Physical carriers still check their own supported widths independently.
pub fn guarded_word_goal(bits:u8)->LangResult<(Vec<(String,Sort)>,Vec<logic::Equation>,logic::Equation)> {
    if bits==0||bits>64{return Err("word guard bit width".into());}
    let mask = if bits == 64 {
        u64::MAX
    } else {
        (1u64 << bits) - 1
    };
    let bin = |op: &str, a: Term, b: Term| Term::Binary {
        op: op.into(),
        left: Box::new(a),
        right: Box::new(b),
    };
    Ok((
        vec![("value".into(), Sort::U64)],
        vec![logic::Equation {
            from: bin("<=", var("value"), Term::U64(mask)),
            to: Term::Bool(true),
        }],
        logic::Equation {
            from: bin("&", var("value"), Term::U64(mask)),
            to: var("value"),
        },
    ))
}
pub fn check(p: &Program, layout: &Layout) -> LangResult<()> {
    let schema = schema(p, &layout.record)?;
    let view = registry::CheckedBundle::check(&layout.knowledge)?;
    let context = view.first_order_context()?;
    for (id, entry) in &schema.entries {
        let d: Declaration = serde_json::from_value(entry.payload["declaration"].clone())
            .map_err(|e| e.to_string())?;
        context.matches_definition(id, &d)?;
    }
    context.check(
        &[("rows".into(), Sort::Data(schema.rows.clone()))],
        &[],
        &call(
            &schema.decode,
            vec![call(&schema.encode, vec![var("rows")])],
        ),
        &var("rows"),
        &logic::Proof::Use {
            theorem: layout.roundtrip.clone(),
            arguments: vec![var("rows")],
            premises: vec![],
        },
    )?;
    for (field, packing) in &layout.packing {
        let ty = &schema
            .fields
            .iter()
            .find(|(n, _)| n == field)
            .ok_or("packed source field missing")?
            .1;
        let allowed = match ty {
            Type::Bool => packing.bits == 1,
            Type::U32 => [8, 16, 32].contains(&packing.bits),
            Type::U64 => [8, 16, 32, 64].contains(&packing.bits),
            _ => false,
        };
        if !allowed {
            return Err("packed source field/width mismatch".into());
        }
        let (params, hyp, goal) = packing_goal(packing.bits)?;
        let problem =
            logic::Context::default().bitvector_problem(&params, &hyp, &goal.from, &goal.to)?;
        crate::bitproof::verify(&problem, &packing.proof)?;
    }
    Ok(())
}

pub const MAP_SEMANTICS: &str = "ink-source-column-map-v1";
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct MapObligation {
    pub site: crate::bounds::Site,
    pub record: String,
    pub field: String,
    pub params: crate::semantic::Env,
    pub equation: crate::laws::Equation,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct MapCertificate {
    pub source: String,
    pub site: crate::bounds::Site,
    pub field: String,
    pub obligation_sha256: String,
    pub proof: crate::laws::Proof,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct MapPackage {
    pub knowledge: registry::Bundle,
}
#[derive(Clone, Debug, Default)]
pub struct CheckedMaps {
    sites: BTreeMap<crate::bounds::Site, Vec<String>>,
}
impl CheckedMaps {
    pub fn fields(&self, function: &str, path: &[usize]) -> &[String] {
        self.sites
            .get(&crate::bounds::Site {
                function: function.into(),
                path: path.into(),
            })
            .map(Vec::as_slice)
            .unwrap_or(&[])
    }
}
pub fn check_maps(
    module: &crate::core::CheckedModule,
    layouts: &[Layout],
    package: &MapPackage,
) -> LangResult<CheckedMaps> {
    let view = registry::CheckedBundle::check(&package.knowledge)?;
    let objects = view
        .bundle()
        .objects
        .iter()
        .filter(|(_, e)| e.semantics == crate::laws::SEMANTICS)
        .map(|(id, e)| Ok((id.clone(), e.law()?)))
        .collect::<LangResult<BTreeMap<_, _>>>()?;
    let catalogue = crate::laws::Catalogue {
        schema: 1,
        semantics: crate::laws::SEMANTICS.into(),
        roots: objects.keys().cloned().collect(),
        objects,
    };
    let laws = crate::laws::CheckedCatalogue::check(&catalogue, module.program())?;
    let goals: BTreeMap<_, _> = crate::bounds::map_obligations(module)?
        .into_iter()
        .map(|g| ((g.site.clone(), g.field.clone()), g))
        .collect();
    let source = module.identity()?;
    let mut sites: BTreeMap<crate::bounds::Site, Vec<String>> = BTreeMap::new();
    for id in &view.bundle().roots {
        let e = &view.bundle().objects[id];
        if e.semantics != MAP_SEMANTICS || e.kind != registry::Kind::Definition {
            return Err("column map proof domain mismatch".into());
        }
        let c: MapCertificate =
            serde_json::from_value(e.payload.clone()).map_err(|e| e.to_string())?;
        let goal = goals
            .get(&(c.site.clone(), c.field.clone()))
            .ok_or("column map source site missing")?;
        if c.source != source
            || c.obligation_sha256 != registry::identity(goal)?
            || !layouts.iter().any(|l| l.record == goal.record)
        {
            return Err("column map source/layout/obligation mismatch".into());
        }
        let fields = sites.entry(c.site).or_default();
        if fields.contains(&c.field) {
            return Err("duplicate column map field certificate".into());
        }
        laws.prove(
            module.program(),
            &goal.params,
            &[],
            &goal.equation,
            &c.proof,
            &mut crate::semantic::Budget::new(),
            0,
        )?;
        fields.push(c.field);
    }
    Ok(CheckedMaps { sites })
}
