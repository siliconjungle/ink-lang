import Init

namespace Hunch.CompleteRowUndo
def Store : (Type → Type → Type) :=
  fun Key Row => (Key → Option Row) × Int

def Frame : (Type → Type → Type) :=
  fun Key Row => Key × Option Row × Int

def Machine : (Type → Type → Type) :=
  fun Key Row => Store Key Row × List (Frame Key Row)

def weight : ({Row : Type} → (Row → Int) → Option Row → Int) :=
  fun {_Row} project value => match value with | none => 0 | some row => project row

def overwrite : ({Key Row : Type} → [DecidableEq Key] → (Key → Option Row) → Key → Option Row → Key → Option Row) :=
  fun {_Key _Row} [_] rows key value query => if query = key then value else rows query

theorem overwrite_restore : (∀ {Key Row : Type} [DecidableEq Key] (rows : Key → Option Row) key value, overwrite (overwrite rows key value) key (rows key) = rows) :=
  by
    intro Key Row inst rows key value
    funext query
    by_cases h : query = key
    · subst query; simp [overwrite]
    · simp [overwrite, h]

def applyWrite : ({Key Row : Type} → [DecidableEq Key] → (Row → Int) → Machine Key Row → Key × Option Row → Machine Key Row) :=
  fun {_Key _Row} [_] project machine write =>
    let rows := machine.1.1
    let old := rows write.1
    let delta := weight project write.2 - weight project old
    ((overwrite rows write.1 write.2, machine.1.2 + delta),
     (write.1, old, delta) :: machine.2)

def undoOne : ({Key Row : Type} → [DecidableEq Key] → Machine Key Row → Machine Key Row) :=
  fun {_Key _Row} [_] machine =>
    match machine.2 with
    | [] => machine
    | frame :: rest =>
      ((overwrite machine.1.1 frame.1 frame.2.1, machine.1.2 - frame.2.2), rest)

theorem undo_write : (∀ {Key Row : Type} [DecidableEq Key] (project : Row → Int) (machine : Machine Key Row) write, undoOne (applyWrite project machine write) = machine) :=
  by
    intro Key Row inst project machine write
    rcases machine with ⟨⟨rows, cache⟩, journal⟩
    simp [applyWrite, undoOne, overwrite_restore]
    rfl

def execute : ({Key Row : Type} → [DecidableEq Key] → (Row → Int) → List (Key × Option Row) → Machine Key Row → Machine Key Row) :=
  fun {_Key _Row} [_] project writes machine =>
    match writes with
    | [] => machine
    | write :: rest => execute project rest (applyWrite project machine write)

def undoN : ({Key Row : Type} → [DecidableEq Key] → Nat → Machine Key Row → Machine Key Row) :=
  fun {_Key _Row} [_] count machine =>
    match count with
    | 0 => machine
    | n + 1 => undoOne (undoN n machine)

theorem undo_history : (∀ {Key Row : Type} [DecidableEq Key] (project : Row → Int) writes (machine : Machine Key Row), undoN writes.length (execute project writes machine) = machine) :=
  by
    intro Key Row inst project writes
    induction writes with
    | nil => intro machine; rfl
    | cons write rest ih =>
      intro machine
      simp only [List.length_cons, execute, undoN]
      rw [ih, undo_write]

theorem future_after_undo : (∀ {Key Row : Type} [DecidableEq Key] (project : Row → Int) history future (machine : Machine Key Row), execute project future (undoN history.length (execute project history machine)) = execute project future machine) :=
  by
    intro Key Row inst project history future machine
    rw [undo_history]

def unwind : ({Key Row : Type} → [DecidableEq Key] → List (Frame Key Row) → Store Key Row → Store Key Row) :=
  fun {_Key _Row} [_] frames store =>
    match frames with
    | [] => store
    | frame :: rest => unwind rest (overwrite store.1 frame.1 frame.2.1, store.2 - frame.2.2)

def rollback : ({Key Row : Type} → [DecidableEq Key] → Machine Key Row → Store Key Row) :=
  fun {_Key _Row} [_] machine => unwind machine.2 machine.1

theorem rollback_write : (∀ {Key Row : Type} [DecidableEq Key] (project : Row → Int) (machine : Machine Key Row) write, rollback (applyWrite project machine write) = rollback machine) :=
  by
    intro Key Row inst project machine write
    rcases machine with ⟨⟨rows, cache⟩, journal⟩
    simp [rollback, applyWrite, unwind, overwrite_restore]

theorem rollback_history : (∀ {Key Row : Type} [DecidableEq Key] (project : Row → Int) writes (machine : Machine Key Row), rollback (execute project writes machine) = rollback machine) :=
  by
    intro Key Row inst project writes
    induction writes with
    | nil => intro machine; rfl
    | cons write rest ih =>
      intro machine
      simp only [execute]
      rw [ih, rollback_write]

