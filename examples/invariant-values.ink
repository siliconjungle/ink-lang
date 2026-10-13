module invariant_values;
import "../knowledge/libraries/invariant-values.ink" as checked;

fn unique_example()->checked.Unique<u32>{return checked.wrap_unique<u32>([1,2,3]);}
fn unique_elements(value:checked.Unique<u32>)->List<u32>{return checked.elements<u32>(value);}
fn known_unique(value:checked.Unique<u32>)->Bool{return checked.known_unique<u32>(value);}
fn sorted_example()->checked.SortedWords{return checked.wrap_sorted([1,2,3]);}
fn known_sorted(value:checked.SortedWords)->Bool{return checked.known_sorted(value);}
fn index_example()->checked.BoundedIndex{return checked.bound(2,3);}
fn known_bound(value:checked.BoundedIndex)->Bool{return checked.in_bounds(value);}
fn indexed_value(value:checked.IndexedWords,fallback:u32)->u32{return checked.indexed_value(value,fallback);}
fn indexed_valid(value:checked.IndexedWords)->Bool{return checked.indexed_valid(value);}

// Ordinary numeric work remains eligible for device execution independently of
// the host validation and state interfaces.
fn numeric(xs:List<u32>)->List<u32>{return xs.map(fn(x)=>x+1);}
