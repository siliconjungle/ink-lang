# Counterfactual discovery only: remove exactly the three newly admitted frozen
# laws. All other installed modules, prices, compiler and proof checks are live.
import producers.v8_word_laws as v8
original = v8.specialize
excluded = {'v8-word/conversion/'+name for name in ['guarded_roundtrip','guarded_wrapping_roundtrip','relational_roundtrip']}
def specialize(subject,core):
    return [(name,law)for name,law in original(subject,core)if name not in excluded]
v8.specialize = specialize
