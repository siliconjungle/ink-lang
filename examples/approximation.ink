module approximation_example;
import "std:approximation" as approximation;

// Both implementations meet the requested bound; only the contract permits
// this change. An ordinary function computing x+8 must remain exact.
spec fn coarse(x:Int)->Int
 approximates x+8 within absolute 8;
implementation precise for coarse {return repeat(8,x,fn(i,acc)=>acc+1);}
implementation cheap for coarse {return x;}

// Exact finite probability: two of the four equally weighted seeds succeed.
spec fn half_success()->Bool ensures result;
implementation finite_certificate for half_success {
 return approximation.probability_at_least<u32>([0,1,2,3],fn(seed)=>
  approximation.within_absolute(Int(seed&1),0,0),1,2);
}
fn relative_example()->Bool {
 return approximation.within_relative(99,100,1,100);
}
