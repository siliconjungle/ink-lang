//! One source form for laws: concrete and general laws (type parameters,
//! function parameters, conditions, quantified assumptions, proofs) are
//! authored with `law`, checked by the semantic law kernel, and reach programs
//! only through concrete laws.
use std::{collections::BTreeMap, path::Path, process::Command};
use verified_language::{
    core::CheckedModule,
    eval, law_author,
    laws::{self, Catalogue, CheckedCatalogue},
    optimisation::{self, Package, Site},
    registry::{self, CheckedBundle},
    semantic::{self as s, Node},
    syntax::{self, Program},
};

fn author(source: &str) -> Result<law_author::Authored, String> {
    law_author::compile_source(syntax::parse_law_source(source)?, BTreeMap::new(), None)
}
fn catalogue(a: &law_author::Authored) -> Catalogue {
    CheckedBundle::check(&a.bundle).unwrap().catalogue().unwrap()
}
fn rejects(source: &str, message: &str) {
    match author(source) {
        Ok(_) => panic!("accepted: {source}"),
        Err(e) => assert!(e.contains(message), "{e}\n--- expected: {message}"),
    }
}

#[test]
fn general_law_library_checks_and_publishes() {
    let dir = Path::new("build/general-law-authoring");
    std::fs::create_dir_all(dir).unwrap();
    let bundle = dir.join("bundle.json");
    let output = Command::new(env!("CARGO_BIN_EXE_ink"))
        .args(["emit-laws", "knowledge/libraries/general-laws.ink", "-o"])
        .arg(&bundle)
        .output()
        .unwrap();
    assert!(output.status.success(), "{}", String::from_utf8_lossy(&output.stderr));
    let receipt: serde_json::Value = serde_json::from_slice(&output.stdout).unwrap();
    let names = receipt["names"].as_object().unwrap();
    assert!(names.len() >= 30);
    let bundle = serde_json::from_slice(&std::fs::read(&bundle).unwrap()).unwrap();
    let c = CheckedBundle::check(&bundle).unwrap().catalogue().unwrap();
    CheckedCatalogue::check(&c, &Program::default()).unwrap();
    let law = |name: &str| &c.objects[names[name].as_str().unwrap()];
    // Type and function parameters, assumptions and markers.
    let fusion = law("map_fusion");
    assert_eq!(fusion.types, ["A", "B", "C"]);
    assert_eq!(fusion.semantics, laws::GENERAL_SEMANTICS);
    assert!(matches!(fusion.params["f"], s::Sort::Arrow(..)));
    let append = law("fold_append");
    assert_eq!(
        append.assumptions.iter().map(|a| a.name.as_str()).collect::<Vec<_>>(),
        ["zero_left", "associates"]
    );
    // An instance is concrete: no type parameters or assumptions remain.
    let sum = law("sum_append_u64");
    assert!(sum.types.is_empty() && sum.assumptions.is_empty());
    assert!(sum.dependencies.contains(&names["fold_append"].as_str().unwrap().to_string()));
    // Concrete laws without general features keep the original marker.
    assert_eq!(law("int_distributes").semantics, laws::SEMANTICS);
}

#[test]
fn rewrite_declarations_are_concrete_laws() {
    let a = author("module t; rewrite double(x: Int) { from x + x; to x * 2; proof by normalize; }").unwrap();
    let b = author("module t; law double(x: Int) { x + x == x * 2; }").unwrap();
    assert_eq!(a.names["double"], b.names["double"]);
}

