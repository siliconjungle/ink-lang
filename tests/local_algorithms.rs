use serde_json::{json, Value};
use std::collections::VecDeque;
use verified_language::{
    core::CheckedModule,
    eval,
    syntax::{parse, Program},
};
const SOURCE: &str = include_str!("../examples/local-pathfinding.ink");
fn run(p: &Program, name: &str, args: Value) -> Value {
    let f = p.functions.iter().find(|f| f.name == name).unwrap();
    let vs = args
        .as_array()
        .unwrap()
        .iter()
        .zip(&f.params)
        .map(|(v, (_, t))| eval::Value::from_program_json(v, t, p).unwrap())
        .collect();
    eval::call(p, name, vs, &mut 100_000_000).unwrap().json()
}
fn next(seed: &mut u32) -> u32 {
    *seed = seed.wrapping_mul(1664525).wrapping_add(1013904223);
    *seed
}
fn bfs(grid: &[u32], width: usize, start: usize, goal: usize) -> Option<usize> {
    let mut distances = vec![usize::MAX; grid.len()];
    distances[start] = 0;
    let mut queue = VecDeque::from([start]);
    while let Some(node) = queue.pop_front() {
        if node == goal {
            return Some(distances[node]);
        }
        for target in [
            node.checked_sub(width),
            node.checked_add(width).filter(|n| *n < grid.len()),
            (node % width > 0).then(|| node - 1),
            (node % width + 1 < width).then(|| node + 1),
        ]
        .into_iter()
        .flatten()
        {
            if grid[target] == 0 && distances[target] == usize::MAX {
                distances[target] = distances[node] + 1;
                queue.push_back(target);
            }
        }
    }
    None
}
fn cases(p: &Program) -> (Vec<Value>, Vec<Value>) {
    let mut steps = vec![];
    let mut values = vec![];
    let mut seed = 0x1a2b3c4d;
    for size in [0, 1, 2, 3, 8, 31, 64] {
        for _ in 0..3 {
            let mut xs = (0..size).map(|_| next(&mut seed) % 17).collect::<Vec<_>>();
            if size > 1 {
                xs[0] = u32::MAX;
                xs[1] = 0;
            }
            let args = json!([xs]);
            xs.sort();
            let v = run(p, "heap_sorted", args.clone());
            assert_eq!(v, json!(xs));
            steps.push(json!({"pure":"heap_sorted","args":args}));
            values.push(v);
        }
    }
    for width in [3, 4, 6] {
        for _ in 0..8 {
            let mut grid = (0..width * width)
                .map(|_| u32::from(next(&mut seed) % 5 == 0))
                .collect::<Vec<_>>();
            let start = (next(&mut seed) as usize) % grid.len();
            let goal = (next(&mut seed) as usize) % grid.len();
            grid[start] = 0;
            grid[goal] = 0;
            let args = json!([grid, width, start, goal, grid.len() * 8]);
            let v = run(p, "astar", args.clone());
            let want = bfs(&grid, width, start, goal);
            assert_eq!(v["found"], want.is_some());
            assert_eq!(v["limited"], false);
            let path = v["path"]
                .as_array()
                .unwrap()
                .iter()
                .map(|n| n.as_u64().unwrap() as usize)
                .collect::<Vec<_>>();
            if let Some(distance) = want {
                assert_eq!(v["distance"], distance);
                assert_eq!(path.len(), distance + 1);
                assert_eq!(path.first(), Some(&start));
                assert_eq!(path.last(), Some(&goal));
                for node in &path {
                    assert_eq!(grid[*node], 0);
                }
                for edge in path.windows(2) {
                    let (a, b) = (edge[0], edge[1]);
                    assert_eq!(
                        (a % width).abs_diff(b % width) + (a / width).abs_diff(b / width),
                        1
                    );
                }
            } else {
                assert!(path.is_empty());
            }
            steps.push(json!({"pure":"astar","args":args}));
            values.push(v);
        }
    }
    for (args, want) in [
        (
            json!([[0], 1, 0, 0, 0]),
            json!({"found":false,"distance":0,"expanded":0,"limited":true,"path":[]}),
        ),
        (
            json!([[0], 1, 0, 0, 1]),
            json!({"found":true,"distance":0,"expanded":0,"limited":false,"path":[0]}),
        ),
        (
            json!([[0], 0, 0, 0, 5]),
            json!({"found":false,"distance":0,"expanded":0,"limited":false,"path":[]}),
        ),
        (
            json!([[1], 1, 0, 0, 5]),
            json!({"found":false,"distance":0,"expanded":0,"limited":false,"path":[]}),
        ),
    ] {
        let v = run(p, "astar", args.clone());
        assert_eq!(v, want);
        steps.push(json!({"pure":"astar","args":args}));
        values.push(v);
    }
    (steps, values)
}
#[test]
fn heap_matches_sort_and_astar_matches_independent_bfs() {
    let p = CheckedModule::from_source(parse(SOURCE).unwrap())
        .unwrap()
        .into_program();
    cases(&p);
}
#[path = "support/parity.rs"]
mod parity;
#[test]
fn owned_algorithms_agree_across_cpu_backends() {
    // Exercise a normal query alongside pure functions, including its host ABI.
    let source = format!(
        r#"{SOURCE}
query readiness()->u32{{return 1;}}
query route(grid:List<u32>,width:u32,start:u32,goal:u32,limit:u32)->Route{{return astar(grid,width,start,goal,limit);}}
fn buffer_ops(xs:List<i32>,n:u32)->List<i32>{{let b=buffer(xs);let b=b.set(0,-7).swap(0,1).push(9).truncate(n).pop();return b.freeze();}}
fn filled(n:u32)->List<u32>{{let b:Buffer<u32> =buffer_fill(n,42);return b.swap(0,99).set(99,0).truncate(2).freeze();}}
fn map_keys()->List<i32>{{let m:Map<i32,u64> =Map.empty();let m=m.set(-2,99).set(5,18446744073709551615).set(-2,7).remove(0);return m.keys();}}
fn map_values()->List<u64>{{let m:Map<i32,u64> =Map.empty();let m=m.set(-2,99).set(5,18446744073709551615).set(-2,7).remove(0);return m.values();}}
fn map_removed()->u32{{let m:Map<u64,u32> =Map.empty();let m=m.set(18446744073709551615,9).remove(18446744073709551615);return m.get_or(18446744073709551615,3)+m.len();}}
fn map_bool()->List<u32>{{let m:Map<Bool,u32> =Map.empty();let m=m.set(true,1).set(false,2);return m.values();}}
fn stopping(limit:u32)->u32{{return repeat_until(limit,0,fn(x)=>x>=3,fn(i)=>fn(x)=>x+1);}}
"#
    );
    let p = parse(&source).unwrap();
    let (mut steps, mut values) = cases(&p);
    for (name, args, want) in [
        ("buffer_ops", json!([[1, 2, 3], 9]), json!([2, -7, 3])),
        ("buffer_ops", json!([[], 0]), json!([])),
        ("filled", json!([4]), json!([42, 42])),
        ("filled", json!([0]), json!([])),
        ("map_keys", json!([]), json!([-2, 5])),
        ("map_values", json!([]), json!([7, u64::MAX])),
        ("map_removed", json!([]), json!(3)),
        ("map_bool", json!([]), json!([2, 1])),
        ("stopping", json!([0]), json!(0)),
        ("stopping", json!([10]), json!(3)),
    ] {
        let value = run(&p, name, args.clone());
        assert_eq!(value, want);
        steps.push(json!({"pure":name,"args":args}));
        values.push(value);
    }
    let mut r = verified_language::stateful::Runtime::new(p.clone()).unwrap();
    let snapshot = r.checkpoint_portable().unwrap();
    let mut expected: Vec<Value> = values
        .into_iter()
        .map(|v| json!({"reply":{"value":v},"snapshot":snapshot}))
        .collect();
    let args = json!([[0, 0, 0, 0], 2, 0, 3, 16]);
    let route = run(&p, "astar", args.clone());
    steps.push(json!({"call":"route","args":args}));
    let outcome = r.invoke_json("route", &args).unwrap();
    assert_eq!(outcome.result.json(), route);
    expected.push(json!({"reply":{"outcome":outcome.json()},"snapshot":snapshot}));
    steps.push(json!({"pure":"heap_build","args":[[]]}));
    expected.push(json!({"reply":{"host_error":"temporary storage is internal to a pure invocation"},"snapshot":snapshot}));
    parity::conformance("local-algorithms", p, &source, steps, expected);
}
