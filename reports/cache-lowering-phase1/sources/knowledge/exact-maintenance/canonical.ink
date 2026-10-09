module exact_sum_canonical;
fn insert(total: Int, new: Int) -> Int { return total + new; }
fn replace(total: Int, old: Int, new: Int) -> Int { return total - old + new; }
fn remove(total: Int, old: Int) -> Int { return total - old; }
