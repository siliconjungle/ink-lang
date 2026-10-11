// Trusted packed ABI. The caller owns capacities and input/output nonaliasing.
// Each prepared call owns a dedicated instance, so other calls cannot reset it.
export function createPackedCall(cpu, functionIndex, args, capacityWords) {
  cpu.ink_compute_reset();
  const pointers = cpu.ink_alloc(args.length, 4);
  const lengths = cpu.ink_alloc(args.length, 4);
  const inputs = args.map((arg, i) => {
    const pointer = cpu.ink_alloc(Math.max(1, arg.words.length), 4);
    new Uint32Array(cpu.memory.buffer, pointer, arg.words.length).set(arg.words);
    const table = new DataView(cpu.memory.buffer);
    table.setUint32(pointers + 4 * i, pointer, true);
    table.setUint32(lengths + 4 * i, arg.count, true);
    return pointer;
  });
  const destination = cpu.ink_alloc(Math.max(1, capacityWords), 4);
  const mark = cpu.ink_compute_mark();
  let closed = false;
  return {
    // Values are packed words. Writes must fit the original argument capacity.
    writeArgument(index, words, count) {
      if (closed) throw Error('prepared Ink call is closed');
      new Uint32Array(cpu.memory.buffer, inputs[index], words.length).set(words);
      new DataView(cpu.memory.buffer).setUint32(lengths + 4 * index, count, true);
    },
    run() {
      if (closed) throw Error('prepared Ink call is closed');
      try {
        const count = cpu.ink_compute_into(functionIndex, pointers, lengths, destination);
        // Construct after execution: scratch allocation may have grown memory.
        // Borrowed view expires on the next run, writeArgument or close.
        return new Uint32Array(cpu.memory.buffer, destination, count);
      } finally {
        cpu.ink_compute_rewind(mark);
      }
    },
    close() {
      closed = true;
      cpu.ink_compute_reset();
    },
  };
}
