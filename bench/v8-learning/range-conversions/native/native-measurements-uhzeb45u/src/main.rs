// Offline adapter for the existing generated State::call_json ABI.
// Inputs/reference outputs are prepared outside timing. Every output is consumed.
use serde_json::{Value, json};
use sha2::{Digest,Sha256};
use std::{cell::RefCell, rc::Rc, time::Instant, hint::black_box};

struct Lane {
    measurement: String,
    call: Box<dyn FnMut(&str, &Value)->Result<Value,String>>,
    snapshot: Box<dyn Fn()->Result<Vec<u8>,String>>,
    setup_ns: u128,
}
fn same(a:&Value,b:&Value)->bool {
    match (a,b) {
        (Value::Number(a),Value::Number(b)) => match (a.is_f64(),b.is_f64()) {
            (false,false)=>a==b,
            (true,true)=>a.as_f64().map(f64::to_bits)==b.as_f64().map(f64::to_bits),
            // The typed ABI retains integer versus floating JSON numbers.
            // A lossy conversion must never hide a wrong wide-word result.
            _=>false,
        },
        (Value::Array(a),Value::Array(b)) => a.len()==b.len() && a.iter().zip(b).all(|(a,b)|same(a,b)),
        (Value::Object(a),Value::Object(b)) => a.len()==b.len() && a.iter().all(|(k,a)|b.get(k).is_some_and(|b|same(a,b))),
        _ => a==b,
    }
}
fn consume(value:&Value)->u64 {
    match value {
        Value::Null=>0,
        Value::Bool(v)=>u64::from(*v),
        Value::Number(v)=>v.as_u64().or_else(||v.as_i64().map(|n|n as u64)).unwrap_or_else(||v.as_f64().unwrap().to_bits()),
        Value::String(v)=>v.bytes().fold(0u64,|a,b|a.wrapping_mul(31)^u64::from(b)),
        Value::Array(v)=>v.iter().fold(0u64,|a,b|a.wrapping_mul(31)^consume(b)),
        Value::Object(v)=>v.values().fold(0u64,|a,b|a.wrapping_mul(31)^consume(b)),
    }
}
fn invoke(lane:&mut Lane,calls:&[Value],sink:&mut u64)->Result<(),String> {
    for call in calls {
        let output=(lane.call)(call["function"].as_str().unwrap(),&call["args"])?;
        *sink^=consume(black_box(&output));
    }
    Ok(())
}
fn validate(lane:&mut Lane,phases:&serde_json::Map<String,Value>,request:&Value)->Result<(),String> {
    let before=(lane.snapshot)()?;
    let own=request["artifacts"].as_array().unwrap().iter().find(|a|a["measurement"].as_str()==Some(&lane.measurement)).unwrap();
    let reference=own.get("reference_phases").map(|v|v.as_object().ok_or("refinement phases")).transpose()?.unwrap_or(phases);
    if reference.len()!=phases.len(){return Err("refinement changed phase schedule".into())}
    for (phase,calls) in phases {
        let expected=reference.get(phase).and_then(Value::as_array).ok_or("refinement phase missing")?;
        let calls=calls.as_array().unwrap();
        if expected.len()!=calls.len(){return Err("refinement changed calls".into())}
        for (call,reference) in calls.iter().zip(expected) {
            if call["function"]!=reference["function"]||call["args"]!=reference["args"]{return Err("refinement changed arguments".into())}
            let output=(lane.call)(call["function"].as_str().unwrap(),&call["args"])?;
            if !same(&output,&reference["expected"]){return Err("complete output differs from independent reference".into())}
        }
    }
    if (lane.snapshot)()?!=before{return Err("pure call changed portable snapshot".into())}
    Ok(())
}
fn shuffle(order:&mut [usize],seed:&mut u32) {
    for i in (1..order.len()).rev() {
        *seed^=*seed<<13;*seed^=*seed>>17;*seed^=*seed<<5;
        order.swap(i,(*seed as usize)%(i+1));
    }
}
fn run()->Result<(),String> {
    let bytes=std::fs::read(std::env::args().nth(1).ok_or("request required")?).map_err(|e|e.to_string())?;
    let expected=std::env::args().nth(2).ok_or("sealed request hash required")?;
    if format!("{:x}",Sha256::digest(&bytes))!=expected{return Err("measurement request hash mismatch".into())}
    let request:Value=serde_json::from_slice(&bytes).map_err(|e|e.to_string())?;
    let original=request.clone();
    let artifacts=request["artifacts"].as_array().ok_or("artifacts required")?;
    let phases=request["phases"].as_object().ok_or("phases required")?;
    let mut input_fingerprints=std::collections::BTreeSet::new();
    for calls in phases.values() {
        for call in calls.as_array().ok_or("phase calls required")? {
            let fingerprint=call["input_sha256"].as_str().ok_or("reference input fingerprint required")?;
            if fingerprint.len()!=64||!fingerprint.bytes().all(|b|b.is_ascii_digit()||(b'a'..=b'f').contains(&b)) {
                return Err("invalid reference input fingerprint".into());
            }
            input_fingerprints.insert(fingerprint);
        }
    }
    let rounds=request["measurement"]["rounds"].as_u64().unwrap_or(11);
    let minimum=request["measurement"]["minimum_batch_ms"].as_u64().unwrap_or(5);
    let maximum=request["measurement"]["maximum_calls_per_sample"].as_u64().unwrap_or(1024);
    if !(9..=64).contains(&rounds)||!(1..=50).contains(&minimum)||!(1..=65536).contains(&maximum){return Err("measurement bounds".into())}
    let mut lanes:Vec<Lane>=vec![];
    {
            let start=Instant::now();
            let state=Rc::new(RefCell::new(variant_0::State::new()));
            let setup_ns=start.elapsed().as_nanos();
            let caller=state.clone();let observer=state.clone();
            lanes.push(Lane{measurement:artifacts[0]["measurement"].as_str().unwrap().to_owned(),
                call:Box::new(move |function,args|caller.borrow_mut().call_json(function,args)),
                snapshot:Box::new(move ||observer.borrow().checkpoint()),setup_ns});
        }
{
            let start=Instant::now();
            let state=Rc::new(RefCell::new(variant_1::State::new()));
            let setup_ns=start.elapsed().as_nanos();
            let caller=state.clone();let observer=state.clone();
            lanes.push(Lane{measurement:artifacts[1]["measurement"].as_str().unwrap().to_owned(),
                call:Box::new(move |function,args|caller.borrow_mut().call_json(function,args)),
                snapshot:Box::new(move ||observer.borrow().checkpoint()),setup_ns});
        }
    let baseline=artifacts[0]["measurement"].as_str().unwrap();
    let mut rejected=vec![];let mut valid=vec![];
    for mut lane in lanes {
        match validate(&mut lane,phases,&request) {
            Ok(())=>valid.push(lane),
            Err(reason)=>rejected.push(json!({"measurement":lane.measurement,"reason":reason})),
        }
    }
    if !valid.iter().any(|lane|lane.measurement==baseline){return Err("baseline failed independent validation".into())}
    let process=match request.get("process_index"){None=>0,Some(value)=>value.as_u64().ok_or("bounded process index required")?};
    if process>7{return Err("bounded process index required".into())}
    let mut rows=vec![];let mut seed=0x7193abefu32^(process as u32).wrapping_mul(0x9e3779b9);let mut sink=0u64;
    for (phase,calls) in phases {
        let calls=calls.as_array().unwrap();let mut order:(Vec<usize>)=(0..valid.len()).collect();
        shuffle(&mut order,&mut seed);let mut counts=vec![0u64;valid.len()];
        let mut samples=vec![Vec::<String>::new();valid.len()];
        for &i in &order {
            for _ in 0..8{invoke(&mut valid[i],calls,&mut sink)?}
            let mut n=1;
            loop {
                let start=Instant::now();for _ in 0..n{invoke(&mut valid[i],calls,&mut sink)?}
                if start.elapsed().as_millis()>=u128::from(minimum)||n>=maximum{break}
                n=(n*2).min(maximum);
            }
            counts[i]=n;
        }
        for _ in 0..rounds {
            shuffle(&mut order,&mut seed);
            for &i in &order {
                let start=Instant::now();for _ in 0..counts[i]{invoke(&mut valid[i],calls,&mut sink)?}
                samples[i].push((start.elapsed().as_nanos()/u128::from(counts[i])/calls.len() as u128).to_string());
            }
        }
        for i in 0..valid.len(){rows.push(json!({"measurement":valid[i].measurement,"phase":phase,"complete_call_ns":samples[i],"calls_per_sample":counts[i],"phase_calls":calls.len()}))}
    }
    let mut accepted=std::collections::HashSet::new();
    for lane in &mut valid {
        match validate(lane,phases,&request) {
            Ok(())=>{accepted.insert(lane.measurement.clone());},
            Err(reason)=>rejected.push(json!({"measurement":lane.measurement,"reason":reason})),
        }
    }
    if !same(&request,&original)||!accepted.contains(baseline){return Err("input or baseline changed during measurement".into())}
    rows.retain(|row|accepted.contains(row["measurement"].as_str().unwrap()));
    let setup:Vec<_>=valid.iter().map(|lane|json!({"measurement":lane.measurement,"setup_ns":lane.setup_ns.to_string()})).collect();
    println!("{}",json!({"schema":1,"rows":rows,"rejected":rejected,"module_load":setup,"input_fingerprints":input_fingerprints,
        "input_fingerprint_semantics":"ink-reference-call-input-v1","sink":black_box(sink),
        "boundary":"existing JSON-call ABI, sealed request and reference-decoded input fingerprints; complete output consumption; constructor setup separately observed"}));
    Ok(())
}
fn main(){if let Err(error)=run(){eprintln!("{}",error);std::process::exit(1)}}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn wide_integer_results_cannot_compare_through_float_rounding() {
        for a in [1u64<<53,(1u64<<53)+1,u64::MAX-1] {
            let left=json!(a);let right=json!(a+1);
            assert!(!same(&left,&right));
            assert_ne!(consume(&left),consume(&right));
            assert!(!same(&json!({"nested":[left]}),&json!({"nested":[right]})));
        }
        let left=json!(i64::MIN);let right=json!(i64::MIN+1);
        assert!(!same(&left,&right));assert_ne!(consume(&left),consume(&right));
    }
    #[test]
    fn float_bits_and_integer_categories_remain_distinct() {
        assert!(same(&json!(1.25),&json!(1.25)));
        assert!(!same(&json!(0.0),&json!(-0.0)));
        assert_ne!(consume(&json!(0.0)),consume(&json!(-0.0)));
        assert!(!same(&json!(1u64),&json!(1.0)));
        assert!(same(&json!(u64::MAX),&json!(u64::MAX)));
    }
}
