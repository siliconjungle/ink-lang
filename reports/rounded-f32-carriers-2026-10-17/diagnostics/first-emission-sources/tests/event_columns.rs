use std::{fs,process::Command};

#[test]
fn column_event_log_preserves_order_truncation_acknowledgement_and_wide_values(){
 let dir=std::env::temp_dir().join(format!("ink-event-columns-{}",std::process::id()));fs::create_dir_all(&dir).unwrap();
 let fixture=r#"
import assert from 'node:assert/strict';
for(const channels of [['only'],['a','b']])for(const compact of [false,true])for(const runs of [false,true]){
 const log=new __EventColumns(channels,compact,runs),reference=[];
 for(let i=0;i<12000;i++){const e={commit:BigInt(i+1)+(1n<<53n),position:BigInt(i%5),channel:channels[i%channels.length],value:i%2?{nested:[BigInt(i)]}:18446744073709551615n};log.push(e);reference.push(e);}
 assert.equal(log.length,reference.length);assert.deepEqual([...log],reference);assert.deepEqual(log.at(-1),reference.at(-1));
 assert.deepEqual(log.map(e=>e.value),reference.map(e=>e.value));
 const tail=log.filter(e=>e.commit>reference[100].commit||e.commit===reference[100].commit&&e.position>reference[100].position);
 assert.deepEqual([...tail],reference.slice(101));
 const mark=log.length;log.append(18446744073709551615n,18446744073709551615n,channels[0],{nested:[1n]});log.length=mark;
 assert.deepEqual([...log],reference);assert.deepEqual([...tail],reference.slice(101));
 log.length=17;log.append(99n,0n,channels[0],3n);assert.deepEqual([...log],[...reference.slice(0,17),{commit:99n,position:0n,channel:channels[0],value:3n}]);
 assert.throws(()=>{log.length=100;});log.length=0;log.append(2n,0n,channels[0],4n);assert.equal(log.length,1);assert.equal(log.at(1),undefined);assert.deepEqual(log.at(0),{commit:2n,position:0n,channel:channels[0],value:4n});
 const restored=__eventLog({eventColumns:true,eventRuns:runs,compactCommits:compact,events:channels.map(name=>({name}))},reference);assert.deepEqual([...restored],reference);
}
for(const compact of [false,true]){
 const log=new __EventColumns(['only'],compact,true),reference=[];
 for(const commit of [9007199254740990n,9007199254740991n,9007199254740992n,9007199254740993n]){const e={commit,position:0n,channel:'only',value:commit};log.push(e);reference.push(e);}
 assert.equal(log.commits,null);assert.deepEqual([...log],reference);
 log.push({commit:reference.at(-1).commit,position:1n,channel:'only',value:7n});reference.push({commit:reference.at(-1).commit,position:1n,channel:'only',value:7n});
 assert(Array.isArray(log.commits));assert.deepEqual([...log],reference);
 log.length=0;log.push({commit:18446744073709551614n,position:0n,channel:'only',value:8n});log.push({commit:18446744073709551615n,position:0n,channel:'only',value:9n});
 assert.equal(log.commits,null);assert.equal(log.at(-1).commit,18446744073709551615n);
 const mixed=new __EventColumns(['only'],compact,true),ordinary=[];
 for(let i=0;i<1000;i++){const e={commit:BigInt(Math.floor(i/3)*2+1),position:BigInt(i%3),channel:'only',value:BigInt(i)};mixed.push(e);ordinary.push(e);}
 assert.deepEqual([...mixed],ordinary);assert.deepEqual([...mixed.filter(e=>e.commit>71n)],ordinary.filter(e=>e.commit>71n));
}
"#;
 fs::write(dir.join("run.mjs"),format!("{}\n{fixture}",include_str!("../src/event_columns.mjs"))).unwrap();
 let out=Command::new("node").arg(dir.join("run.mjs")).output().unwrap();fs::remove_dir_all(dir).unwrap();assert!(out.status.success(),"{}",String::from_utf8_lossy(&out.stderr));
}
