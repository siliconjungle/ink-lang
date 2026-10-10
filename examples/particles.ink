module Particles;
record Particle { position: Vec3<f32>, velocity: Vec3<f32>, mass: f32, }
// Position and velocity are logical values; their storage is selected by the host.
fn kick(velocities: List<Vec3<f32>>, dt: f32, gravity: Vec3<f32>) -> List<Vec3<f32>> {
 return velocities.map(fn(v) => vec3(v.x + gravity.x * dt, v.y + gravity.y * dt, v.z + gravity.z * dt));
}
fn drift(positions: List<Vec3<f32>>, velocities: List<Vec3<f32>>, dt: f32) -> List<Vec3<f32>> {
 return positions.zip(velocities, fn(p) => fn(v) => vec3(p.x + v.x * dt, p.y + v.y * dt, p.z + v.z * dt));
}
fn particles(xs: List<Particle>, dt: f32) -> List<Particle> {
 return xs.map(fn(p) => Particle { position: vec3(p.position.x + p.velocity.x * dt, p.position.y + p.velocity.y * dt, p.position.z + p.velocity.z * dt), velocity: p.velocity, mass: p.mass });
}
fn gather(xs: List<i32>, indices: List<u32>) -> List<i32> {
 return indices.map(fn(i) => xs.at_or(i, -99));
}
fn indexed(xs: List<i32>) -> List<i32> {
 return xs.map_indexed(fn(i) => fn(x) => choose(rem_or(i, 2, 0) == 0, x * -2, x + 7));
}
fn iterate(xs: List<i32>) -> List<i32> {
 return xs.map(fn(x) => repeat(8, x, fn(i) => fn(acc) => acc * 3 + 1));
}
fn matrix4(rows: List<f32>, columns: List<f32>) -> List<f32> {
 return rows.map_indexed(fn(i) => fn(unused) => repeat(4, 0.0, fn(k) => fn(acc) => acc + rows.at_or(quot_or(i, 4, 0) * 4 + k, 0.0) * columns.at_or(k * 4 + rem_or(i, 4, 0), 0.0)));
}
fn prefix(xs: List<i32>) -> List<i32> { return xs.scan(); }
fn ordered(xs: List<i32>) -> List<i32> { return xs.sort(); }
fn ordered_sum(xs: List<f32>) -> f32 { return sum(xs); }
fn locals(x: i32) -> i32 { let y: i32 = x * -2; return y + 1; }
fn negative_words(xs: List<u32>) -> List<u32> { return xs.map(fn(x) => -x); }
fn division(xs: List<i32>, divisor: i32) -> List<i32> { return xs.map(fn(x) => quot_or(x, divisor, -99)); }
fn mask(xs: List<i32>) -> List<Bool> { return xs.map(fn(x) => x < 0); }
fn local_step(x: i32) -> i32 { let y: i32 = x * 3; return choose(y < 0, y + 1, y - 1); }
fn helper(xs: List<i32>) -> List<i32> { return xs.map(fn(x) => local_step(x)); }
