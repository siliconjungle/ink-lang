module json_example;
import "std:json" as json;

fn mark_received(document:json.Json)->Result<json.Json,json.JsonError> {
 return json.set(document,"received",json.boolean(true));
}
fn title(document:json.Json)->Result<Option<json.Json>,json.JsonError> {
 return json.get(document,"title");
}
fn visible(document:json.Json)->Result<json.Json,json.JsonError> {
 return json.project(document,["title","received"]);
}
fn identity(document:json.Json)->json.Json {return document;}

state Documents:Table<String,json.Json>=Table.empty();
event document_saved:json.Json;
change save(key:String,document:json.Json)->Unit writes(Documents) emits(document_saved) {
 Documents.put(key,document);
 emit document_saved(document);
 return ();
}
query load(key:String)->Option<json.Json> reads(Documents) {return Documents.get(key);}
