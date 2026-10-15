use std::collections::BTreeMap;
fn main() {
    let corpus:BTreeMap<String,String>=serde_json::from_slice(include_bytes!("../corpus.json")).unwrap();
    let(mut valid,mut invalid,mut laws,mut failures)=(0,0,0,Vec::new());
    for(name,source)in &corpus {
        match old::syntax::parse(source).and_then(old::core::CheckedModule::from_source){
            Ok(prior)=>{
                valid+=1;
                match new::syntax::parse(source).and_then(new::core::CheckedModule::from_source){
                    Ok(current)=>if prior.bytes().unwrap()!=current.bytes().unwrap(){failures.push(format!("{name}: checked bytes changed"));},
                    Err(e)=>failures.push(format!("{name}: formerly valid source rejected: {e}")),
                }
            }
            Err(_)=>invalid+=1,
        }
        let prior=old::syntax::parse_law_source(source).and_then(|s|old::law_author::compile_source(s,BTreeMap::new(),None));
        if let Ok(prior)=prior{
            laws+=1;
            match new::syntax::parse_law_source(source).and_then(|s|new::law_author::compile_source(s,BTreeMap::new(),None)){
                Ok(current)=>if serde_json::to_value(prior.bundle).unwrap()!=serde_json::to_value(current.bundle).unwrap(){failures.push(format!("{name}: law bundle changed"));},
                Err(e)=>failures.push(format!("{name}: formerly valid law rejected: {e}")),
            }
        }
    }
    let published=new::core::CheckedModule::from_source(new::syntax::parse(include_str!("../../source.ink")).unwrap()).unwrap();
    assert_eq!(published.bytes().unwrap(),include_bytes!("../../source.core.json"));
    println!("{}",serde_json::json!({"fragments":corpus.len(),"old_valid_modules":valid,"old_invalid_modules":invalid,"old_valid_law_sources":laws,"failures":failures,"published_source_core":published.identity().unwrap(),"published_source_bytes_match":true}));
    assert!(failures.is_empty());
}
