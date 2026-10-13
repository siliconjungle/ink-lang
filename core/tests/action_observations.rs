use ink_core::{
    action_ir::{CheckedActions, Kind},
    action_model::{Projection, ValueObservation},
    core::CheckedModule,
    logic::Term,
    syntax,
};

const SOURCE: &str = r#"module observations;
private state Counter:u32=1;
event Seen:u32;
query read()->u32 reads(Counter){return Counter;}
query valid(value:u32)->Bool reads(Counter){return value>0 && value==Counter;}
query equals(expected:u32,value:u32)->Bool{return expected==value;}
change repaired()->Result<Unit,String> writes(Counter) emits(Seen){
 Counter=0;emit Seen(0);Counter=1;let value=read();emit Seen(value);return Err("rollback");
}
change broken()->Result<Unit,String> writes(Counter){
 Counter=0;let value=read();Counter=1;return Err("rollback");
}
change branch(skip:Bool)->Result<Unit,String> writes(Counter){
 if skip {Counter=0;return Err("early");}
 Counter=2;let value=read();return Ok(());
}
change twice()->Result<Unit,String> writes(Counter){
 Counter=0;let first=read();Counter=2;let second=read();return Ok(());
}
change local()->Result<Unit,String> writes(Counter){
 let expected:u32=3;Counter=expected;let value=read();return Ok(());
}
change failed()->Result<Unit,String> writes(Counter){Counter=0;return Err("failed");}
change nested()->Result<Unit,String> writes(Counter){
 let stopped=failed();let value=read();return Ok(());
}
fn double(x:u32)->u32{return x+x;}
query pure()->u32{return double(double(1));}
query nonzero(value:u32)->Bool{return value>0;}
query zero(value:u32)->Bool{return value==0;}
query failed_query()->Result<u32,String>{return Err("query error");}
query success(value:Result<u32,String>)->Bool{return value.fold(fn(x)=>x>0,fn(_)=>false);}
query reject(value:Result<Unit,String>)->Bool{return false;}
change query_error()->Result<Unit,String>{let captured=failed_query();return Err("outer");}
query mapped(xs:List<u32>)->List<u32>{return xs.map(fn(x)=>double(x));}
"#;

fn module() -> CheckedModule {
    CheckedModule::from_source(syntax::parse(SOURCE).unwrap()).unwrap()
}
fn request(module: &CheckedModule, action: &str, occurrence: usize) -> ValueObservation {
    let actions = CheckedActions::elaborate(module).unwrap();
    let index = module
        .program()
        .actions
        .iter()
        .position(|a| a.name == action)
        .unwrap();
    let read = module
        .program()
        .actions
        .iter()
        .position(|a| a.name == "read")
        .unwrap();
    let node = actions
        .action(index)
        .unwrap()
        .nodes
        .iter()
        .enumerate()
        .filter(|(_, n)| matches!(n.kind,Kind::QueryCall{action,..} if action==read))
        .nth(occurrence)
        .unwrap()
        .0;
    ValueObservation {
        action: action.into(),
        node,
        predicate: "valid".into(),
        slots: vec![],
    }
}
fn check(module: &CheckedModule, request: ValueObservation, args: Vec<Term>) -> Term {
    let (model, functions) = Projection::derive_observations(module, &[request]).unwrap();
    let initial = Term::Construct {
        datatype: model.state.clone(),
        constructor: 0,
        arguments: model
            .tables
            .iter()
            .map(|t| Term::Construct {
                datatype: t.datatype.clone(),
                constructor: 0,
                arguments: vec![],
            })
            .collect(),
    };
    let mut arguments = vec![initial, Term::U64(0)];
    arguments.extend(args);
    model
        .context()
        .unwrap()
        .evaluate(
            &[],
            &Term::Call {
                function: functions[0].function.clone(),
                arguments,
            },
        )
        .unwrap()
}
#[test]
fn observes_repaired_state_and_preserves_failure_across_later_abort() {
    let m = module();
    assert_eq!(
        check(&m, request(&m, "repaired", 0), vec![]),
        Term::Bool(true)
    );
    assert_eq!(
        check(&m, request(&m, "broken", 0), vec![]),
        Term::Bool(false)
    );
    assert_eq!(
        check(&m, request(&m, "twice", 0), vec![]),
        Term::Bool(false)
    );
    assert_eq!(check(&m, request(&m, "twice", 1), vec![]), Term::Bool(true));
}
#[test]
fn exits_before_a_site_do_not_observe_its_unexecuted_call() {
    let m = module();
    for skip in [true, false] {
        assert_eq!(
            check(&m, request(&m, "branch", 0), vec![Term::Bool(skip)]),
            Term::Bool(true)
        );
    }
    assert_eq!(
        check(&m, request(&m, "nested", 0), vec![]),
        Term::Bool(true)
    );
}
#[test]
fn binds_local_slots_at_the_site_and_visits_total_expression_children() {
    let m = module();
    let actions = CheckedActions::elaborate(&m).unwrap();
    let local = m
        .program()
        .actions
        .iter()
        .position(|a| a.name == "local")
        .unwrap();
    let slot = actions
        .action(local)
        .unwrap()
        .slots
        .iter()
        .position(|s| s.name == "expected")
        .unwrap();
    let mut observation = request(&m, "local", 0);
    observation.predicate = "equals".into();
    observation.slots = vec![slot];
    assert_eq!(check(&m, observation, vec![]), Term::Bool(true));
    let pure = m
        .program()
        .actions
        .iter()
        .position(|a| a.name == "pure")
        .unwrap();
    let node = actions
        .action(pure)
        .unwrap()
        .nodes
        .iter()
        .position(|n| matches!(n.kind, Kind::PureCall { .. }))
        .unwrap();
    assert_eq!(
        check(
            &m,
            ValueObservation {
                action: "pure".into(),
                node,
                predicate: "nonzero".into(),
                slots: vec![]
            },
            vec![]
        ),
        Term::Bool(true)
    );
    assert_eq!(
        check(
            &m,
            ValueObservation {
                action: "pure".into(),
                node,
                predicate: "zero".into(),
                slots: vec![]
            },
            vec![]
        ),
        Term::Bool(false)
    );
}
#[test]
fn malformed_and_unvisited_callback_sites_fail_closed() {
    let m = module();
    let mut bad = request(&m, "repaired", 0);
    bad.node = usize::MAX;
    assert!(Projection::derive_observations(&m, &[bad]).is_err());
    let mut bad = request(&m, "repaired", 0);
    bad.predicate = "read".into();
    assert!(Projection::derive_observations(&m, &[bad]).is_err());
    let actions = CheckedActions::elaborate(&m).unwrap();
    let index = m
        .program()
        .actions
        .iter()
        .position(|a| a.name == "mapped")
        .unwrap();
    let node = actions
        .action(index)
        .unwrap()
        .nodes
        .iter()
        .find_map(|n| match n.kind {
            Kind::Lambda { body, .. } => Some(body),
            _ => None,
        })
        .unwrap();
    let error = Projection::derive_observations(
        &m,
        &[ValueObservation {
            action: "mapped".into(),
            node,
            predicate: "nonzero".into(),
            slots: vec![],
        }],
    )
    .err()
    .unwrap();
    assert!(error.contains("inside callbacks"), "{error}");
}

