use ink_core::core::{CheckedModule, Expr, Function, Program, Type};

fn functions(count: usize) -> Vec<Function> {
    (0..count)
        .map(|index| Function {
            name: format!("entry_{index}"),
            params: Vec::new(),
            result: Type::U64,
            body: Expr::Num(index as u64),
        })
        .collect()
}

#[test]
fn composed_modules_have_a_bounded_declaration_budget() {
    let max_declarations = 2048;
    let module = CheckedModule::from_source(Program {
        module: "Composed".into(),
        functions: functions(max_declarations),
        ..Program::default()
    })
    .unwrap();
    let restored = CheckedModule::from_bytes(&module.bytes().unwrap()).unwrap();
    assert_eq!(restored.program().functions.len(), max_declarations);

    let exceeded = Program {
        module: "TooMany".into(),
        functions: functions(max_declarations + 1),
        ..Program::default()
    };
    assert_eq!(
        CheckedModule::from_source(exceeded).unwrap_err(),
        "core declaration limit exceeded"
    );
}
