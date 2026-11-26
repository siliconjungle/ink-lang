use ink_core::{action_model::Projection,core::CheckedModule,eval,
    logic::{Sort,Term},syntax::{self,Type}};

fn construct(datatype:&str,constructor:usize,arguments:Vec<Term>)->Term{
    Term::Construct{datatype:datatype.into(),constructor,arguments}
}
fn sequence(datatype:&str,values:&[u64])->Term{
    values.iter().rev().fold(construct(datatype,0,vec![]),|tail,item|construct(datatype,1,vec![Term::U64(*item),tail]))
}

#[test]
fn fixed_word_sort_correspondence_matches_the_independent_evaluator(){
    for (name,ty,values)in [
        ("u32",Type::U32,vec![u32::MAX as u64,0,1,0,1]),
        ("u64",Type::U64,vec![u64::MAX,0,1,u64::MAX,7]),
        ("i32",Type::I32,vec![i32::MIN as u32 as u64,0,u32::MAX as u64,i32::MAX as u64]),
    ]{
        let source=format!("module sorting;fn order(xs:List<{name}>)->List<{name}>{{return xs.sort();}}query run(xs:List<{name}>)->List<{name}>{{return order(xs);}}");
        let module=CheckedModule::from_source(syntax::parse(&source).unwrap()).unwrap();
        let model=Projection::derive(&module).unwrap();let context=model.context().unwrap();
        let sort=&model.types[&serde_json::to_string(&Type::List(Box::new(ty.clone()))).unwrap()];let Sort::Data(list)=sort else{panic!("list")};
        for xs in [vec![],vec![0],values]{
            let input=eval::Value::List(xs.iter().map(|n|match ty{Type::U32=>eval::Value::U32(*n as u32),Type::I32=>eval::Value::I32(*n as u32 as i32),_=>eval::Value::U64(*n)}).collect());
            let result=eval::call(module.program(),"order",vec![input],&mut 100000).unwrap();
            let eval::Value::List(output)=result else{panic!("list")};
            let wanted=output.iter().map(|v|match v{eval::Value::U32(n)=>*n as u64,eval::Value::I32(n)=>*n as u32 as u64,eval::Value::U64(n)=>*n,_=>panic!("word")}).collect::<Vec<_>>();
            let actual=context.evaluate(&[],&Term::Call{function:model.actions["run"].function.clone(),arguments:vec![construct(&model.state,0,vec![]),Term::U64(0),sequence(list,&xs)]}).unwrap();
            let Term::Construct{arguments,..}=actual else{panic!("observation")};assert_eq!(arguments[0],sequence(list,&wanted),"{name} {xs:?}");
        }
    }
}

#[test]
fn float_sort_correspondence_is_explicitly_unsupported(){
    assert!(CheckedModule::from_source(syntax::parse("module float_sort;fn order(xs:List<f32>)->List<f32>{return xs.sort();}query run(xs:List<f32>)->List<f32>{return order(xs);}").unwrap()).unwrap_err().contains("integer list"));
}