#[test]
fn unsound_or_ill_formed_laws_are_rejected() {
    // A false general law.
    rejects(
        "module t; law bad<A>(xs: List<A>, f: fn(A) -> A) { xs.map(f) == xs; proof by induction xs; }",
        "semantic normal forms differ",
    );
    // Type parameters are opaque: no equality, ordering or arithmetic.
    rejects("module t; law bad<T>(x: T) { (x == x) == true; }", "unsupported binary semantic operation");
    rejects("module t; law bad<T>(xs: List<T>) { xs.sort() == xs.sort(); }", "sort");
    // Values of different type parameters are never equal.
    rejects("module t; law bad<A, B>(x: A, y: A) { x == y; }", "semantic normal forms differ");
    // An assumption is usable inside its law, but every use must prove it.
    rejects(
        "module t;
         law absurd(x: u64) {
             assume never(): 0 == 1;
             x == x + 1;
             proof by calc {
                 _ == x + 0 by normalize;
                   == x + 1 by congruence(normalize, assumption never());
                   == _ by normalize;
             };
         }
         law leak(x: u64) { x == x + 1; proof by use absurd(x); }",
        "law leak",
    );
    // Instances must type-check: B is u64 but the function returns u32.
    rejects(
        "module t;
         law same<A, B>(xs: List<A>, f: fn(A) -> B) { xs.map(f) == xs.map(f); }
         law misuse(xs: List<u32>) { xs.map(fn(x) => x) == xs.map(fn(x) => x); proof by use same<u32, u64>(xs, fn(x) => x); }",
        "expected U64",
    );
    // Laws are used after they are declared, never recursively.
    rejects(
        "module t; law loop(x: u64) { x == x + 0; proof by use loop(x); }",
        "unknown law loop",
    );
    // A type parameter cannot shadow a declared type.
    rejects(
        "module t; record P { a: u32, } law bad<P>(x: P) { x == x; }",
        "collides",
    );
    // Assumption names and parameters are checked.
    rejects(
        "module t; law bad<M>(z: M, f: fn(M, M) -> M) { assume a(z: M): f(z, z) == z; z == z; }",
        "shadows",
    );
}

#[test]
fn executable_sources_reject_law_declarations() {
    let e = syntax::parse("module m; law t(x: u32) { x == x; }").unwrap_err();
    assert!(e.contains("emit-laws"), "{e}");
    // Function-typed law parameters never reach executable elaboration.
    assert!(syntax::parse("module m; fn f(g: fn(u32, u32) -> u32) -> u32 { return 0; }").is_err());
}

#[test]
fn kernel_rejects_tampered_general_laws() {
    let a = author(
        "module t;
         law fold_left_identity<M>(xs: List<M>, zero: M, plus: fn(M, M) -> M) {
             assume zero_left(a: M): plus(zero, a) == a;
             foldr(xs, zero, fn(x, acc) => plus(zero, acc)) == zero;
             proof by induction xs {
                 nil => normalize;
                 cons(h, t) => calc {
                     _ == plus(zero, foldr(t, zero, fn(x, acc) => plus(zero, acc))) by normalize;
                       == foldr(t, zero, fn(x, acc) => plus(zero, acc)) by assumption zero_left(foldr(t, zero, fn(x, acc) => plus(zero, acc)));
                       == _ by normalize;
                 };
             };
         }",
    )
    .unwrap();
    let c = catalogue(&a);
    let id = a.names["fold_left_identity"].clone();
    let check = |law: laws::Law| {
        let mut c = c.clone();
        let id = registry::identity(&registry::Entry::from_law(&law).unwrap()).unwrap();
        c.objects = BTreeMap::from([(id.clone(), law)]);
        c.roots = vec![id];
        CheckedCatalogue::check(&c, &Program::default())
    };
    let original = c.objects[&id].clone();
    check(original.clone()).unwrap();
    // Dropping the assumption leaves its use unjustified.
    let mut dropped = original.clone();
    dropped.assumptions.clear();
    assert!(check(dropped).is_err());
    // A general law cannot claim the concrete marker.
    let mut marker = original.clone();
    marker.semantics = laws::SEMANTICS.into();
    assert!(check(marker).is_err());
    // Without its type parameter the law's types are undeclared.
    let mut untyped = original;
    untyped.types.clear();
    untyped.semantics = laws::GENERAL_SEMANTICS.into();
    assert!(check(untyped).is_err());
}

