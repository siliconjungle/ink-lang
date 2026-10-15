"""Registered grids retain objective weights and truly disjoint validation."""
import json,tempfile,unittest
from pathlib import Path
from prepare import grid_workload,workload
from ink_planner.offline_measurements import independent_workloads,read_workload

class GridProtocol(unittest.TestCase):
 def test_distinct_grids_keep_identical_phases_and_pass_independence(self):
  training=grid_workload(dict(keys=[0,3,97,1537],queries=[0,3,193]),1046)
  validation=grid_workload(dict(keys=[0,7,149,2053],queries=[0,7,263]),1110)
  self.assertEqual(training['profile'],validation['profile']);self.assertEqual(len(training['phases']),33)
  with tempfile.TemporaryDirectory()as temporary:
   d=Path(temporary);a=d/'training.json';b=d/'validation.json'
   a.write_text(json.dumps(training));b.write_text(json.dumps(validation))
   self.assertEqual(len(read_workload(a)[0]['phases']),33);independent_workloads(a,b)
   b.write_text(json.dumps(training))
   with self.assertRaisesRegex(ValueError,'overlap'):independent_workloads(a,b)
 def test_zero_work_controls_are_reserved_but_crossed_empty_cases_remain(self):
  grid=grid_workload(dict(keys=[0,3],queries=[0,3]),1046)
  self.assertEqual(len(grid['phases']),9)
  self.assertEqual(grid['phases']['nested:keys-stratum:0:queries-stratum:1'][0]['args'][0],[])
  self.assertEqual(len(grid['phases']['nested:keys-stratum:0:queries-stratum:1'][0]['args'][1]),3)
  self.assertEqual(len(grid['phases']['nested:keys-stratum:1:queries-stratum:0'][0]['args'][0]),3)
  self.assertEqual(grid['phases']['nested:keys-stratum:1:queries-stratum:0'][0]['args'][1],[])
  self.assertFalse(any(':keys-stratum:0:queries-stratum:0'in name for name in grid['phases']))
  # These canonical controls still belong in the evaluation domain.
  zero=workload(0,0,1742)
  self.assertEqual(zero['phases']['nested'][0]['args'],[[],[]])
  self.assertEqual(zero['phases']['predicate'][0]['args'],[[],[],[]])

if __name__=='__main__':unittest.main()
