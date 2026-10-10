use std::{hint::black_box, time::Instant};
fn measure(which: usize, case: usize, xs: &[u32], reps: usize) -> f64 {
    let mut base = baseline::State::new();
    let mut selected = selected::State::new();
    let start = Instant::now();
    for _ in 0..reps {
        let input = black_box(xs.to_vec());
        match (which, case) {
            (0, 0) => {
                black_box(base.function_l_sorted_count(input));
            }
            (1, 0) => {
                black_box(selected.function_l_sorted_count(input));
            }
            (0, 1) => {
                black_box(base.function_l_sorted_length(input));
            }
            (1, 1) => {
                black_box(selected.function_l_sorted_length(input));
            }
            (0, 2) => {
                black_box(base.function_l_sorted_sum(input));
            }
            (1, 2) => {
                black_box(selected.function_l_sorted_sum(input));
            }
            _ => unreachable!(),
        }
    }
    start.elapsed().as_nanos() as f64 / reps as f64
}
fn main() {
    let mut results = vec![];
    for n in [256, 4096, 65536] {
        let xs = (0..n)
            .map(|i| i.wrapping_mul(2654435761u32).wrapping_add(i % 31))
            .collect::<Vec<_>>();
        let total = xs.iter().fold(0u32, |a, x| a.wrapping_add(*x));
        let mut base = baseline::State::new();
        let mut selected = selected::State::new();
        assert_eq!(base.function_l_sorted_count(xs.clone()), n as u64);
        assert_eq!(selected.function_l_sorted_count(xs.clone()), n as u64);
        assert_eq!(base.function_l_sorted_length(xs.clone()), n);
        assert_eq!(selected.function_l_sorted_length(xs.clone()), n);
        assert_eq!(base.function_l_sorted_sum(xs.clone()), total);
        assert_eq!(selected.function_l_sorted_sum(xs.clone()), total);
        for (case, name) in [
            "count_after_sort",
            "length_after_sort",
            "integer_sum_after_sort",
        ]
        .iter()
        .enumerate()
        {
            let reps: [usize; 2] = std::array::from_fn(|which| {
                measure(which, case, &xs, 3);
                let one = measure(which, case, &xs, 3);
                ((100_000_000f64 / one) as usize).clamp(1, 2000)
            });
            let mut samples: [Vec<f64>; 2] = std::array::from_fn(|_| vec![]);
            for round in 0..9 {
                for offset in 0..2 {
                    let which = (round + offset) % 2;
                    samples[which].push(measure(which, case, &xs, reps[which]));
                }
            }
            let median: [f64; 2] = std::array::from_fn(|k| {
                let mut x = samples[k].clone();
                x.sort_by(f64::total_cmp);
                x[4]
            });
            results.push(
                serde_json::json!({"case":name,"n":n,"repetitions":reps,"samples_ns":samples,
                "median_ns":median,"baseline_over_selected":median[0]/median[1]}),
            );
        }
    }
    println!("{}", serde_json::to_string_pretty(&results).unwrap());
}
