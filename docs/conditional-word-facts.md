# Conditional unsigned facts

Ink's knowledge-side word analyser proposes simplifications using known bits,
inclusive ranges and one excluded value. Branch facts remain scoped. Comparisons
between values can refine both ranges, and wrapping addition/subtraction or XOR
with a constant can transport an excluded value because those operations are
bijections. Multiplication by an even word cannot use that argument.

For example, `x < y && y <= 256` implies that the U32 value `x` fits in eight
bits. An offline producer can propose removing its mask within that branch:

```ink
fn bounded(x:u32,y:u32)->u32 {
    return choose(x<y && y<=256,word_and(x,255),x);
}
```

The entire function is equal to `x`. The analyser suggests that result; it does
not certify it. `producers.conditional_facts` exports the exact source, derives
the candidate, asks Ink to construct the bitvector obligation, authors a RUP
certificate and replays it through `knowledge-check` and `check-selection`.
Only then can optional publication add the law to a canonical store and the
existing word-identity proposal catalogue. No SAT search runs in the emitted app.

The command and matched measurements are in
[bench/conditional-facts](../bench/conditional-facts/README.md). The installed
database's `store/conditional-facts-view.json` retains four checked examples.
They establish whole-function equations in unsigned domains, not general
floating-point inference, absence of every runtime error or correctness of the
complete compiler. Profitability remains a separate measurement decision.

This is an initial part of the [three-project roadmap](chenglou-optimisation-programme.md#delivery-checklist).
Backward requirement discovery, general call summaries and additional fact
consumers remain open. The existing analyser also retains explicit work/depth
limits, loses information on unsupported operations, and keeps invocation-local
caches from crossing source or scope changes.
