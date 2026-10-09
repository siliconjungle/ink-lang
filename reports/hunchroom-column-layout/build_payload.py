"""Reproduce a standalone core Lean contribution; no network or credentials."""
from pathlib import Path
import json

p = Path(__file__).resolve().parent
d = []
def add(kind, name, type, value):
    d.append(dict(kind=kind, name=name, type=type, value=value))

add('definition', 'Rows', 'Type → Type → Type', 'fun Key Row => List (Key × Row)')
add('definition', 'Columns', 'Type → Type → Type', 'fun Key Row => List Key × List Row')
add('definition', 'encode', '{Key Row : Type} → Rows Key Row → Columns Key Row',
    'fun {_Key _Row} rows => (rows.map Prod.fst, rows.map Prod.snd)')
add('definition', 'decode', '{Key Row : Type} → Columns Key Row → Rows Key Row',
    'fun {_Key _Row} columns => columns.1.zip columns.2')
add('definition', 'aligned', '{Key Row : Type} → Columns Key Row → Prop',
    'fun {_Key _Row} columns => columns.1.length = columns.2.length')
add('definition', 'prependRows', '{Key Row : Type} → Key → Rows Key Row → Option Row → Rows Key Row',
    'fun {_Key _Row} key rows value => match value with | none => rows | some row => (key, row) :: rows')
add('definition', 'prependColumns', '{Key Row : Type} → Key → Columns Key Row → Option Row → Columns Key Row',
    'fun {_Key _Row} key columns value => match value with | none => columns | some row => (key :: columns.1, row :: columns.2)')
add('lemma', 'decode_encode', '∀ {Key Row : Type} (rows : Rows Key Row), decode (encode rows) = rows', '''by
  intro Key Row rows
  induction rows with
  | nil => rfl
  | cons head tail ih =>
    rcases head with ⟨key, row⟩
    change (key, row) :: decode (encode tail) = (key, row) :: tail
    rw [ih]''')
add('lemma', 'encoded_aligned', '∀ {Key Row : Type} (rows : Rows Key Row), aligned (encode rows)', '''by
  intro Key Row rows
  induction rows with
  | nil => rfl
  | cons head tail ih =>
    change (encode tail).1.length + 1 = (encode tail).2.length + 1
    exact congrArg (fun n => n + 1) ih''')
add('lemma', 'encode_decode', '∀ {Key Row : Type} (keys : List Key) (values : List Row), aligned (keys, values) → encode (decode (keys, values)) = (keys, values)', '''by
  intro Key Row keys
  induction keys with
  | nil =>
    intro values h
    cases values with
    | nil => rfl
    | cons row tail => exact False.elim (Nat.noConfusion h)
  | cons key keys ih =>
    intro values h
    cases values with
    | nil => exact False.elim (Nat.noConfusion h)
    | cons row values =>
      have ht : aligned (keys, values) := Nat.succ.inj h
      change (key :: (encode (decode (keys, values))).1,
        row :: (encode (decode (keys, values))).2) = (key :: keys, row :: values)
      rw [ih values ht]''')
add('lemma', 'encode_prepend', '∀ {Key Row : Type} key (rows : Rows Key Row) value, encode (prependRows key rows value) = prependColumns key (encode rows) value', '''by
  intro Key Row key rows value
  cases value <;> rfl''')
add('definition', 'rowWrite', '{Key Row : Type} → [DecidableEq Key] → (Key → Key → Bool) → Rows Key Row → Key → Option Row → Rows Key Row', '''fun {_Key _Row} [_] less rows key value =>
  match rows with
  | [] => prependRows key [] value
  | (headKey, headRow) :: tail =>
    if headKey = key then prependRows headKey tail value
    else if less key headKey then prependRows key rows value
    else (headKey, headRow) :: rowWrite less tail key value''')
add('definition', 'columnWrite', '{Key Row : Type} → [DecidableEq Key] → (Key → Key → Bool) → List Key → List Row → Key → Option Row → Columns Key Row', '''fun {_Key _Row} [_] less keys values key value =>
  match keys with
  | [] => prependColumns key (keys, values) value
  | headKey :: keyTail =>
    match values with
    | [] => (keys, values)
    | headRow :: rowTail =>
      if headKey = key then prependColumns headKey (keyTail, rowTail) value
      else if less key headKey then prependColumns key (keys, values) value
      else
        let next := columnWrite less keyTail rowTail key value
        (headKey :: next.1, headRow :: next.2)''')
