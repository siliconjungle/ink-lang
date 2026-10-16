class __StringTable {
 constructor(){this.cells=Object.create(null);this.size=0;}
 get(key){return this.cells[key];}
 // Source values never use undefined; Unit is null. The null prototype makes
 // the same single-probe absence contract used by the Map controller exact.
 has(key){return this.cells[key]!==undefined;}
 set(key,value){if(this.cells[key]===undefined)this.size++;this.cells[key]=value;return this;}
 delete(key){if(this.cells[key]===undefined)return false;delete this.cells[key];this.size--;return true;}
 *keys(){yield* Object.keys(this.cells);}
 *values(){for(const key of Object.keys(this.cells))yield this.cells[key];}
 *entries(){for(const key of Object.keys(this.cells))yield [key,this.cells[key]];}
 [Symbol.iterator](){return this.entries();}
}
