"""Synthetic smoke checks only; no real timing fits or heldout data used."""
import copy,sys,tempfile,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3]
sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner')]
from producers.web_cost39 import nnls_relative,training,target_boundary,write_new,cohort_id,UNKNOWN_FLOOR_NS
from ink_planner.target_costs import COMPONENTS,TargetCostModel

class CalibrationSmokeTests(unittest.TestCase):
 def test_synthetic_nnls_deterministic_relative_rank(self):
  rows=[]
  for n in (1,2,5,11):
   row=dict.fromkeys(COMPONENTS,0);row['invocations']=1;row['scalar_ops']=n;rows.append(row)
  a=nnls_relative(rows,[3+2*n for n in (1,2,5,11)]);b=nnls_relative(rows,[3+2*n for n in (1,2,5,11)])
  self.assertEqual(a,b);self.assertEqual(a['rank'],2)
  self.assertAlmostEqual(a['weights']['invocations'],3,places=5)
  self.assertAlmostEqual(a['weights']['scalar_ops'],2,places=5)
  self.assertEqual(a['weights']['unknown_work'],UNKNOWN_FLOOR_NS)
  self.assertIn('gpu_dispatches',a['unidentified']);self.assertTrue(a['low_rank'])
 def test_negative_unconstrained_slope_stays_nonnegative(self):
  rows=[]
  for n in (1,2,3):
   row=dict.fromkeys(COMPONENTS,0);row['invocations']=1;row['scalar_ops']=n;rows.append(row)
  r=nnls_relative(rows,[5,4,3]);self.assertEqual(r['weights']['scalar_ops'],0)
  self.assertTrue(all(v>=0 for v in r['weights'].values()))
 def test_training_split_cannot_leak(self):
  task=dict(operation='scan',split='train');frame=dict(xs=[1]*32,split='train')
  self.assertTrue(training(task,frame))
  self.assertFalse(training(task,dict(xs=[1]*2048,split='train')))
  self.assertFalse(training(dict(operation='branch',split='train'),frame))
  self.assertFalse(training(task,dict(xs=[1]*32,split='heldout-cell')))
 def test_cohorts_preserve_host_boundary_compiler_variant(self):
  base=cohort_id('node','baseline_wasm_full','captured-wasm-owned','a')
  for args in [('browser','baseline_wasm_full','captured-wasm-owned','a'),('node','baseline_wasm_prepared','resident-wasm-destination','a'),('node','baseline_wasm_full','captured-wasm-owned','b')]:self.assertNotEqual(base,cohort_id(*args))
  self.assertEqual(target_boundary('browser','candidate_gpu_resident','resident-gpu-input-owned-readback'),('webgpu','gpu_resident_readback'))
 def test_preserve_frozen_artifacts(self):
  with tempfile.TemporaryDirectory()as d:
   p=Path(d)/'freeze.json';write_new(p,{'x':1})
   with self.assertRaises(FileExistsError):write_new(p,{'x':2})
 def test_invalid_raw_samples_rejected(self):
  row=dict.fromkeys(COMPONENTS,0)
  for y in (0,-1,float('nan'),True):
   with self.assertRaises(ValueError):nnls_relative([row],[y])
if __name__=='__main__':unittest.main()
