use ink_core::{
    core::CheckedModule,
    eval,
    syntax::{self},
};

const LIBRARY: &str = "module library;
 abstract refined record Hidden<T> { item:T, valid:Bool, } invariant value.valid;
 fn wrap<T>(item:T)->Hidden<T>{return Hidden<T>{item:item,valid:true};}
 fn observe<T>(value:Hidden<T>)->T{return value.item;}
 fn through<T>(value:Hidden<T>,read:fn(Hidden<T>)->T)->T{return read(value);}";

fn assembled(caller: &str) -> Result<CheckedModule, String> {
    let library = syntax::parse_surface(LIBRARY, std::iter::empty())?;
    let mut caller = syntax::parse_surface(caller, ["Hidden".into()])?;
    caller.mark_accesses()?;
    caller.program.functions.extend(library.program.functions);
    caller.program.records.extend(library.program.records);
    caller
        .program
        .contracts
        .value_invariants
        .extend(library.program.contracts.value_invariants);
    caller.aliases.extend(library.aliases);
    caller.parameters.extend(library.parameters);
    caller.applications.extend(library.applications);
    caller.callback_types.extend(library.callback_types);
    caller
        .constant_parameters
        .extend(library.constant_parameters);
    caller.abstract_records.extend(library.abstract_records);
    caller.access_origins.extend(library.access_origins);
    CheckedModule::from_source(caller.elaborate()?)
}

#[test]
fn defining_module_can_construct_and_observe_without_runtime_provenance() {
    let source = "module own; abstract refined record Small{x:u32,} invariant value.x<10;
      fn make()->Small{return Small{x:3};} fn read(v:Small)->u32{return v.x;}";
    let abstract_module = CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
    let plain =
        CheckedModule::from_source(syntax::parse(&source.replace("abstract ", "")).unwrap())
            .unwrap();
    assert_eq!(abstract_module.bytes().unwrap(), plain.bytes().unwrap());
    let value = eval::call(abstract_module.program(), "make", vec![], &mut 10_000).unwrap();
    assert_eq!(
        eval::call(abstract_module.program(), "read", vec![value], &mut 10_000).unwrap(),
        eval::Value::U32(3)
    );
}

#[test]
fn generic_interfaces_carry_validity_but_hide_their_representation() {
    let module = assembled(
        "module caller;
      fn make()->Hidden<u32>{return wrap<u32>(7);}
      fn read(v:Hidden<u32>)->u32{return observe<u32>(v);}
      fn copy(v:Hidden<u32>)->Hidden<u32>{return v;}",
    )
    .unwrap();
    let value = eval::call(module.program(), "make", vec![], &mut 10_000).unwrap();
    assert_eq!(
        eval::call(module.program(), "read", vec![value.clone()], &mut 10_000).unwrap(),
        eval::Value::U32(7)
    );
    assert_eq!(
        eval::call(module.program(), "copy", vec![value.clone()], &mut 10_000).unwrap(),
        value
    );
    for source in [
        "module caller;fn reveal(v:Hidden<u32>)->u32{return v.item;}",
        "module caller;fn forge()->Hidden<u32>{return Hidden<u32>{item:7,valid:true};}",
        "module caller;type Alias=Hidden<u32>;fn forge()->Alias{return Alias{item:7,valid:true};}",
        "module caller;record Box{inner:Hidden<u32>,}fn reveal(v:Box)->u32{return v.inner.item;}",
    ] {
        let error = assembled(source).err().expect("representation leaked");
        assert!(error.contains("representation access outside"), "{error}");
    }
}

#[test]
fn callbacks_cannot_launder_representation_access_through_library_code() {
    for source in [
        "module caller;fn reveal(xs:List<Hidden<u32>>)->List<u32>{return xs.map(fn(v)=>v.item);}",
        "module caller;fn reveal(v:Option<Hidden<u32>>)->u32{return v.fold(fn(x)=>x.item,fn(u)=>0);}",
        "module caller;fn reveal(v:Result<u32,Hidden<u32>>)->Result<u32,u32>{return v.map_err(fn(x)=>x.item);}",
        "module caller;fn reveal(v:Hidden<u32>)->u32{return through<u32>(v,fn(x)=>x.item);}",
    ] {
        let error=assembled(source).err().expect("callback representation leaked");
        assert!(error.contains("representation access outside"),"{error}");
    }
    let module = assembled(
        "module caller;fn read(v:Hidden<u32>)->u32{return through<u32>(v,fn(x)=>observe<u32>(x));}",
    )
    .unwrap();
    let f = module
        .program()
        .functions
        .iter()
        .find(|f| f.name == "read")
        .unwrap();
    let arg = eval::Value::from_program_json(
        &serde_json::json!({"item":7,"valid":false}),
        &f.params[0].1,
        module.program(),
    )
    .unwrap();
    assert_eq!(
        eval::call(module.program(), "read", vec![arg], &mut 10_000).unwrap_err(),
        "contract precondition failed"
    );
}

#[test]
fn nonrecord_abstract_declarations_fail_explicitly() {
    assert!(syntax::parse("module bad;abstract type Alias=u32;")
        .unwrap_err()
        .contains("abstract applies to record"));
}
