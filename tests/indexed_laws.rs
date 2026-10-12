//! Replay every published grouping law, including families unused by a fixture action.
use std::{fs,path::PathBuf,process::Command};
use verified_language::registry::{Bundle,CheckedBundle};
#[test]
fn all_key_domains_and_edit_pairs_have_checked_row_and_metadata_laws() {
    let root=PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let dir=root.join("build/indexed-law-admission");fs::create_dir_all(&dir).unwrap();
    let script=r#"
import json,sys
from pathlib import Path
from ink_knowledge import Store,canonical
root=Path(sys.argv[1]);out=Path(sys.argv[2]);receipt=json.loads((root/'knowledge/research/indexed-extensions/keys.json').read_bytes())
store=Store(root/'knowledge',root/'knowledge/store/snapshots'/(receipt['view_snapshot']+'.json'))
for table in range(6):
 for first in ['insert','replace','remove']:
  for second in ['insert','replace','remove']:
   role=f'table-{table}/grouped/{first}-{second}'
   roots=[receipt['entries'][role+'/'+kind] for kind in ['rows','metadata']]
   path=out/(f'{table}-{first}-{second}.json');path.write_bytes(canonical(store.bundle(roots)))
"#;
    let output=Command::new("python3").args(["-c",script]).arg(&root).arg(&dir)
        .env("PYTHONPATH",root.join("knowledge")).output().unwrap();
    assert!(output.status.success(),"{}",String::from_utf8_lossy(&output.stderr));
    for table in 0..6 {
        for first in ["insert","replace","remove"] {
            for second in ["insert","replace","remove"] {
                let path=dir.join(format!("{table}-{first}-{second}.json"));
                let bundle:Bundle=serde_json::from_slice(&fs::read(path).unwrap()).unwrap();
                let view=CheckedBundle::check(&bundle).unwrap();
                view.first_order_context().unwrap_or_else(|e|panic!("table {table} {first}-{second}: {e}"));
            }
        }
    }
}
