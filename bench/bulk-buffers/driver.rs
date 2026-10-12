use compiled_state::State;
use std::{hint::black_box, time::Instant};
fn voxel_control(mut xs: Vec<u32>, width: u32, height: u32) -> Vec<u32> {
    for y in 0..height {
        let start = (y * width + 1) as usize;
        xs[start..start + (width - 2) as usize].fill(9);
    }
    xs
}
fn decode_control(xs: Vec<u32>, maximum: u32) -> Vec<u32> {
    assert!(xs[0] <= maximum);
    let mut out = vec![0; xs[0] as usize];
    let mut at = 0;
    for pair in xs[1..].chunks_exact(2) {
        let n = pair[0] as usize;
        assert!(n > 0 && n <= out.len() - at);
        out[at..at + n].fill(pair[1]);
        at += n;
    }
    assert_eq!(at, out.len());
    out
}
fn erase_control(mut xs: Vec<u32>, start: u32, count: u32) -> Vec<u32> {
    let n = xs.len();
    let start = (start as usize).min(n);
    let count = (count as usize).min(n - start);
    xs.copy_within(start + count..n, start);
    xs.truncate(n - count);
    xs
}
fn call(state: &mut State, workload: usize, which: usize, input: Vec<u32>, n: u32) -> Vec<u32> {
    match (workload, which) {
        (0, 0) => state.function_l_voxel_bulk(input, 64, n / 64),
        (0, 1) => state.function_l_voxel_scalar(input, 64, n / 64, 1, 0, 0, 62, n / 64, 1, 9),
        (0, _) => voxel_control(input, 64, n / 64),
        (1, 0) => state.function_l_decode_bulk(input, n).unwrap(),
        (1, 1) => state.function_l_decode_scalar(input, n).unwrap(),
        (1, _) => decode_control(input, n),
        (2, 0) => state.function_l_erase_bulk(input, n / 4, n / 2),
        (2, 1) => state.function_l_erase_scalar(input, n / 4, n / 2),
        _ => erase_control(input, n / 4, n / 2),
    }
}
fn measure(workload: usize, which: usize, xs: &[u32], n: u32, repetitions: usize) -> f64 {
    let mut state = State::new();
    let start = Instant::now();
    for _ in 0..repetitions {
        black_box(call(&mut state, workload, which, black_box(xs.to_vec()), n));
    }
    start.elapsed().as_nanos() as f64 / repetitions as f64
}
fn main() {
    let mut results = vec![];
    for n in [1024u32, 16384, 65536] {
        for workload in 0..3 {
            let xs = if workload == 1 {
                let mut xs = vec![n];
                for i in 0..16 {
                    xs.extend([n / 16, i]);
                }
                xs
            } else {
                (0..n).collect::<Vec<_>>()
            };
            let mut state = State::new();
            let want = call(&mut state, workload, 2, xs.clone(), n);
            for k in 0..2 {
                assert_eq!(call(&mut state, workload, k, xs.clone(), n), want);
            }
            let repetitions: [usize; 3] = std::array::from_fn(|k| {
                let estimate = measure(workload, k, &xs, n, 4);
                (20_000_000.0 / estimate).clamp(1.0, 4000.0) as usize
            });
            let mut samples: [Vec<f64>; 3] = std::array::from_fn(|_| vec![]);
            for round in 0..9 {
                for offset in 0..3 {
                    let k = (round + offset) % 3;
                    samples[k].push(measure(workload, k, &xs, n, repetitions[k]));
                }
            }
            let median: [f64; 3] = std::array::from_fn(|k| {
                let mut values = samples[k].clone();
                values.sort_by(f64::total_cmp);
                values[4]
            });
            results.push(serde_json::json!({"workload":(["voxel_box_paint","run_decode","ecs_column_erase"][workload]),"n":n,"repetitions":repetitions,"samples_ns":samples,"median_ns":median}));
        }
    }
    println!("{}", serde_json::to_string_pretty(&results).unwrap());
}