fn package(m: &CheckedModule, c: &Catalogue, law: &str, args: BTreeMap<String, s::Term>) -> Package {
    // The bundle carries exactly the law's dependency closure.
    let mut closure = BTreeMap::new();
    let mut pending = vec![law.to_string()];
    while let Some(id) = pending.pop() {
        if let Some(l) = c.objects.get(&id) {
            if closure.insert(id.clone(), l.clone()).is_none() {
                pending.extend(l.dependencies.clone());
            }
        }
    }
    let mut c = c.clone();
    c.objects = closure;
    c.roots = vec![law.to_string()];
    Package {
        schema: 1,
        semantics: optimisation::SEMANTICS.into(),
        input_core_sha256: m.identity().unwrap(),
        knowledge: registry::from_catalogue(&c).unwrap(),
        applications: vec![Site {
            function: "f".into(),
            path: vec![],
            law: law.into(),
            arguments: args,
            premises: vec![],
        }],
        action_replacement: None,
        contract_refinement: None,
    }
}

#[test]
fn instances_of_general_laws_optimise_programs() {
    let a = author(
        "module t;
         law fold_append<A, M>(xs: List<A>, ys: List<A>, w: fn(A) -> M, zero: M, plus: fn(M, M) -> M) {
             assume zero_left(a: M): plus(zero, a) == a;
             assume associates(a: M, b: M, c: M): plus(plus(a, b), c) == plus(a, plus(b, c));
             foldr(xs.concat(ys), zero, fn(x, acc) => plus(w(x), acc))
                 == plus(foldr(xs, zero, fn(x, acc) => plus(w(x), acc)), foldr(ys, zero, fn(x, acc) => plus(w(x), acc)));
             proof by induction xs {
                 nil => symmetry(assumption zero_left(foldr(ys, zero, fn(x, acc) => plus(w(x), acc))));
                 cons(h, t) => calc {
                     _ == plus(w(h), plus(foldr(t, zero, fn(x, acc) => plus(w(x), acc)), foldr(ys, zero, fn(x, acc) => plus(w(x), acc)))) by normalize;
                       == _ by symmetry(assumption associates(w(h), foldr(t, zero, fn(x, acc) => plus(w(x), acc)), foldr(ys, zero, fn(x, acc) => plus(w(x), acc))));
                 };
             };
         }
         law sum_append(xs: List<u64>, ys: List<u64>) {
             foldr(xs.concat(ys), 0, fn(x, acc) => x + acc)
                 == foldr(xs, 0, fn(x, acc) => x + acc) + foldr(ys, 0, fn(x, acc) => x + acc);
             proof by use fold_append(xs, ys, fn(x) => x, 0, fn(a, b) => a + b);
         }",
    )
    .unwrap();
    let c = catalogue(&a);
    let m = CheckedModule::from_source(
        syntax::parse(
            "module test; fn f(xs: List<u64>, ys: List<u64>) -> u64 { return foldr(xs.concat(ys), 0, fn(x) => fn(acc) => x + acc); }",
        )
        .unwrap(),
    )
    .unwrap();
    let list = s::value(verified_language::core::Type::List(Box::new(verified_language::core::Type::U64)));
    let args = BTreeMap::from([
        ("xs".to_string(), s::free(list.clone(), "xs")),
        ("ys".to_string(), s::free(list, "ys")),
    ]);
    let selected = optimisation::check(&m, &package(&m, &c, &a.names["sum_append"], args)).unwrap();
    assert_ne!(selected.module().identity().unwrap(), m.identity().unwrap());
    let value = |xs: &[u64]| eval::Value::List(xs.iter().map(|x| eval::Value::U64(*x)).collect());
    let args = vec![value(&[1, 2, u64::MAX]), value(&[4, 5])];
    assert_eq!(
        eval::call_selected(&selected, "f", args.clone(), &mut 10_000).unwrap(),
        eval::call(m.program(), "f", args, &mut 10_000).unwrap()
    );
    // The general law itself never applies directly: its assumptions would go unproved.
    let general = &a.names["fold_append"];
    let law = &c.objects[general];
    let args = law
        .params
        .iter()
        .map(|(n, sort)| (n.clone(), s::free(sort.clone(), n)))
        .collect();
    let e = optimisation::check(&m, &package(&m, &c, general, args)).unwrap_err();
    assert!(e.contains("general laws apply through checked instances"), "{e}");
}

