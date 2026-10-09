module bitvector_proofs;

fn add_zero(p0: u64) -> u64 { return (p0 + 0); }

fn subtract_self(p0: u64) -> u64 { return (p0 - p0); }

fn add_commute(p0: u64, p1: u64) -> u64 { return (p0 + p1); }

fn cancel_add(p0: u64, p1: u64) -> u64 { return ((p0 + p1) - p1); }

fn multiply_zero(p0: u64) -> u64 { return (p0 * 0); }

fn unsigned_reflexive(p0: u64) -> Bool { return (p0 <= p0); }

fn unsigned_maximum(p0: u64) -> Bool { return (p0 <= 18446744073709551615); }

fn choose_equal(p0: u64, p1: Bool) -> u64 { return choose(p1, p0, p0); }
