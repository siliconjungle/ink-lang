module exact_sum_delta;
fn insert(total: Int, new: Int) -> Int { return total + new; }
fn replace(total: Int, old: Int, new: Int) -> Int { return total + (new - old); }
fn remove(total: Int, old: Int) -> Int { return total - old; }