#[test]
fn option_and_result_values_have_constructors_and_cases() {
    let a = author(
        "module t;
         law option_map_fusion<A, B, C>(o: Option<A>, f: fn(A) -> B, g: fn(B) -> C) {
             o.map(f).map(g) == o.map(fn(x) => g(f(x)));
             proof by cases o { none => normalize; some(v) => normalize; };
         }
         law result_maps_commute<A, B, E, F>(r: Result<A, E>, f: fn(A) -> B, g: fn(E) -> F) {
             r.map(f).map_err(g) == r.map_err(g).map(f);
             proof by cases r { ok(v) => normalize; err(e) => normalize; };
         }",
    )
    .unwrap();
    assert_eq!(a.names.len(), 2);
    // Constructors elaborate, reduce and reify.
    let m = CheckedModule::from_source(
        syntax::parse(
            "module test; fn f(x: u32) -> u32 { let o: Option<u32> = Some(x); return o.fold(fn(v) => v + 1, fn(u) => 0); }",
        )
        .unwrap(),
    )
    .unwrap();
    let subject = optimisation::subject(&m).unwrap();
    let body = &subject.functions["f"];
    fn has(t: &s::Term, name: &str) -> bool {
        matches!(&t.node, Node::Op(n, _) if n == name) || s::children(t).into_iter().any(|c| has(c, name))
    }
    assert!(has(body, "call:Some") && has(body, "method:fold"));
    let source = s::reify(body, m.program()).unwrap();
    let env = verified_language::check::params_env(&m.program().functions[0].params).unwrap();
    assert_eq!(
        &s::elaborate(&source, &env, m.program(), &verified_language::core::Type::U32).unwrap(),
        body
    );
    // A false variant law fails in one of its cases.
    rejects(
        "module t; law bad<A>(o: Option<A>, d: A) { o.map(fn(x) => d) == o; proof by cases o { none => normalize; some(v) => normalize; }; }",
        "semantic normal forms differ",
    );
}

#[test]
fn variant_elaboration_preserves_enclosing_error_variables() {
    author(
        "module t;
         law ok_or_hygiene(o: Option<u32>, __ink_variant_other: u32) {
             o.ok_or(__ink_variant_other)
                 == o.fold(fn(v) => Ok(v), fn(u) => Err(__ink_variant_other));
             proof by cases o { none => normalize; some(v) => normalize; };
         }
         law nested_hygiene(xs: List<Option<u32>>) {
             xs.map(fn(__ink_variant_other) => __ink_variant_other.ok_or(7))
                 == xs.map(fn(o) => o.fold(fn(v) => Ok(v), fn(u) => Err(7)));
             proof by induction xs;
         }",
    ).unwrap();
}
#[test]
fn collection_observations_are_shared_by_contracts_and_source_laws(){
 let a=author(&std::fs::read_to_string("knowledge/libraries/contract-laws.ink").unwrap()).unwrap();
 assert_eq!(a.names.len(),6);
 assert!(author("module wrong;law false_bag(){(multiset(list(1,1))==multiset(list(1)))==true;}").is_err());
 assert!(author("module wrong;law false_unique(){unique(list(1,1))==true;}").is_err());
 // Ordinary declarations and lexical callback parameters take precedence over
 // observation syntax in law terms and proof tactics as they do in programs.
 assert!(author("module shadow;fn unique(x:u32)->Bool{return false;}law bad(){unique(1)==true;}").is_err());
 author("module shadow;law use_callback(xs:List<u32>,unique:fn(List<u32>)->Bool){requires known:unique(xs);unique(xs)==true;proof by hypothesis known;}").unwrap();
}