add('lemma', 'write_correspondence', '∀ {Key Row : Type} [DecidableEq Key] less (rows : Rows Key Row) key value, columnWrite less (encode rows).1 (encode rows).2 key value = encode (rowWrite less rows key value)', '''by
  intro Key Row inst less rows
  induction rows with
  | nil =>
    intro key value
    exact (encode_prepend key [] value).symm
  | cons head tail ih =>
    rcases head with ⟨headKey, headRow⟩
    intro key value
    by_cases he : headKey = key
    · simp only [encode, List.map_cons, columnWrite, rowWrite, he, ↓reduceIte]
      exact (encode_prepend key tail value).symm
    · cases hb : less key headKey with
      | false =>
        simp only [encode, List.map_cons, columnWrite, rowWrite, he, hb, ↓reduceIte]
        exact congrArg (fun c : Columns Key Row =>
          (headKey :: c.1, headRow :: c.2)) (ih key value)
      | true =>
        simp only [encode, List.map_cons, columnWrite, rowWrite, he, hb, ↓reduceIte]
        exact (encode_prepend key ((headKey, headRow) :: tail) value).symm''')
add('definition', 'rowLookup', '{Key Row : Type} → [DecidableEq Key] → Rows Key Row → Key → Option Row', '''fun {_Key _Row} [_] rows query =>
  match rows with
  | [] => none
  | (key, row) :: tail => if key = query then some row else rowLookup tail query''')
add('definition', 'columnLookup', '{Key Row : Type} → [DecidableEq Key] → List Key → List Row → Key → Option Row', '''fun {_Key _Row} [_] keys values query =>
  match keys with
  | [] => none
  | key :: keyTail =>
    match values with
    | [] => none
    | row :: rowTail => if key = query then some row else columnLookup keyTail rowTail query''')
add('lemma', 'lookup_correspondence', '∀ {Key Row : Type} [DecidableEq Key] (rows : Rows Key Row) query, columnLookup (encode rows).1 (encode rows).2 query = rowLookup rows query', '''by
  intro Key Row inst rows
  induction rows with
  | nil => intro query; rfl
  | cons head tail ih =>
    rcases head with ⟨key, row⟩
    intro query
    by_cases h : key = query
    · simp only [encode, List.map_cons, columnLookup, rowLookup, h, ↓reduceIte]
    · simp only [encode, List.map_cons, columnLookup, rowLookup, h, ↓reduceIte]
      exact ih query''')
add('definition', 'rowExecute', '{Key Row : Type} → [DecidableEq Key] → (Key → Key → Bool) → List (Key × Option Row) → Rows Key Row → Rows Key Row', '''fun {_Key _Row} [_] less writes rows =>
  match writes with
  | [] => rows
  | write :: rest => rowExecute less rest (rowWrite less rows write.1 write.2)''')
add('definition', 'columnExecute', '{Key Row : Type} → [DecidableEq Key] → (Key → Key → Bool) → List (Key × Option Row) → Columns Key Row → Columns Key Row', '''fun {_Key _Row} [_] less writes columns =>
  match writes with
  | [] => columns
  | write :: rest => columnExecute less rest (columnWrite less columns.1 columns.2 write.1 write.2)''')
add('lemma', 'history_correspondence', '∀ {Key Row : Type} [DecidableEq Key] less writes (rows : Rows Key Row), columnExecute less writes (encode rows) = encode (rowExecute less writes rows)', '''by
  intro Key Row inst less writes
  induction writes with
  | nil => intro rows; rfl
  | cons write rest ih =>
    intro rows
    simp only [columnExecute, rowExecute, write_correspondence]
    exact ih _''')
add('lemma', 'future_enumeration', '∀ {Key Row : Type} [DecidableEq Key] less writes (rows : Rows Key Row), decode (columnExecute less writes (encode rows)) = rowExecute less writes rows', '''by
  intro Key Row inst less writes rows
  rw [history_correspondence, decode_encode]''')
add('lemma', 'future_lookup', '∀ {Key Row : Type} [DecidableEq Key] less writes (rows : Rows Key Row) query, columnLookup (columnExecute less writes (encode rows)).1 (columnExecute less writes (encode rows)).2 query = rowLookup (rowExecute less writes rows) query', '''by
  intro Key Row inst less writes rows query
  rw [history_correspondence]
  exact lookup_correspondence _ _''')
add('lemma', 'future_alignment', '∀ {Key Row : Type} [DecidableEq Key] less writes (rows : Rows Key Row), aligned (columnExecute less writes (encode rows))', '''by
  intro Key Row inst less writes rows
  rw [history_correspondence]
  exact encoded_aligned _''')
