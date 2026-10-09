import Std
import Lean.Elab.Tactic.Omega

namespace BoundedCache

def exactReplace (total old new : Int) : Int := total - old + new

def wordReplace (modulus total old new : Int) : Int :=
  ((total % modulus - old % modulus) % modulus + new % modulus) % modulus

theorem replacement_residue (modulus total old new : Int) :
    wordReplace modulus total old new = exactReplace total old new % modulus := by
  simp only [wordReplace, exactReplace, Int.sub_emod, Int.add_emod, Int.emod_emod]

theorem bounded_replacement (modulus total old new : Int)
    (_positive : 0 < modulus) (_oldNonnegative : 0 ≤ old)
    (oldIncluded : old ≤ total) (newNonnegative : 0 ≤ new)
    (fits : total - old + new < modulus) :
    wordReplace modulus total old new = exactReplace total old new := by
  rw [replacement_residue]
  apply Int.emod_eq_of_lt
  · unfold exactReplace; omega
  · exact fits

theorem intermediate_wrap_example :
    wordReplace 256 250 240 20 = 30 := by decide

def monomial (env : Nat → Int) (variables : List Nat) : Int :=
  variables.foldr (fun index rest => env index * rest) 1

def wordMonomial (modulus : Int) (env : Nat → Int) (variables : List Nat) : Int :=
  variables.foldr (fun index rest => (env index % modulus * rest) % modulus) (1 % modulus)

def polynomial (env : Nat → Int) (terms : List (Int × List Nat)) : Int :=
  terms.foldr (fun term rest => term.1 * monomial env term.2 + rest) 0

def wordPolynomial (modulus : Int) (env : Nat → Int) (terms : List (Int × List Nat)) : Int :=
  terms.foldr (fun term rest => ((term.1 % modulus * wordMonomial modulus env term.2) % modulus + rest) % modulus) 0

theorem monomial_residue (modulus : Int) (env : Nat → Int) (variables : List Nat) :
    wordMonomial modulus env variables = monomial env variables % modulus := by
  induction variables with
  | nil => rfl
  | cons index rest ih =>
    simp only [wordMonomial, monomial, List.foldr_cons] at *
    rw [ih]
    simp only [Int.mul_emod, Int.emod_emod]

theorem polynomial_residue (modulus : Int) (env : Nat → Int) (terms : List (Int × List Nat)) :
    wordPolynomial modulus env terms = polynomial env terms % modulus := by
  induction terms with
  | nil => simp [wordPolynomial, polynomial]
  | cons term rest ih =>
    simp only [wordPolynomial, polynomial, List.foldr_cons] at *
    rw [ih, monomial_residue]
    simp only [Int.add_emod, Int.mul_emod, Int.emod_emod]

theorem bounded_polynomial (modulus : Int) (env : Nat → Int) (terms : List (Int × List Nat))
    (nonnegative : 0 ≤ polynomial env terms) (fits : polynomial env terms < modulus) :
    wordPolynomial modulus env terms = polynomial env terms := by
  rw [polynomial_residue]
  exact Int.emod_eq_of_lt nonnegative fits

theorem equivalent_bounded_polynomial (modulus : Int) (env : Nat → Int)
    (original alternative : List (Int × List Nat))
    (equivalent : polynomial env original = polynomial env alternative)
    (nonnegative : 0 ≤ polynomial env original) (fits : polynomial env original < modulus) :
    wordPolynomial modulus env alternative = polynomial env original := by
  rw [polynomial_residue, ← equivalent]
  exact Int.emod_eq_of_lt nonnegative fits

end BoundedCache
#print axioms BoundedCache.bounded_replacement
#print axioms BoundedCache.equivalent_bounded_polynomial