#[test]
fn scoped_buffer_observation_laws_use_fixed_clipped_slice_meanings(){
 let source=include_str!("../knowledge/libraries/buffer-view-laws.ink");
 let authored=author(source).unwrap();assert_eq!(authored.names.len(),3);
 CheckedCatalogue::check(&catalogue(&authored),&Program::default()).unwrap();
 assert!(author("module wrong;law bad(){buffer(list(1,2)).borrow_range(1,1,fn(view)=>view.at_or(0,99))==1;}").is_err());
}
#[test]
fn raw_generic_laws_cannot_treat_numeric_equality_as_bit_identity(){
 let authored=author("module parametric;law identity<T>(x:T){x==x;}").unwrap();
 let mut c=catalogue(&authored);let mut law=c.objects.values().next().unwrap().clone();
 let x=law.from.clone();law.from=s::op(s::value(syntax::Type::Bool),"binary:==",vec![x.clone(),x]);law.to=s::term(s::value(syntax::Type::Bool),Node::Bool(true));
 let id=registry::identity(&registry::Entry::from_law(&law).unwrap()).unwrap();c.roots=vec![id.clone()];c.objects=BTreeMap::from([(id,law)]);
 assert!(CheckedCatalogue::check(&c,&Program::default()).is_err());
}

#[test]
fn storage_observation_laws_check_generic_and_owned_instances() {
    let source=include_str!("../knowledge/libraries/storage-observations.ink");
    let authored=author(source).unwrap();
    for name in ["foldl_observe_append","buffer_push_append","list_append_fold","buffer_append_fold",
        "foldl_preserves","all_concat","buffer_all_push","buffer_fold_preserves"] {
        assert!(authored.names.contains_key(name));
    }
    CheckedCatalogue::check(&catalogue(&authored),&Program::default()).unwrap();
    let wrong=format!("{source}\nlaw bad(xs:List<u32>,initial:List<u32>){{foldl(xs,initial,fn(item,acc)=>acc)==initial.concat(xs);proof by use foldl_observe_append<u32,List<u32>>(xs,initial,fn(item,acc)=>acc,fn(acc)=>acc);}}");
    let error=author(&wrong).err().expect("unchecked step assumption accepted");
    assert!(error.contains("semantic normal forms differ"),"{error}");
    let wrong=format!("{source}\nlaw invalid(xs:List<u32>,initial:u32){{choose(initial<10&&foldr(xs,true,fn(item,ok)=>item<10&&ok),foldl(xs,initial,fn(item,acc)=>99)<10,true)==true;proof by use foldl_preserves<u32,u32>(xs,initial,fn(item,acc)=>99,fn(state)=>state<10,fn(item)=>item<10);}}");
    assert!(author(&wrong).is_err(),"a nonpreserving step received a fold invariant");
}

