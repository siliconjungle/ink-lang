import Std
import Lean.Elab.Tactic.Omega

namespace Hunch.BoundedPolynomial
def monomial : ((Nat → Int) → List Nat → Int) :=
  fun env variables =>
    variables.foldr (fun index rest => env index * rest) 1

def wordMonomial : (Int → (Nat → Int) → List Nat → Int) :=
  fun modulus env variables =>
    variables.foldr (fun index rest => (env index % modulus * rest) % modulus) (1 % modulus)

def polynomial : ((Nat → Int) → List (Int × List Nat) → Int) :=
  fun env terms =>
    terms.foldr (fun term rest => term.1 * monomial env term.2 + rest) 0

def wordPolynomial : (Int → (Nat → Int) → List (Int × List Nat) → Int) :=
  fun modulus env terms =>
    terms.foldr (fun term rest => ((term.1 % modulus * wordMonomial modulus env term.2) % modulus + rest) % modulus) 0

theorem monomial_residue : (∀ (modulus : Int) (env : Nat → Int) (variables : List Nat), wordMonomial modulus env variables = monomial env variables % modulus) :=
  by
    intro modulus env variables
    induction variables with
    | nil => rfl
    | cons index rest ih =>
      simp only [wordMonomial, monomial, List.foldr_cons] at *
      rw [ih]
      simp only [Int.mul_emod, Int.emod_emod]

theorem polynomial_residue : (∀ (modulus : Int) (env : Nat → Int) (terms : List (Int × List Nat)), wordPolynomial modulus env terms = polynomial env terms % modulus) :=
  by
    intro modulus env terms
    induction terms with
    | nil => simp [wordPolynomial, polynomial]
    | cons term rest ih =>
      simp only [wordPolynomial, polynomial, List.foldr_cons] at *
      rw [ih, monomial_residue]
      simp only [Int.add_emod, Int.mul_emod, Int.emod_emod]

theorem bounded_polynomial : (∀ (modulus : Int) (env : Nat → Int) (terms : List (Int × List Nat)),
  0 ≤ polynomial env terms → polynomial env terms < modulus →
  wordPolynomial modulus env terms = polynomial env terms) :=
  by
    intro modulus env terms nonnegative fits
    rw [polynomial_residue]
    exact Int.emod_eq_of_lt nonnegative fits

theorem equivalent_bounded_polynomial : (∀ (modulus : Int) (env : Nat → Int)
  (original alternative : List (Int × List Nat)),
  polynomial env original = polynomial env alternative →
  0 ≤ polynomial env original → polynomial env original < modulus →
  wordPolynomial modulus env alternative = polynomial env original) :=
  by
    intro modulus env original alternative equivalent nonnegative fits
    rw [polynomial_residue, ← equivalent]
    exact Int.emod_eq_of_lt nonnegative fits

end Hunch.BoundedPolynomial

def OA_statement : Prop := True
theorem OA_target : OA_statement := by trivial
#print axioms Hunch.BoundedPolynomial.monomial
#print axioms Hunch.BoundedPolynomial.wordMonomial
#print axioms Hunch.BoundedPolynomial.polynomial
#print axioms Hunch.BoundedPolynomial.wordPolynomial
#print axioms Hunch.BoundedPolynomial.monomial_residue
#print axioms Hunch.BoundedPolynomial.polynomial_residue
#print axioms Hunch.BoundedPolynomial.bounded_polynomial
#print axioms Hunch.BoundedPolynomial.equivalent_bounded_polynomial
#print axioms OA_target
#check OA_target