add('lemma', 'aligned_history', '∀ {Key Row : Type} [DecidableEq Key] less writes (keys : List Key) (values : List Row), aligned (keys, values) → columnExecute less writes (keys, values) = encode (rowExecute less writes (decode (keys, values)))', '''by
  intro Key Row inst less writes keys values h
  have eq := history_correspondence less writes (decode (keys, values))
  rw [encode_decode keys values h] at eq
  exact eq''')
add('lemma', 'aligned_history_stays_aligned', '∀ {Key Row : Type} [DecidableEq Key] less writes (keys : List Key) (values : List Row), aligned (keys, values) → aligned (columnExecute less writes (keys, values))', '''by
  intro Key Row inst less writes keys values h
  rw [aligned_history less writes keys values h]
  exact encoded_aligned _''')
add('definition', 'checkedDecode', '{Key Row : Type} → Columns Key Row → Option (Rows Key Row)',
    'fun {_Key _Row} columns => if columns.1.length = columns.2.length then some (decode columns) else none')
add('lemma', 'checked_decode_sound', '∀ {Key Row : Type} (columns : Columns Key Row) rows, checkedDecode columns = some rows → encode rows = columns', '''by
  intro Key Row columns rows h
  rcases columns with ⟨keys, values⟩
  by_cases ha : keys.length = values.length
  · have hr : decode (keys, values) = rows := by simpa [checkedDecode, ha] using h
    rw [← hr]
    exact encode_decode keys values ha
  · simp [checkedDecode, ha] at h''')
add('lemma', 'checked_decode_accepts_encoding', '∀ {Key Row : Type} (rows : Rows Key Row), checkedDecode (encode rows) = some rows', '''by
  intro Key Row rows
  unfold checkedDecode
  split
  · rw [decode_encode]
  · rename_i h
    exact False.elim (h (encoded_aligned rows))''')
add('definition', 'malformedKeys', 'Columns Nat Nat', '([1, 2], [7])')
add('definition', 'malformedValues', 'Columns Nat Nat', '([1], [7, 8])')
add('lemma', 'truncation_loses_data', 'encode (decode malformedKeys) ≠ malformedKeys ∧ encode (decode malformedValues) ≠ malformedValues', '''by
  change (([1], [7]) : List Nat × List Nat) ≠ ([1, 2], [7]) ∧
    (([1], [7]) : List Nat × List Nat) ≠ ([1], [7, 8])
  constructor <;> decide''')
add('lemma', 'alignment_rejects_truncation', 'checkedDecode malformedKeys = none ∧ checkedDecode malformedValues = none', 'by constructor <;> rfl')

payload = dict(
    title='Complete-row and column layouts: checked conversion and all future writes',
    namespace='CompleteRowColumns', profile='core',
    description="From Ink's database-defined row/column layout work. Independent recursive row and paired-column algorithms insert, replace and remove complete arbitrary row payloads. Proves exact ordered enumeration roundtrip, lookup correspondence, one-write correspondence and all finite future write histories; lane alignment is preserved. Starting from any aligned columns, the independent column history equals encoding the row history after decoding. A checked decoder accepts encoded rows and any accepted result re-encodes to the exact original columns. Two explicit witnesses show that plain truncating zip loses an unmatched key or value. Keys and payloads are arbitrary types with decidable key equality; the comparison is any Key-to-Key-to-Bool function. No order laws or sortedness premises are needed for representation correspondence because both algorithms make the same branch decisions. This does NOT prove that an arbitrary comparator gives correct ordered-map semantics, sortedness, binary search, native Vec/BTreeMap refinement, allocation/index safety, migration/effect atomicity, codecs or performance. Those are separate obligations. Standard sequence/refinement laws, no novelty claim. The Lean translation is independently checked; it is not an automatic verified translator from Ink proof objects and grants no new native optimization admission.",
    declarations=d)
assert len(d) <= 32
(p/'module-payload.json').write_text(json.dumps(payload, indent=2)+'\n')
source = 'import Init\n\nnamespace Hunch.CompleteRowColumns\n'
for x in d:
    source += f"{'def' if x['kind'] == 'definition' else 'theorem'} {x['name']} : ({x['type']}) :=\n  " + x['value'].replace('\n', '\n  ') + '\n\n'
source += 'end Hunch.CompleteRowColumns\n'
for x in d:
    source += f"#print axioms Hunch.CompleteRowColumns.{x['name']}\n"
(p/'module-source.lean').write_text(source)
print('declarations', len(d))
