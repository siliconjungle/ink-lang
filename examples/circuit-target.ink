module crossing;
// A pedestrian crossing controller over finite types only, so `ink
// emit-circuit` can lower it to an exact affine/ReLU/ReGLU network and check
// every one of its 48 inputs against the reference evaluator.
//
// `override` is a learn hole on the error path: the authored rules return None
// for situations they do not cover, and the learned table decides those. In
// the circuit the table is a lookup layer whose weights are its rows.
enum Light { Green, Amber, Red, Walk, }
enum Timer { Early, Late, Expired, }
enum Sensor { Clear, Waiting, }

fn authored(light: Light, timer: Timer, sensor: Sensor) -> Option<Light> {
  if light == Light.Green && sensor == Sensor.Clear { return Some(Light.Green); }
  if light == Light.Green && timer == Timer.Expired { return Some(Light.Amber); }
  if light == Light.Amber { return choose(timer == Timer.Early, Some(Light.Amber), Some(Light.Red)); }
  if light == Light.Red && sensor == Sensor.Waiting { return Some(Light.Walk); }
  if light == Light.Walk && timer != Timer.Expired { return Some(Light.Walk); }
  return None;
}
fn next(light: Light, timer: Timer, sensor: Sensor) -> Light {
  return authored(light, timer, sensor).unwrap_or(learn override(light, timer, sensor): choice<Light>);
}
fn safe(light: Light, timer: Timer, sensor: Sensor) -> Bool {
  let after = next(light, timer, sensor);
  return !(light == Light.Walk && after == Light.Green) && (after != Light.Walk || light == Light.Red || light == Light.Walk);
}
query step(light: Light, timer: Timer, sensor: Sensor) -> Light { return next(light, timer, sensor); }

record Case { light: Light, timer: Timer, sensor: Sensor, want: Light, }
objective mistakes(cases: List<Case>) -> f32 {
  return foldl(cases, 0.0, fn(k)=>fn(total)=>total + choose(next(k.light, k.timer, k.sensor) == k.want, 0.0, 1.0));
}
