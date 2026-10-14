#!/usr/bin/env python3
"""Create an exact standalone core Git package without distribution submodules.

This produces a dedicated package branch, never a distribution-main commit.
Cargo resolves core/Cargo.toml from the real committed tree. The entire core
tree, including tests and the crate manifest, must match the supplied source.
No checkout is patched and no Cargo completion marker is fabricated.
"""
import argparse,json,pathlib,subprocess,tomllib

def main():
 p=argparse.ArgumentParser(description=__doc__)
 p.add_argument('--source',required=True);p.add_argument('--parent',required=True)
 p.add_argument('--branch',required=True);p.add_argument('--receipt',type=pathlib.Path,required=True)
 a=p.parse_args();root=pathlib.Path(__file__).resolve().parents[1]
 def git(*args,input=None):return subprocess.check_output(['git',*args],cwd=root,input=input)
 source=git('rev-parse',a.source+'^{commit}').decode().strip()
 parent=git('rev-parse',a.parent+'^{commit}').decode().strip()
 manifest=tomllib.loads(git('show',source+':core/Cargo.toml').decode())
 if manifest['package']['name']!='ink-core':raise ValueError('source is not the standalone core crate')
 if a.branch in ['main','master']:
  raise ValueError('dedicated core package branch required; never replace distribution main')
 git('check-ref-format','refs/heads/'+a.branch)
 core=git('rev-parse',source+':core').decode().strip()
 tree=git('mktree',input=f'040000 tree {core}\tcore\n'.encode()).decode().strip()
 message=f'Publish standalone checked core package\n\nExact core tree from {source}. Exclude distribution files and\nsubmodules from this package branch; the distribution retains them on main.\n'
 commit=git('commit-tree',tree,'-p',parent,input=message.encode()).decode().strip()
 assert git('rev-parse',commit+':core').decode().strip()==core
 # Compare-and-swap protects any existing branch from concurrent replacement.
 ref='refs/heads/'+a.branch
 existing=subprocess.run(['git','rev-parse','--verify','-q',ref],cwd=root,capture_output=True,text=True)
 old=existing.stdout.strip() if existing.returncode==0 else '0'*40
 if existing.returncode==0 and old!=parent:raise ValueError('package branch changed or does not match parent')
 git('update-ref',ref,commit,old)
 record=dict(commit=commit,parent=parent,source=source,core_tree=core,branch=a.branch,
  scope='Standalone package only; entire core tree identical to tested distribution source. Distribution main is unchanged.')
 a.receipt.write_text(json.dumps(record,indent=2)+'\n');print(json.dumps(record))

if __name__=='__main__':main()
