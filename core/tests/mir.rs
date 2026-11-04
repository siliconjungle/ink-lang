use ink_core::{mir, syntax};

#[test]
fn programs_lower_to_verified_graphs_with_effect_order() {
    let p = syntax::parse("module m;
state A: u32 = 0;
state B: u32 = 0;
fn twice(x: u32) -> u32 { return (x + 1) * (x + 1); }
change bump(x: u32) -> u32 writes(A, B) { A = A + x; B = B + twice(x); return A; }
").unwrap();
    let mut m = mir::lower(&p);
    assert!(m.unsupported.is_empty(), "{:?}", m.unsupported);
    mir::verify(&m).unwrap();
    let bump = m.graphs.iter().find(|g| g.name == "bump").unwrap();
    assert_eq!(bump.placement, [mir::Place::Server]);
    assert_eq!(bump.writes, ["A", "B"]);
    // The two writes touch different states, so neither waits for the other.
    let writes: Vec<&mir::Node> = bump.body.nodes.iter().filter(|n| matches!(n.op, mir::Op::Write { .. })).collect();
    assert!(!writes[1].after.contains(&writes[0].id));
    assert!(mir::simplify(&mut m) >= 1);
    mir::verify(&m).unwrap();
    // A forged edge to a node in another region is rejected.
    let mut bad = m.clone();
    let g = bad.graphs.iter_mut().find(|g| g.name == "bump").unwrap();
    let last = g.body.nodes.len() - 1;
    let id = g.body.nodes[last].id;
    g.body.nodes[0].inputs.push(id);
    assert!(mir::verify(&bad).is_err());
}
