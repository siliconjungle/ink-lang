module routing;
// A routing table learned only through authored code that compares two
// lookups. Circles and stars of the same colour and size must share a bin,
// and it must not be Reject. From the untrained table (Reject everywhere),
// changing any one entry leaves every pair unequal, so one-entry-at-a-time
// search makes no progress. Gradients through the circuit of `consistent`
// move both entries of a pair together.
enum Color { Red, Green, Blue, Gray, }
enum Size { Small, Medium, Large, }
enum Shape { Circle, Square, Star, }
enum Bin { Reject, North, South, East, West, }

fn authored(c: Color, s: Size, h: Shape) -> Option<Bin> {
  if c == Color.Gray { return Some(Bin.Reject); }
  return None;
}
fn route(c: Color, s: Size, h: Shape) -> Bin {
  return authored(c, s, h).unwrap_or(learn pick(c, s, h): choice<Bin>);
}
fn consistent(c: Color, s: Size) -> Bool {
  let a = route(c, s, Shape.Circle);
  return a == route(c, s, Shape.Star) && a != Bin.Reject;
}
query check(c: Color, s: Size) -> Bool { return consistent(c, s); }

record Case { c: Color, s: Size, want: Bool, }
objective mistakes(cases: List<Case>) -> f32 {
  return foldl(cases, 0.0, fn(k)=>fn(total)=>total + choose(consistent(k.c, k.s) == k.want, 0.0, 1.0));
}
