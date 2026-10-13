module contract_looseness;

// Only multiplicities matter. A planner can prove that copying or sorting is
// unnecessary without strengthening this contract to ordered list equality.
spec fn unordered(xs:List<u32>)->List<u32>
 ensures multiset(result)==multiset(xs);
implementation ordered for unordered {return xs.sort();}

// Either result is acceptable. Admission still checks every clause.
spec fn choice()->u32 ensures result==1 || result==2;
implementation first for choice {return 1;}

// An exact integer inequality supplies a useful range of witnesses.
spec fn bounded(n:Int)->Int requires n>0; ensures result<n;
implementation predecessor for bounded {return n-1;}

spec query action_choice()->u32 ensures result==1 || result==2;
implementation action_first for action_choice {return 1;}
