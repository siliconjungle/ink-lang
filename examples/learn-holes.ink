module learn_holes;
// Two learnable holes. `recover` fills only the entries the authored state
// machine leaves undefined, so every input it handled keeps its result.
// `adjust` is a learned correction to an authored score, guarded by an
// `ensures` predicate with the authored result as fallback.
enum State { Start, Quoted, Closed, }
enum Class { Quote, Comma, Other, }
enum Step { Keep, Drop, End, }
fn authored(s: State, c: Class) -> Option<Step> {
  if s == State.Start && c == Class.Other { return Some(Step.Keep); }
  if s == State.Start && c == Class.Comma { return Some(Step.End); }
  if s == State.Start && c == Class.Quote { return Some(Step.Drop); }
  return None;
}
fn step(s: State, c: Class) -> Step {
  return authored(s, c).unwrap_or(learn recover(s, c): choice<Step>);
}
fn features(x: f32) -> List<f32> { return [x, x * x]; }
fn rank(x: f32) -> f32 ensures result >= 0.0 {
  return x + learn adjust(features(x)): Mlp<2, 4, 1> else 0.0;
}
query run(s: State, c: Class) -> Step { return step(s, c); }
query score(x: f32) -> f32 { return rank(x); }

record Case { s: State, c: Class, want: Step, }
record Point { x: f32, y: f32, }
objective mistakes(cases: List<Case>) -> f32 {
  return foldl(cases, 0.0, fn(k)=>fn(total)=>total + choose(step(k.s, k.c) == k.want, 0.0, 1.0));
}
objective fit(points: List<Point>) -> f32 {
  return foldl(points, 0.0, fn(q)=>fn(total)=>total + (rank(q.x) - q.y) * (rank(q.x) - q.y));
}
