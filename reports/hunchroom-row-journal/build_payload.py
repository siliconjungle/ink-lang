from pathlib import Path
import json
p=Path(__file__).resolve().parent
d=[]
def add(kind,name,type,value):d.append(dict(kind=kind,name=name,type=type,value=value))
add('definition','Store','Type → Type → Type','fun Key Row => (Key → Option Row) × Int')
add('definition','Frame','Type → Type → Type','fun Key Row => Key × Option Row × Int')
add('definition','Machine','Type → Type → Type','fun Key Row => Store Key Row × List (Frame Key Row)')
add('definition','weight','{Row : Type} → (Row → Int) → Option Row → Int','fun {_Row} project value => match value with | none => 0 | some row => project row')
add('definition','overwrite','{Key Row : Type} → [DecidableEq Key] → (Key → Option Row) → Key → Option Row → Key → Option Row','fun {_Key _Row} [_] rows key value query => if query = key then value else rows query')
add('lemma','overwrite_restore','∀ {Key Row : Type} [DecidableEq Key] (rows : Key → Option Row) key value, overwrite (overwrite rows key value) key (rows key) = rows','''by
  intro Key Row inst rows key value
  funext query
  by_cases h : query = key
  · subst query; simp [overwrite]
  · simp [overwrite, h]''')
add('definition','applyWrite','{Key Row : Type} → [DecidableEq Key] → (Row → Int) → Machine Key Row → Key × Option Row → Machine Key Row','''fun {_Key _Row} [_] project machine write =>
  let rows := machine.1.1
  let old := rows write.1
  let delta := weight project write.2 - weight project old
  ((overwrite rows write.1 write.2, machine.1.2 + delta),
   (write.1, old, delta) :: machine.2)''')
add('definition','undoOne','{Key Row : Type} → [DecidableEq Key] → Machine Key Row → Machine Key Row','''fun {_Key _Row} [_] machine =>
  match machine.2 with
  | [] => machine
  | frame :: rest =>
    ((overwrite machine.1.1 frame.1 frame.2.1, machine.1.2 - frame.2.2), rest)''')
add('lemma','undo_write','∀ {Key Row : Type} [DecidableEq Key] (project : Row → Int) (machine : Machine Key Row) write, undoOne (applyWrite project machine write) = machine','''by
  intro Key Row inst project machine write
  rcases machine with ⟨⟨rows, cache⟩, journal⟩
  simp [applyWrite, undoOne, overwrite_restore] <;> rfl''')
add('definition','execute','{Key Row : Type} → [DecidableEq Key] → (Row → Int) → List (Key × Option Row) → Machine Key Row → Machine Key Row','''fun {_Key _Row} [_] project writes machine =>
  match writes with
  | [] => machine
  | write :: rest => execute project rest (applyWrite project machine write)''')
add('definition','undoN','{Key Row : Type} → [DecidableEq Key] → Nat → Machine Key Row → Machine Key Row','''fun {_Key _Row} [_] count machine =>
  match count with
  | 0 => machine
  | n + 1 => undoOne (undoN n machine)''')
add('lemma','undo_history','∀ {Key Row : Type} [DecidableEq Key] (project : Row → Int) writes (machine : Machine Key Row), undoN writes.length (execute project writes machine) = machine','''by
  intro Key Row inst project writes
  induction writes with
  | nil => intro machine; rfl
  | cons write rest ih =>
    intro machine
    simp only [List.length_cons, execute, undoN]
    rw [ih, undo_write]''')
add('lemma','future_after_undo','∀ {Key Row : Type} [DecidableEq Key] (project : Row → Int) history future (machine : Machine Key Row), execute project future (undoN history.length (execute project history machine)) = execute project future machine','''by
  intro Key Row inst project history future machine
  rw [undo_history]''')
add('definition','unwind','{Key Row : Type} → [DecidableEq Key] → List (Frame Key Row) → Store Key Row → Store Key Row','''fun {_Key _Row} [_] frames store =>
  match frames with
  | [] => store
  | frame :: rest => unwind rest (overwrite store.1 frame.1 frame.2.1, store.2 - frame.2.2)''')
add('definition','rollback','{Key Row : Type} → [DecidableEq Key] → Machine Key Row → Store Key Row','fun {_Key _Row} [_] machine => unwind machine.2 machine.1')
add('lemma','rollback_write','∀ {Key Row : Type} [DecidableEq Key] (project : Row → Int) (machine : Machine Key Row) write, rollback (applyWrite project machine write) = rollback machine','''by
  intro Key Row inst project machine write
  rcases machine with ⟨⟨rows, cache⟩, journal⟩
  simp [rollback, applyWrite, unwind, overwrite_restore]''')
