"""Keep exact raw locals while sharing their numeric decoding in arithmetic."""
from pathlib import Path
import subprocess,hashlib,json
here=Path(__file__).parent;root=here.parents[1];base=root/'lowerings/js';out=here/'decoded';out.mkdir(exist_ok=False);package=out/'package';package.mkdir()
for f in filter(None,subprocess.check_output(['git','ls-files','-z'],cwd=base).decode().split('\0')):
 p=base/f
 if p.is_file():q=package/f;q.parent.mkdir(parents=True,exist_ok=True);q.write_bytes(p.read_bytes())
def edit(name,a,b):
 p=package/name;s=p.read_text();assert s.count(a)==1,(name,s.count(a),a[:100]);p.write_text(s.replace(a,b))
edit('src/lib.rs','bit_f32_numbers: BTreeSet<String>,','bit_f32_numbers: BTreeSet<String>,\n    bit_f32_decoded: BTreeMap<String,String>,')
edit('src/lib.rs','bit_f32_numbers: BTreeSet::new(),','bit_f32_numbers: BTreeSet::new(),\n        bit_f32_decoded: BTreeMap::new(),')
edit('src/helper_inline.rs','let bit_floats = e.bit_f32_numbers.clone();','let bit_floats = e.bit_f32_numbers.clone();\n    let decoded=e.bit_f32_decoded.clone();')
edit('src/helper_inline.rs','e.bit_f32_numbers = bit_floats;','e.bit_f32_numbers = bit_floats;\n    e.bit_f32_decoded=decoded;')
edit('src/lib.rs','''let mut local = env.clone();
                local.insert(n.clone(), (value, at));
                self.expr(b, &local, Some(&t))?''','''if !self.native_f32 && at==Type::F32 && !native_number
                    && !self.bit_f32_decoded.contains_key(&value) && self.float_consumer(b,n) {
                    // The exact immutable bits remain available to copies,
                    // negation, opaque calls, NaN payload observations and ABI.
                    let decoded=self.bind(&format!("__float({value})"));
                    self.bit_f32_decoded.insert(value.clone(),decoded);
                }
                let mut local = env.clone();
                local.insert(n.clone(), (value, at));
                self.expr(b, &local, Some(&t))?''')
edit('src/float_islands.rs','''if self.bit_f32_numbers.contains(local) { return Ok(local.clone()); }''','''if self.bit_f32_numbers.contains(local) { return Ok(local.clone()); }
            if let Some(decoded)=self.bit_f32_decoded.get(local){return Ok(decoded.clone());}''')
# Parameter facts are created only for immutable nonrecursive scalar arguments.
# The same bounded optional opportunity scan is shared with local arithmetic.
edit('src/lib.rs','''if !self.native_f32 {return;}
        let used=ink_core::analysis::free_variables(&f.body);''','''if !self.native_f32 {
            if !ink_core::recursion::recursive(f) {
                for ((name,ty),value) in f.params.iter().zip(vars) {
                    if *ty==Type::F32 && self.float_consumer(&f.body,name) {
                        let decoded=self.bind(&format!("__float({value})"));
                        self.bit_f32_decoded.insert(value.clone(),decoded);
                    }
                }
            }
            return;
        }
        let used=ink_core::analysis::free_variables(&f.body);''')
manifest={str(p.relative_to(package)):hashlib.sha256(p.read_bytes()).hexdigest()for p in package.rglob('*')if p.is_file()};(out/'sources.json').write_text(json.dumps({'status':'private-unadmitted-source-experiment','base_commit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=base,text=True).strip(),'after':manifest},indent=2)+'\n');print(package)
