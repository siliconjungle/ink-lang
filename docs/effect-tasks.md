# External effects and tasks

Ink programs describe exact state and pure computation. Real applications
also call things Ink cannot evaluate: HTTP services, databases owned by
someone else, files, and language models. `effect` declarations give those
calls types, and `task` declarations orchestrate them around exact state.

```ink
effect fetch_ticket(id: u32) -> Result<Ticket, String>;
effect lookup_customer(name: String) -> Option<Customer>;
effect classify(text: String, labels: List<Label>) -> Label;
effect summarise(text: String) -> String;
ordered effect notify(channel: String, message: String) -> Result<Unit, String>;

task triage(id: u32) -> Result<Label, String> {
  let ticket = fetch_ticket(id)?;
  let customer = lookup_customer(ticket.customer);
  let label = classify(ticket.text, [Label.Bug, Label.Billing, Label.Question])
    ensures label != Label.Other else rule_label(ticket.text);
  let summary = summarise(ticket.text)
    ensures string_byte_len(summary) <= 140 else "";
  let plan: String = plan_of(customer);
  let count = record(id, label)?;
  notify(choose(plan == "enterprise", "priority", "queue"), summary)?;
  return Ok(label);
}
```

The complete example is `examples/effect-tasks.ink`.

## Syntax

- `effect NAME(params) -> T;` declares a request a host performs. Ink never
  executes it.
- `ordered effect ...` marks an effect with outside consequences (sending,
  paying, writing elsewhere). Ordered effects run in source order after every
  earlier step has finished.
- `task NAME(params) -> T { STEP* return EXPR; }` where each step is
  `[let NAME[: TYPE] =] EXPR [ensures PREDICATE else FALLBACK];`.
  - A call to an effect is an effect step. A call to a query or change is an
    action step. Anything else is a pure value step and needs a type
    annotation.
  - `?` after an effect or action call that returns `Result<T, E>` binds `T`,
    or ends the task with the `Err`. The task must return `Result<_, E>`.
  - `ensures PREDICATE else FALLBACK` guards a bound effect result. The
    predicate may use the bound name and every earlier name. The fallback may
    use earlier names.
- Names in a task are bound once. Steps see the task parameters and the names
  bound by earlier steps.

Effects and tasks are supported in the root module of a linked program.

## Meaning

A task means its sequential execution in source order. For each effect step,
the host performs the request and Ink checks the reply:

1. The reply must decode to the declared type. Ink's JSON form is used
   (records as objects, enums as `"Enum.Variant"`, Option as `{"Some": v}` or
   `{"None": null}`, Result as `{"Ok": v}` or `{"Err": e}`).
2. If the step has `ensures`, the predicate must hold.

If either check fails, or the handler fails, a guarded step takes its authored
`else` value. An unguarded step ends the task with a host error, which is not
an Ink value. Changes made by earlier action steps stay committed: each change
is its own transaction, and a task is not one transaction.

## Concurrency

The compiler fixes the order, not the host. Each lowered step lists the
earlier steps it waits for:

- queries, changes and ordered effects wait for every earlier step;
- other effects and value steps wait only for the steps that bind the names
  they use.

In the example, the customer lookup, classification and summary all use only
`ticket`, so they run together. `record` and `notify` run afterwards in source
order. Unordered effects may start before an earlier step is known to have
succeeded, so they must be safe to perform speculatively (reads, model calls,
idempotent requests). If the task ends early, their replies are recorded as
`discarded` and never affect the result.

When several steps fail, the task reports the earliest one in source order.
The result is therefore the same as sequential execution with the same effect
replies, however the requests interleave.

## Lowering

Lowering (`core/src/tasks.rs`) is source desugaring. Every expression in a
task becomes the body of a generated readonly query that takes exactly the
names it uses:

| Source | Generated |
| --- | --- |
| argument `j` of step `i` | `__task_T_i_aj(uses) -> Pj` |
| value step | `__task_T_i_value(uses) -> T` |
| effect reply check | `__task_T_i_accept(uses, NAME: R) -> Bool` |
| `else` value | `__task_T_i_else(uses) -> R` |
| `return` | `__task_T_return(uses) -> T` |

