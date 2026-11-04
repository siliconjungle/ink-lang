module relaxed_holes;
// Two table entries that only help together. From the untrained table
// (Side.Left everywhere) changing either entry alone makes the objective
// worse, so coordinate search stops at loss 1. Under the relaxed meaning each
// entry is a distribution, the expected objective falls as both move towards
// Side.Right together, and hardening reaches loss 0.
enum Side { Left, Right, }
fn authored(first: Bool) -> Option<Side> { return None; }
fn side(first: Bool) -> Side {
  return authored(first).unwrap_or(learn pick(first): choice<Side>);
}
fn coupled() -> f32 {
  let a = side(true) == Side.Right;
  let b = side(false) == Side.Right;
  return choose(a && b, 0.0, choose(a || b, 2.0, 1.0));
}
objective cost(scale: f32) -> f32 { return scale * coupled(); }
query sides() -> List<Side> { return [side(true), side(false)]; }