#[test]
fn local_relations_compose_checked_loop_steps_and_reject_false_frames() {
    let source=include_str!("../knowledge/libraries/local-relations.ink");
    let authored=author(source).unwrap();
    for name in ["foldl_frame","foldl_relates","foldl_simulates","independent_record_frame","buffer_list_relation"] {
        assert!(authored.names.contains_key(name));
    }
    CheckedCatalogue::check(&catalogue(&authored),&Program::default()).unwrap();
    let wrong=format!("{source}\nlaw corrupt_frame(xs:List<u32>,initial:Independent){{foldl(xs,initial,fn(item,acc)=>Independent{{total:acc.total+item,retained:!acc.retained}}).retained==initial.retained;proof by use foldl_frame<u32,Independent,Bool>(xs,initial,fn(item,acc)=>Independent{{total:acc.total+item,retained:!acc.retained}},fn(acc)=>acc.retained);}}");
    assert!(author(&wrong).is_err(),"a changed footprint was admitted as an unchanged frame");
    let wrong=format!("{source}\nlaw corrupt_relation(xs:List<u32>,p:List<u32>,l:List<u32>){{choose(p==l,foldl(xs,p,fn(item,acc)=>acc)==foldl(xs,l,fn(item,acc)=>acc.concat([item])),true)==true;proof by use foldl_simulates<u32,List<u32>,List<u32>>(xs,p,l,fn(item,acc)=>acc,fn(item,acc)=>acc.concat([item]),fn(p,l)=>p==l) assuming(normalize);}}");
    assert!(author(&wrong).is_err(),"a discarding step was admitted as a sequence simulation");
}

#[test]
fn simultaneous_join_deltas_retain_the_cross_term_and_signed_deletions_cancel() {
    let source=include_str!("../knowledge/libraries/incremental-laws.ink");
    let authored=author(source).unwrap();
    for name in ["join_sum_both_deltas","weighted_deletion_cancels","filtered_group_sum_append"] {
        assert!(authored.names.contains_key(name));
    }
    CheckedCatalogue::check(&catalogue(&authored),&Program::default()).unwrap();
    // Both original inputs are empty, but the two new rows join. Omitting the
    // change/change term would claim zero rather than one.
    assert!(author("module wrong;law missing_cross(){foldr(list(1),Int(0),fn(x,acc)=>foldr(list(1),Int(0),fn(y,a)=>Int(1)+a)+acc)==Int(0);}").is_err());
    assert!(author("module wrong;law wrong_sign(){Int(7)+Int(7)==Int(0);}").is_err());
}

#[test]
fn order_analysis_is_an_authored_tactic() {
    let ok = author(
        "module m;\nfn max(x: u32, y: u32) -> u32 { return choose(x > y, x, y); }\n\
         law max_swap(a: u32, b: u32, s: u32) {\n  max(a, max(b, s)) == max(b, max(a, s));\n  proof by order(a, b, s) then normalize;\n}\n\
         law clamp_bound(x: i32, lo: i32, hi: i32) {\n  requires lo <= hi;\n  choose(choose(x < lo, lo, x) > hi, hi, choose(x < lo, lo, x)) <= hi == true;\n  proof by order(x, lo, hi) then normalize;\n}\n",
    )
    .unwrap();
    let c = catalogue(&ok);
    for name in ["max_swap", "clamp_bound"] {
        let law = &c.objects[&ok.names[name]];
        assert_eq!(law.semantics, laws::GENERAL_SEMANTICS, "a new proof form carries the newer marker");
        assert!(matches!(law.proof, laws::Proof::Order { .. }));
    }
    // Without transitivity normalisation alone fails, and a false claim
    // fails in some ordering.
    rejects(
        "module m;\nfn max(x: u32, y: u32) -> u32 { return choose(x > y, x, y); }\n\
         law max_swap(a: u32, b: u32, s: u32) {\n  max(a, max(b, s)) == max(b, max(a, s));\n  proof by normalize;\n}\n",
        "semantic normal forms differ",
    );
    rejects(
        "module m;\nfn max(x: u32, y: u32) -> u32 { return choose(x > y, x, y); }\n\
         law max_drop(a: u32, b: u32, s: u32) {\n  max(a, max(b, s)) == max(a, s);\n  proof by order(a, b, s) then normalize;\n}\n",
        "semantic normal forms differ",
    );
    rejects(
        "module m;\nlaw floats(a: f32, b: f32) {\n  choose(a > b, a, b) == choose(b < a, a, b);\n  proof by order(a, b) then normalize;\n}\n",
        "words or exact Int",
    );
}