The ordinary checker types every expression. The accept query is also the
type check: a reply that is not a value of `R` is rejected at its typed
ingress. The task itself becomes a manifest in `contracts.tasks`: effects with
their signatures and the declarations of the types they reach, and per task
the steps, their generated queries, `uses` and `after` lists. The core checker
re-derives the barrier rule, the data dependencies and every generated query
signature from the program, so a manifest that lets a change overtake an
earlier step is rejected. No executable-core primitive, backend or semantics
version changes; a module without effects or tasks keeps its source identity.

## Hosts

`ink emit-tasks SOURCE -o tasks.json` writes the manifest (`ink-tasks-v1`).

`runtime/hosts/tasks.mjs` runs it in JavaScript:

```js
import {createState} from './program.mjs';
import {runTask, stateCaller} from 'ink-runtime/hosts/tasks.mjs';
import {modelEffect} from 'ink-runtime/hosts/model-effect.mjs';

const state = await createState();
const {result, trace} = await runTask({
  manifest, call: stateCaller(state), task: 'triage', args: [7],
  effects: {
    fetch_ticket: async id => ({Ok: await (await fetch(`/tickets/${id}`)).json()}),
    lookup_customer: async name => ({None: null}),
    classify: modelEffect(complete),
    summarise: modelEffect(complete),
    notify: async (channel, message) => ({Ok: null}),
  },
});
```

`call(name, args)` invokes queries and changes. Compiled states work through
`stateCaller`; a durable host can supply its own function, for example one
that calls `DurableState.invoke` with fresh operation identities.
`concurrency` bounds simultaneously running steps (default 16) and `signal`
aborts the task.

### Compiled tasks

`ink build --target javascript` also compiles every task into the module,
printed from its [mid-level IR](mid-level-ir.md) graph:

```js
import {createState, tasks, TaskFailed} from './program.mjs';
const state = await createState();
const {result, trace} = await tasks.triage(state, [7], handlers, {concurrency: 8});
```

The arguments mirror `runTask`: the state (or a `call(name, args)` function),
the task arguments, the handlers and options (`concurrency`, `signal`,
`replay`). Step expressions run as plain JavaScript instead of round trips
through generated queries. Replies are still checked by the generated accept
query. Results and traces are the same as the interpreted host's, and
`replayTask` and `ink replay-task` check them.

### Language models

`modelEffect(complete)` adapts any `complete(prompt) -> Promise<string>`
function. The prompt gives the effect's signature, the declarations of the
types it reaches, the arguments and the JSON encoding; the reply is parsed as
JSON. The model is not trusted beyond the declared type and the step's
contract: anything else becomes the authored fallback. For example, with
Anthropic's Messages API:

```js
const complete = async prompt => {
  const reply = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json'},
    body: JSON.stringify({model: 'claude-sonnet-5-5', max_tokens: 512,
      messages: [{role: 'user', content: prompt}]}),
  }).then(r => r.json());
  return reply.content[0].text;
};
```

### Traces and replay

Every run returns a trace (`ink-task-trace-v1`) of each request, its reply or
error and its outcome (`accepted`, `fallback`, `failed` or `discarded`).
`replayTask` re-runs a trace in JavaScript without calling handlers, and
`ink replay-task SOURCE TRACE.json [--restore SNAPSHOT]` re-runs it
sequentially on the reference evaluator (`src/tasks.rs`). Both reject a trace
whose requests, outcomes or result differ. Model replies are part of the
trace, so a run that used a model replays exactly without it.

## Validation

`tests/effect_tasks.rs` checks the lowering, the dependency lists, rejected
sources and forged manifests, the reference runner's type, contract and
fallback handling, and replays six traces recorded by the concurrent
JavaScript host (accepted and rejected model replies, `?` failures, a failing
ordered effect after a committed change and a failing unguarded effect with
discarded speculative requests). It checks that three independent requests
overlapped and that the reference replay ends in the JavaScript host's state.
`runtime/tests/tasks.mjs` checks scheduling, earliest-failure reporting,
replay mismatch detection and the model adapter.

## Limits

At most 128 effects, 64 tasks and 128 steps per task. Tasks do not branch or
loop; put that logic in pure helpers or split it into tasks the host
composes. When a step ends the task, effects after it that are still running
see their `signal` abort, and no new request starts; handlers decide how to
stop. Native and Wasm hosts do not have task runners yet; they
can run the same manifest through their existing call interfaces.