#[test]
fn query_errors_are_observed_values_and_change_errors_exit_before_observation() {
    let m = module();
    let actions = CheckedActions::elaborate(&m).unwrap();
    for (owner, callee, predicate, want) in [
        ("query_error", "failed_query", "success", false),
        ("nested", "failed", "reject", true),
    ] {
        let index = m
            .program()
            .actions
            .iter()
            .position(|a| a.name == owner)
            .unwrap();
        let callee = m
            .program()
            .actions
            .iter()
            .position(|a| a.name == callee)
            .unwrap();
        let node = actions.action(index).unwrap().nodes.iter().position(|n|
            matches!(n.kind,Kind::QueryCall{action,..}|Kind::ChangeCall{action,..} if action==callee)).unwrap();
        assert_eq!(
            check(
                &m,
                ValueObservation {
                    action: owner.into(),
                    node,
                    predicate: predicate.into(),
                    slots: vec![],
                },
                vec![]
            ),
            Term::Bool(want)
        );
    }
}

#[test]
fn observation_proofs_use_the_existing_kernel_and_leave_transition_meanings_unchanged() {
    use ink_core::logic::Proof;
    let m = module();
    let baseline = Projection::derive(&m).unwrap();
    let (model, functions) = Projection::derive_observations(
        &m,
        &[request(&m, "repaired", 0), request(&m, "broken", 0)],
    )
    .unwrap();
    assert_eq!(
        serde_json::to_value(&baseline.actions).unwrap(),
        serde_json::to_value(&model.actions).unwrap()
    );
    for (name, entry) in &baseline.objects {
        assert_eq!(
            serde_json::to_value(entry).unwrap(),
            serde_json::to_value(&model.objects[name]).unwrap()
        );
    }
    let initial = Term::Construct {
        datatype: model.state.clone(),
        constructor: 0,
        arguments: model
            .tables
            .iter()
            .map(|t| Term::Construct {
                datatype: t.datatype.clone(),
                constructor: 0,
                arguments: vec![],
            })
            .collect(),
    };
    let cx = model.context().unwrap();
    for (i, function) in functions.iter().enumerate() {
        let value = Term::Call {
            function: function.function.clone(),
            arguments: vec![initial.clone(), Term::U64(0)],
        };
        let proof = Proof::Refl(value.clone());
        assert_eq!(
            cx.check(&[], &[], &value, &Term::Bool(true), &proof)
                .is_ok(),
            i == 0
        );
    }
}
