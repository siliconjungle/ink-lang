module readonly_interval_observers;
import "../../knowledge/libraries/interval_index.ink" as base;
import "../../knowledge/libraries/readonly_interval_index.ink" as reduced;
fn original(index:base.Index,key:u64)->base.Found{return base.locate(index,key);}
fn narrowed(index:base.Index,key:u64)->base.Found{return reduced.locate(index,key);}
fn original_successor(index:base.Index,key:u64)->base.Found{return base.successor(index,key);}
fn narrowed_successor(index:base.Index,key:u64)->base.Found{return reduced.successor(index,key);}
