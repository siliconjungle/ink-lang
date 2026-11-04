# Learned parameters as rows, and gated edits

[Learnable holes](learnable-holes.md) keep their parameters in one generated
trainable state. This page covers two things built on top of that state:

- **Rows.** The parameters as keyed records that hosts can store, diff and
  version like any other data.
- **Gated edits.** A way for anyone (a person, a training run or a
  language-model agent) to propose changes that are admitted only when they
  measurably help.

## Rows

Every parameter has a stable address:

| Family | Row |
| --- | --- |
| `choice` | `{"hole": "recover", "key": ["State.Quoted", "Class.Quote"], "value": "Step.End"}` |
| `mlp` | `{"hole": "adjust", "index": 16, "value": 0.5}` |

A choice row is keyed by its argument values and holds a result value, so it
reads like the rule it is: `recover(State.Quoted, Class.Quote) = Step.End`.
The hole manifest records each choice hole's argument `domains` and result
`values` in ordinal order. Entry `i0 + n0 * (i1 + n1 * ...)` holds the result
for argument ordinals `i0, i1, ...`.

- `ink emit-holes SOURCE -o holes.json` writes the layout (`ink-holes-v1`).
- `ink learn-rows SOURCE [--restore MODEL.snapshot]` lists the current rows
  (`ink-learn-rows-v1`).

A host such as Ink OS can keep these rows in a typed table. A trained model is
then data with history, and two versions differ by the rows that changed.

## Edits

An edit (`ink-learn-edit-v1`) is a list of rows with an optional author and
reason:

```json
{"format": "ink-learn-edit-v1", "author": "model", "reason": "a quote inside a quoted field ends it",
 "rows": [{"hole": "recover", "key": ["State.Quoted", "Class.Quote"], "value": "Step.End"}]}
```

Rows are checked before anything runs: the hole must exist, keys and values
must belong to the declared types, mlp indices must be in range with finite
values, and no parameter may be addressed twice.

## The gate

```
ink gate-edit SOURCE EDIT.json --objective NAME --data HELDOUT.json \
  [--restore MODEL.snapshot] [--allow-equal] -o NEW.snapshot
```

The gate:

1. Applies the edit to the current parameters through the generated
   `__learn_set` learn change. That change also re-checks shapes.
2. Evaluates the declared objective on the gate's data with exact reference
   execution, before and after.
3. Admits the edit only if the objective strictly improves, or, with
   `--allow-equal`, does not get worse. An edit that changes nothing is
   rejected.

An admitted edit writes `NEW.snapshot`, `NEW.snapshot.trace.json` (one
learning commit, accepted by `ink build-model` as with `ink train`) and a
receipt. The receipt binds the source identity, data, edit, rule and both
objective values. A rejected edit exits with an error and writes nothing.

The gate's data should be held out from whatever the proposer saw. The hole
admission rules still apply: an error-path hole can only change inputs the
authored program did not handle. So an edit to an entry the authored code
already covers has no effect and is rejected under the strict rule.

## JavaScript hosts

`runtime/hosts/learn-rows.mjs` provides the same operations against a live
compiled state:

```js
import {learnRows, gatedEdit, proposeEdit} from 'ink-runtime/hosts/learn-rows.mjs';

const rows = learnRows(holes, state.invoke('__learn_get', []).result);
const edit = await proposeEdit({complete, holes, rows, failures});   // an LLM proposes
const verdict = await gatedEdit({call, scratch, holes, edit, objective: 'recovery', data});
```

`proposeEdit` shows a model the rows, the allowed values and failing cases, and
parses its reply into an edit. The reply is only a proposal.

`gatedEdit` evaluates the edit on `scratch`, a second state restored from the
same parameters, and applies it to the live state only when it is admitted.
Without `scratch`, it evaluates on the live state and rolls a rejected edit
back with a second learning commit.

Frozen artifacts (`build-model --freeze-roots __learned`) have no
`__learn_set`, so they cannot be edited. Edits are for live deployments.

## Ink OS

Ink OS offers the same rows and gate for installed apps. See
ink-os-platform `docs/learned-parameters.md`:

- `GET /apps/:id/ink/learned` lists the rows and mirrors them into World.
- `PUT .../learned/gate` stores the owner's held-out data.
- `POST .../learned/edits` judges an edit on a scratch state of the same
  release. It applies the edit live only on improvement and records the
  receipt in World.

## Trust

Gating compares measured objective values on the supplied data. It grants no
equality, approximation, generalisation or profitability authority, and no
proof obligations change. The exact program, including the authored paths
around every hole, is what runs.

## Validation

`tests/learn_rows.rs` covers:

- row and key round trips and invalid rows;
- admission, rejection, no-op and strict versus non-strict edits, including an
  edit to an entry the authored code already covers;
- weight edits judged by a regression objective;
- snapshot and trace replay equality;
- the CLI, a frozen build from an admitted trace, and the JavaScript gate with
  a scripted model proposal.

`runtime/tests/learn-rows.mjs` covers rows, rollback and scratch evaluation.
