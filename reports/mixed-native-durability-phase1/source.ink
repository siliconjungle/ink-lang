module inventory;

id ItemId;

record Item {
    name: String,
    stock: u32,
}

enum Error {
    Missing,
    AlreadyExists,
    Overflow,
}

record StockChanged {
    item: ItemId,
    before: u32,
    after: u32,
}

state Items: Table<ItemId, Item> = Table.empty();
event stock_changed: StockChanged;

keep total_units: Int =
    sum(Items.values().map(fn(item) => Int(item.stock)));

change create(id: ItemId, name: String, stock: u32)
    -> Result<Unit, Error>
    writes(Items)
{
    if Items.contains(id) {
        return Err(Error.AlreadyExists);
    }
    Items.insert(id, Item { name: name, stock: stock });
    return Ok(());
}

change restock(id: ItemId, amount: u32)
    -> Result<Unit, Error>
    writes(Items)
    emits(stock_changed)
{
    let item = Items.get(id).ok_or(Error.Missing)?;
    let next = checked_add(item.stock, amount)
        .map_err(fn(_) => Error.Overflow)?;

    Items.replace(id, Item { name: item.name, stock: next });
    emit stock_changed(StockChanged {
        item: id,
        before: item.stock,
        after: next,
    });
    return Ok(());
}

query stock_of(id: ItemId) -> Option<u32>
    reads(Items)
{
    return Items.get(id).map(fn(item) => item.stock);
}

query total() -> Int reads(total_units) {
    return total_units;
}

fn gpu_sum(xs:List<u32>)->u32 {return sum(xs.map(fn(x)=>x+1));}