module shared_keys;
id Key;
state Text:Table<String,u64> = Table.empty();
state Marks:Table<String,Unit> = Table.empty();
state Ids:Table<Key,u64> = Table.empty();
state Flags:Table<i32,u64> = Table.empty();
change text(ks:List<String>,vs:List<u64>)->Result<Unit,String> writes(Text){return Text.put_many(ks,vs);}
change marks(ks:List<String>,vs:List<Unit>)->Result<Unit,String> writes(Marks){return Marks.put_many(ks,vs);}
change ids(ks:List<Key>,vs:List<u64>)->Result<Unit,String> writes(Ids){return Ids.put_many(ks,vs);}
change flags(ks:List<i32>,vs:List<u64>)->Result<Unit,String> writes(Flags){return Flags.put_many(ks,vs);}
query shared()->List<String> reads(Text,Marks){return Text.shared_keys(Marks);}
query selected(ks:List<String>)->List<String> reads(Text){return Text.intersect_keys(ks);}
query ids_query(ks:List<Key>)->List<Key> reads(Ids){return Ids.intersect_keys(ks);}
query flags_query()->List<i32> reads(Flags){return Flags.keys();}