add('lemma','rollback_history','∀ {Key Row : Type} [DecidableEq Key] (project : Row → Int) writes (machine : Machine Key Row), rollback (execute project writes machine) = rollback machine','''by
  intro Key Row inst project writes
  induction writes with
  | nil => intro machine; rfl
  | cons write rest ih =>
    intro machine
    simp only [execute]
    rw [ih, rollback_write]''')
add('definition','witnessMachine','Machine Nat (Nat × Int)','(((fun _ => some (1, 7)), 7), [])')
add('definition','witnessChanged','Machine Nat (Nat × Int)','applyWrite Prod.snd witnessMachine (0, some (2, 7))')
add('lemma','payload_matters','witnessChanged.1.2 = witnessMachine.1.2 ∧ witnessChanged.1.1 0 ≠ witnessMachine.1.1 0 ∧ undoOne witnessChanged = witnessMachine','''by
  constructor
  · rfl
  constructor
  · simp [witnessChanged, witnessMachine, applyWrite, overwrite]
  · exact undo_write Prod.snd _ _''')
add('lemma','overwrite_twice','∀ {Key Row : Type} [DecidableEq Key] (rows : Key → Option Row) key first last, overwrite (overwrite rows key first) key last = overwrite rows key last','''by
  intro Key Row inst rows key first last
  funext query
  by_cases h : query = key <;> simp [overwrite, h]''')
add('definition','squashTop','{Key Row : Type} → [DecidableEq Key] → Machine Key Row → Machine Key Row','''fun {_Key _Row} [_] machine =>
  match machine.2 with
  | newer :: older :: rest =>
    if newer.1 = older.1 then
      (machine.1, (older.1, older.2.1, older.2.2 + newer.2.2) :: rest)
    else machine
  | _ => machine''')
add('lemma','squash_two_writes','∀ {Key Row : Type} [DecidableEq Key] (project : Row → Int) (machine : Machine Key Row) key first last, squashTop (applyWrite project (applyWrite project machine (key, first)) (key, last)) = applyWrite project machine (key, last)','''by
  intro Key Row inst project machine key first last
  rcases machine with ⟨⟨rows, cache⟩, journal⟩
  simp only [applyWrite, squashTop, overwrite_twice]
  simp only [overwrite, ↓reduceIte]
  dsimp [Store, Frame]
  have h : weight project first - weight project (rows key) +
      (weight project last - weight project first) =
      weight project last - weight project (rows key) := by omega
  rw [Int.add_assoc, h]''')
add('lemma','squashed_undo','∀ {Key Row : Type} [DecidableEq Key] (project : Row → Int) (machine : Machine Key Row) key first last, undoOne (squashTop (applyWrite project (applyWrite project machine (key, first)) (key, last))) = machine','''by
  intro Key Row inst project machine key first last
  rw [squash_two_writes, undo_write]''')
add('lemma','squashed_future','∀ {Key Row : Type} [DecidableEq Key] (project : Row → Int) (machine : Machine Key Row) key first last future, execute project future (squashTop (applyWrite project (applyWrite project machine (key, first)) (key, last))) = execute project future (applyWrite project machine (key, last))','''by
  intro Key Row inst project machine key first last future
  rw [squash_two_writes]''')
payload=dict(title='Complete-row undo journals: arbitrary histories and adjacent same-key coalescing',namespace='CompleteRowUndo',profile='core',description='Generic keyed functional-map journal with arbitrary row payloads and any row-to-Int contribution function. Each write stores the complete prior optional row and its signed contribution delta. Proves one-step inversion, exact restoration of arbitrary finite histories including any preexisting journal and any initial cache offset, identical future write continuations after undo, and full rollback equivalence with an existing stack. Repeated keys, insertions, removals and non-injective projections are included; Also proves that two adjacent writes to the same key may be replaced by the last write if their undo frames are merged using the oldest saved payload and the sum of deltas; complete machine equality establishes future write continuation and undo safety. This law excludes any observable intermediate write or savepoint and does not suppress events. A concrete equal-contribution/different-payload witness explains why a cache-only proof cannot justify row restoration. Motivated by Ink\'s whole-row undo/source projection work. This is a standard reversible-update law, not a novelty, native storage, enumeration, codec, event, transaction-control, machine integer or performance proof. The table is an abstract total key lookup with optional rows; physical finite-map refinement remains separate.',declarations=d)
(p/'module-payload.json').write_text(json.dumps(payload,indent=2)+'\n')
source='import Init\n\nnamespace Hunch.CompleteRowUndo\n'
for x in d:source+=f"{'def' if x['kind']=='definition' else 'theorem'} {x['name']} : ({x['type']}) :=\n  "+x['value'].replace('\n','\n  ')+'\n\n'
source+='end Hunch.CompleteRowUndo\n'
for x in d:source+=f"#print axioms Hunch.CompleteRowUndo.{x['name']}\n"
(p/'module-source.lean').write_text(source)
print('declarations',len(d))
