//! Bounded typed generation. Seed/source/script/expected stay in build/ on failure.
use serde_json::{json, Value};
use verified_language::{eval, stateful::Runtime, syntax::parse};
#[path = "support/parity.rs"]
mod parity;
struct Generator(u64);
impl Generator {
    fn next(&mut self) -> u32 {
        self.0 = self
            .0
            .wrapping_mul(6364136223846793005)
            .wrapping_add(1442695040888963407);
        (self.0 >> 32) as u32
    }
    fn expression(&mut self, depth: usize) -> String {
        if depth == 0 {
            return if self.next() % 2 == 0 {
                "x".into()
            } else {
                self.next().to_string()
            };
        }
        let kind = self.next() % 6;
        let a = self.expression(depth - 1);
        let b = self.expression(depth - 1);
        match kind {
            0 => format!("({a}+{b})"),
            1 => format!("({a}-{b})"),
            2 => format!("({a}*{b})"),
            3 => format!("choose(x<{}, {a}, {b})", self.next()),
            4 => format!("quot_or({a},{b},{})", self.next()),
            _ => format!("repeat({}, {a}, fn(i)=>fn(acc)=>acc+i)", self.next() % 5),
        }
    }
}
#[test]
fn reproducible_generated_programs_and_action_histories_agree() {
    let seeds: Vec<u64> = std::env::var("INK_PARITY_SEEDS")
        .map(|s| {
            s.split(',')
                .map(|n| n.parse().expect("decimal parity seed"))
                .collect()
        })
        .unwrap_or_else(|_| vec![1, 7, 23, 3735928559]);
    assert!(
        !seeds.is_empty() && seeds.len() <= 64,
        "1..64 seeds required"
    );
    let mut source = include_str!("../examples/inventory.lang").to_string();
    source.push_str("\nchange remove(id:ItemId)->Result<Option<Item>,Error> writes(Items){return Ok(Items.remove(id));}\nchange abort(id:ItemId)->Result<Unit,Error> writes(Items) emits(stock_changed){restock(id,1)?;return Err(Error.Overflow);}\n");
    let mut calls: Vec<Value> = vec![];
    for (index, seed) in seeds.iter().enumerate() {
        let mut g = Generator(*seed);
        for n in 0..4 {
            let name = format!("generated_{index}_{n}");
            source.push_str(&format!(
                "fn {name}(x:u32)->u32{{return {};}}\n",
                g.expression(3)
            ));
            for x in [0, 1, u32::MAX, g.next(), g.next(), g.next()] {
                calls.push(json!({"pure":name,"args":[x]}));
            }
        }
        for n in 0..4 {
            let name = format!("array_{index}_{n}");
            let k = g.next() % 17;
            let expr = match n {
                0 => format!("xs.map(fn(x)=>x+{k}).filter(fn(x)=>x<7).scan().sort()"),
                1 => format!("choose(b,xs,xs.filter(fn(x)=>x>0)).map_indexed(fn(i)=>fn(x)=>x+{k})"),
                2 => format!("repeat(3,xs,fn(i)=>fn(acc)=>acc.map(fn(x)=>x+{k}))"),
                _ => "xs.zip(xs.filter(fn(x)=>x>0),fn(x)=>fn(y)=>x-y).sort()".into(),
            };
            source.push_str(&format!(
                "fn {name}(xs:List<i32>,b:Bool)->List<i32>{{return {expr};}}\n"
            ));
            for length in [0, 1, 3, 7, 16] {
                let xs: Vec<i32> = (0..length).map(|_| g.next() as i32).collect();
                calls.push(json!({"pure":name,"args":[xs,g.next()%2==0],"expect_gpu":true}));
            }
        }
    }
    std::fs::create_dir_all("build/generated-parity").unwrap();
    std::fs::write("build/generated-parity/source.ink", &source).unwrap();
    std::fs::write(
        "build/generated-parity/seeds.json",
        serde_json::to_vec(&seeds).unwrap(),
    )
    .unwrap();
    let p = parse(&source).unwrap();
    let mut r = Runtime::new(p.clone()).unwrap();
    let mut steps = vec![];
    let mut expected = vec![];
    let mut record = |step: Value, r: &mut Runtime| {
        if step["restore"].is_array() {
            steps.push(step);
            return;
        }
        if step["acknowledge"].is_array() {
            r.acknowledge_through(
                step["acknowledge"][0].as_u64().unwrap(),
                step["acknowledge"][1].as_u64().unwrap(),
            );
            steps.push(step);
            return;
        }
        let reply = if let Some(name) = step["pure"].as_str() {
            let f = p.functions.iter().find(|f| f.name == name).unwrap();
            let inputs = step["args"]
                .as_array()
                .unwrap()
                .iter()
                .zip(&f.params)
                .map(|(v, (_, t))| eval::Value::from_program_json(v, t, &p).unwrap())
                .collect();
            let value = eval::call(&p, name, inputs, &mut 100000000).unwrap().json();
            json!({"value":value})
        } else {
            match r.invoke_json(step["call"].as_str().unwrap(), &step["args"]) {
                Ok(o) => json!({"outcome":o.json()}),
                Err(e) => json!({"host_error":e}),
            }
        };
        steps.push(step);
        expected.push(json!({"reply":reply,"snapshot":r.checkpoint_portable().unwrap()}));
    };
    for call in calls {
        record(call, &mut r);
    }
    for seed in &seeds {
        let mut g = Generator(*seed);
        for i in 0..64 {
            let id = format!("{:032x}", g.next() % 8);
            let action = g.next() % 7;
            let (call, args) = match action {
                0 => (
                    "create",
                    json!([id, format!("seed {seed} 雪\u{0}😀"), g.next() % 100]),
                ),
                1 => (
                    "restock",
                    json!([id, if i % 9 == 0 { u32::MAX } else { g.next() % 10 }]),
                ),
                2 => ("remove", json!([id])),
                3 => ("abort", json!([id])),
                4 => ("stock_of", json!([id])),
                _ => ("total", json!([])),
            };
            record(json!({"call":call,"args":args}), &mut r);
            if i % 16 == 15 {
                let bytes = r.checkpoint_portable().unwrap();
                r = Runtime::restore_portable(p.clone(), &bytes).unwrap();
                record(json!({"restore":bytes}), &mut r);
            }
        }
    }
    let name = "generated-parity";
    std::fs::create_dir_all(format!("build/{name}")).unwrap();
    std::fs::write(
        format!("build/{name}/seeds.json"),
        serde_json::to_vec(&seeds).unwrap(),
    )
    .unwrap();
    parity::conformance(name, p, &source, steps, expected);
}