def witnessMachine : (Machine Nat (Nat × Int)) :=
  (((fun _ => some (1, 7)), 7), [])

def witnessChanged : (Machine Nat (Nat × Int)) :=
  applyWrite Prod.snd witnessMachine (0, some (2, 7))

theorem payload_matters : (witnessChanged.1.2 = witnessMachine.1.2 ∧ witnessChanged.1.1 0 ≠ witnessMachine.1.1 0 ∧ undoOne witnessChanged = witnessMachine) :=
  by
    constructor
    · rfl
    constructor
    · simp [witnessChanged, witnessMachine, applyWrite, overwrite]
    · exact undo_write Prod.snd _ _

theorem overwrite_twice : (∀ {Key Row : Type} [DecidableEq Key] (rows : Key → Option Row) key first last, overwrite (overwrite rows key first) key last = overwrite rows key last) :=
  by
    intro Key Row inst rows key first last
    funext query
    by_cases h : query = key <;> simp [overwrite, h]

def squashTop : ({Key Row : Type} → [DecidableEq Key] → Machine Key Row → Machine Key Row) :=
  fun {_Key _Row} [_] machine =>
    match machine.2 with
    | newer :: older :: rest =>
      if newer.1 = older.1 then
        (machine.1, (older.1, older.2.1, older.2.2 + newer.2.2) :: rest)
      else machine
    | _ => machine

theorem squash_two_writes : (∀ {Key Row : Type} [DecidableEq Key] (project : Row → Int) (machine : Machine Key Row) key first last, squashTop (applyWrite project (applyWrite project machine (key, first)) (key, last)) = applyWrite project machine (key, last)) :=
  by
    intro Key Row inst project machine key first last
    rcases machine with ⟨⟨rows, cache⟩, journal⟩
    simp only [applyWrite, squashTop, overwrite_twice]
    simp only [overwrite, ↓reduceIte]
    dsimp [Store, Frame]
    have h : weight project first - weight project (rows key) +
        (weight project last - weight project first) =
        weight project last - weight project (rows key) := by omega
    rw [Int.add_assoc, h]

theorem squashed_undo : (∀ {Key Row : Type} [DecidableEq Key] (project : Row → Int) (machine : Machine Key Row) key first last, undoOne (squashTop (applyWrite project (applyWrite project machine (key, first)) (key, last))) = machine) :=
  by
    intro Key Row inst project machine key first last
    rw [squash_two_writes, undo_write]

theorem squashed_future : (∀ {Key Row : Type} [DecidableEq Key] (project : Row → Int) (machine : Machine Key Row) key first last future, execute project future (squashTop (applyWrite project (applyWrite project machine (key, first)) (key, last))) = execute project future (applyWrite project machine (key, last))) :=
  by
    intro Key Row inst project machine key first last future
    rw [squash_two_writes]

end Hunch.CompleteRowUndo

def OA_statement : Prop := (True)

theorem OA_target : OA_statement :=
  by trivial

#print axioms Hunch.CompleteRowUndo.Store
#print axioms Hunch.CompleteRowUndo.Frame
#print axioms Hunch.CompleteRowUndo.Machine
#print axioms Hunch.CompleteRowUndo.weight
#print axioms Hunch.CompleteRowUndo.overwrite
#print axioms Hunch.CompleteRowUndo.overwrite_restore
#print axioms Hunch.CompleteRowUndo.applyWrite
#print axioms Hunch.CompleteRowUndo.undoOne
#print axioms Hunch.CompleteRowUndo.undo_write
#print axioms Hunch.CompleteRowUndo.execute
#print axioms Hunch.CompleteRowUndo.undoN
#print axioms Hunch.CompleteRowUndo.undo_history
#print axioms Hunch.CompleteRowUndo.future_after_undo
#print axioms Hunch.CompleteRowUndo.unwind
#print axioms Hunch.CompleteRowUndo.rollback
#print axioms Hunch.CompleteRowUndo.rollback_write
#print axioms Hunch.CompleteRowUndo.rollback_history
#print axioms Hunch.CompleteRowUndo.witnessMachine
#print axioms Hunch.CompleteRowUndo.witnessChanged
#print axioms Hunch.CompleteRowUndo.payload_matters
#print axioms Hunch.CompleteRowUndo.overwrite_twice
#print axioms Hunch.CompleteRowUndo.squashTop
#print axioms Hunch.CompleteRowUndo.squash_two_writes
#print axioms Hunch.CompleteRowUndo.squashed_undo
#print axioms Hunch.CompleteRowUndo.squashed_future
#print axioms OA_target
#check OA_target
