module source_row_ledger;
id AccountId;
enum Error { Failed, }
record Line { amount:Int, label:String, }
record Ledger { current:Line, prior:Line, memo:Option<String>, enabled:Bool, }
state Accounts:Table<AccountId,Ledger> = Table.empty();
keep balance:Int=sum(Accounts.values().filter(fn(row)=>row.enabled).map(fn(row)=>row.current.amount-row.prior.amount));
change put(id:AccountId,row:Ledger)->Result<Unit,Error> writes(Accounts) {
    if Accounts.contains(id) { Accounts.replace(id,row); }
    else { Accounts.insert(id,row); }
    return Ok(());
}
query value()->Int reads(balance) { return balance; }
