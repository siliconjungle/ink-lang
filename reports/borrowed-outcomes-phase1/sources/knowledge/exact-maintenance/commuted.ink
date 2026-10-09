module exact_sum_commuted;
fn insert(total: Int, new: Int) -> Int { return new + total; }
fn replace(total: Int, old: Int, new: Int) -> Int { return new + (total - old); }
fn remove(total: Int, old: Int) -> Int { return total - old; }
