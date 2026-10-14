module positional_examples;
import "../../knowledge/libraries/positional_history.ink" as history;
fn build(edits:List<history.Edit>)->history.Snapshot{return history.build(edits);}
