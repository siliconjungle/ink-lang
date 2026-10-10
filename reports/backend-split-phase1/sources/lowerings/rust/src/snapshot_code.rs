//! Literal Rust spelling of the target-independent snapshot schema.
use ink_core::snapshot_wire::Schema;
pub fn schema_code(s: &Schema) -> String {
    match s {
        Schema::Unit => "portable::Schema::Unit".into(),
        Schema::Bool => "portable::Schema::Bool".into(),
        Schema::U32 => "portable::Schema::U32".into(),
        Schema::U64 => "portable::Schema::U64".into(),
        Schema::Int => "portable::Schema::Int".into(),
        Schema::String => "portable::Schema::String".into(),
        Schema::Id => "portable::Schema::Id".into(),
        Schema::List(a) => format!("portable::Schema::List(Box::new({}))", schema_code(a)),
        Schema::Option(a) => format!("portable::Schema::Option(Box::new({}))", schema_code(a)),
        Schema::Result(a, b) => format!(
            "portable::Schema::Result(Box::new({}),Box::new({}))",
            schema_code(a),
            schema_code(b)
        ),
        Schema::Record(fs) => format!(
            "portable::Schema::Record(vec![{}])",
            fs.iter()
                .map(|(n, t)| format!("({n:?}.into(),{})", schema_code(t)))
                .collect::<Vec<_>>()
                .join(",")
        ),
        Schema::Enum(v) => format!(
            "portable::Schema::Enum(vec![{}])",
            v.iter()
                .map(|n| format!("{n:?}.into()"))
                .collect::<Vec<_>>()
                .join(",")
        ),
    }
}
