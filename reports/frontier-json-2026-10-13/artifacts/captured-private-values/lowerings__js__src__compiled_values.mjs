// Handles have no mutable private payload surface. Membership and type identity
// are checked by this module's closure; copied/foreign objects cannot forge them.
const __compiledHandles=new WeakMap();
const __compiledBindings=new WeakMap();
function __compiledHandle(identity,value){
 const handle=Object.freeze(Object.create(null));
 __compiledHandles.set(handle,{identity,value});return handle;
}
function __compiledUnwrap(handle,identity){
 const entry=__compiledHandles.get(handle);
 if(!entry||entry.identity!==identity)throw Error('compiled value type or owner mismatch');
 return entry.value;
}
function __compiledCodec(schema,capture,read,write,copy){
 const publicCodec=new ValueCodec(schema),privateCodec=createCompiledValueCodec(schema,read);
 const identity=schema.identity;
 const codec=Object.freeze({
  identity,
  capture(value,limits={}){
   const owned=publicCodec.capture(value,limits);
   return __compiledHandle(identity,capture(owned,new WeakMap()));
  },
  decode(bytes,limits={}){return __compiledHandle(identity,privateCodec.decode(bytes,limits));},
  decodeCompact(bytes,limits={}){return __compiledHandle(identity,privateCodec.compact().decode(bytes,limits));},
  encode(handle,limits={}){const value=__compiledUnwrap(handle,identity);return publicCodec.encodeWith(writer=>write(writer,value,false),limits);},
  encodeCompact(handle,limits={}){const value=__compiledUnwrap(handle,identity);return publicCodec.compact().encodeWith(writer=>write(writer,value,true),limits);},
  materialize(handle,limits={}){return copy(__compiledUnwrap(handle,identity),createValueCaptureBudget(limits),0);},
 });
 __compiledBindings.set(codec,{publicCodec,write});return codec;
}

function __compiledEncodeResult(entry,value,limits,compact){
 const {publicCodec,write}=__compiledBindings.get(entry.result());
 return (compact?publicCodec.compact():publicCodec).encodeWith(writer=>write(writer,value,compact),limits);
}
