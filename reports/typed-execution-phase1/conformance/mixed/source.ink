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


record Particle { position: Vec3<f32>, velocity: Vec3<f32>, mass: f32, }
// Position and velocity are logical values; their storage is selected by the host.
fn kick(velocities: List<Vec3<f32>>, dt: f32, gravity: Vec3<f32>) -> List<Vec3<f32>> {
 return velocities.map(fn(v) => vec3(v.x + gravity.x * dt, v.y + gravity.y * dt, v.z + gravity.z * dt));
}
fn drift(positions: List<Vec3<f32>>, velocities: List<Vec3<f32>>, dt: f32) -> List<Vec3<f32>> {
 return positions.zip(velocities, fn(p) => fn(v) => vec3(p.x + v.x * dt, p.y + v.y * dt, p.z + v.z * dt));
}
fn particles(xs: List<Particle>, dt: f32) -> List<Particle> {
 return xs.map(fn(p) => Particle { position: vec3(p.position.x + p.velocity.x * dt, p.position.y + p.velocity.y * dt, p.position.z + p.velocity.z * dt), velocity: p.velocity, mass: p.mass });
}
fn gather(xs: List<i32>, indices: List<u32>) -> List<i32> {
 return indices.map(fn(i) => xs.at_or(i, -99));
}
fn indexed(xs: List<i32>) -> List<i32> {
 return xs.map_indexed(fn(i) => fn(x) => choose(rem_or(i, 2, 0) == 0, x * -2, x + 7));
}
fn iterate(xs: List<i32>) -> List<i32> {
 return xs.map(fn(x) => repeat(8, x, fn(i) => fn(acc) => acc * 3 + 1));
}
fn matrix4(rows: List<f32>, columns: List<f32>) -> List<f32> {
 return rows.map_indexed(fn(i) => fn(unused) => repeat(4, 0.0, fn(k) => fn(acc) => acc + rows.at_or(quot_or(i, 4, 0) * 4 + k, 0.0) * columns.at_or(k * 4 + rem_or(i, 4, 0), 0.0)));
}
fn prefix(xs: List<i32>) -> List<i32> { return xs.scan(); }
fn ordered(xs: List<i32>) -> List<i32> { return xs.sort(); }
fn ordered_sum(xs: List<f32>) -> f32 { return sum(xs); }
fn locals(x: i32) -> i32 { let y: i32 = x * -2; return y + 1; }
fn negative_words(xs: List<u32>) -> List<u32> { return xs.map(fn(x) => -x); }
fn division(xs: List<i32>, divisor: i32) -> List<i32> { return xs.map(fn(x) => quot_or(x, divisor, -99)); }
fn mask(xs: List<i32>) -> List<Bool> { return xs.map(fn(x) => x < 0); }
fn local_step(x: i32) -> i32 { let y: i32 = x * 3; return choose(y < 0, y + 1, y - 1); }
fn helper(xs: List<i32>) -> List<i32> { return xs.map(fn(x) => local_step(x)); }


record Chain{next:Option<Chain>,value:u32,}
fn chain(x:Chain)->Chain{return x;}
fn chain_next(x:Chain)->Option<Chain>{return x.next;}
fn chain_copy(x:Chain)->Chain{return Chain{next:x.next,value:x.value};}
record Tree{children:List<Tree>,value:u32,}
fn tree(x:Tree)->Tree{return x;}
fn tagged(x:Result<Option<Unit>,Error>)->Result<Option<Unit>,Error>{return x;}
fn float_identity(x:f32)->f32{return x;}
fn unit(x:Unit)->Unit{return x;}
state Words:Table<String,u64> =Table.empty();
event marker:u32;
query checked(x:u64,y:u64)->Result<u64,Error>{return checked_add(x,y).map_err(fn(_)=>Error.Overflow);}
query exact(x:Int,y:Int)->Int{return x*x-y;}
query options(x:Option<Int>)->Option<Int>{return x.map(fn(v)=>v*Int(3));}
query mapped(x:Result<Int,Error>)->Result<Int,Error>{return x.map(fn(v)=>v+Int(2)).map_err(fn(e)=>e);}
query equality(x:List<Item>,y:List<Item>)->Bool{return x==y;}
query word_values()->List<u64> reads(Words){return Words.values();}
change word(k:String,v:u64)->Result<Unit,Error> writes(Words){if Words.contains(k){Words.replace(k,v);}else{Words.insert(k,v);}return Ok(());}
change delete_word(k:String)->Result<Option<u64>,Error> writes(Words){return Ok(Words.remove(k));}
change fail(id:ItemId)->Result<Unit,Error> writes(Items) emits(stock_changed,marker){restock(id,7)?;emit marker(3);return Err(Error.Overflow);}
change ignored(id:ItemId)->Result<Unit,Error> writes(Items) emits(stock_changed,marker){let captured=fail(id);emit marker(4);return Ok(());}
query ordinary_error()->Result<Unit,Error>{return Err(Error.Missing);}
change ignore_query()->Result<Unit,Error>{ordinary_error();return Ok(());}
change try_query(id:ItemId)->Result<Unit,Error> writes(Items) emits(stock_changed){restock(id,2)?;ordinary_error()?;return Ok(());}
change events(id:ItemId)->Result<Int,Error> writes(Items) reads(total_units) emits(stock_changed,marker){emit marker(0);restock(id,1)?;emit marker(1);return Ok(total_units);}
fn repeated_arrays(xs:List<i32>)->List<i32>{return repeat(3,xs,fn(i)=>fn(acc)=>acc.map(fn(x)=>x+1));}
fn choose_arrays(xs:List<i32>,ys:List<i32>,b:Bool)->List<i32>{return choose(b,xs,ys).map(fn(x)=>x*2);}
fn composition(xs:List<i32>)->List<i32>{return xs.map(fn(x)=>x+1).filter(fn(x)=>x<4).scan().sort();}
fn wide_scan(xs:List<u64>)->List<u64>{return xs.scan();}
fn wide_sort(xs:List<u64>)->List<u64>{return xs.sort();}
fn nested(xs:List<List<u32>>)->List<u32>{return xs.map(fn(xs)=>sum(xs));}
fn flags(xs:List<Bool>)->List<Bool>{return xs.filter(fn(x)=>x);}
fn fold(xs:List<u32>)->u32{return foldr(xs,0,fn(x)=>fn(rest)=>x-rest);}
fn signed_div(x:i32,y:i32)->i32{return quot_or(x,y,-99);}
fn rem(x:u64,y:u64)->u64{return rem_or(x,y,99);}
fn float_neg(x:f32)->f32{return -x;}
fn binding(x:u32)->u32{let x:u32=x+1;return x*3;}
fn passthrough(x:Result<List<Int>,Error>)->Result<List<Int>,Error>{return x;}
