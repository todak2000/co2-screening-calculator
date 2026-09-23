/**
 * C1: Fault Reactivation Safety (Mohr-Coulomb criterion)
 *
 * Computes the maximum safe injection pressure P_max such that the
 * effective normal stress on the critically-oriented fault plane
 * remains below the Mohr-Coulomb failure envelope.
 *
 * Thermoelastic correction for Joule-Thomson cooling at the sandface
 * is applied when delta_T_C is provided (Vilarrasa et al. 2013).
 *
 * P_max criterion (Zoback, 2007):
 *   tau <= C0 + mu_f * (sigma_n - alpha * P)
 *   => P_max = [sigma_n - (tau - C0)/mu_f] / alpha_biot
 *
 * Reference: Zoback, M.D. (2007) Reservoir Geomechanics. Cambridge University Press.
 */

import type { FormationInput, CriterionResult } from "../types.js";

const DEG2RAD = Math.PI / 180;

export function c1FaultReactivation(f: FormationInput): CriterionResult {
  const beta = f.beta_deg * DEG2RAD;

  // Normal and shear stress on fault plane
  const sigma_n =
    ((f.sigma1_MPa + f.sigma3_MPa) / 2) +
    ((f.sigma1_MPa - f.sigma3_MPa) / 2) * Math.cos(2 * beta);
  const tau =
    ((f.sigma1_MPa - f.sigma3_MPa) / 2) * Math.sin(2 * beta);

  // Thermoelastic correction: cooling reduces sigma3 (tensile direction)
  // delta_sigma_T = E * alpha_T * delta_T / (1 - nu)
  // We use a conservative proxy: delta_T shifts P_init by an equivalent stress,
  // which is bounded to +/- 3 MPa for screening purposes when raw E/nu absent.
  // Full geomechanical model requires E and nu; simplified correction here.
  let sigma_n_eff = sigma_n;
  if (f.delta_T_C !== undefined) {
    // Simplified: 0.1 MPa/degC thermoelastic stress change (typical sandstone range)
    // Replace with E*alpha_T/(1-nu)*|delta_T| when elastic constants are available.
    const thermoelastic_MPa = 0.1 * Math.abs(f.delta_T_C);
    // Cooling (delta_T < 0) reduces confining stress, making failure more likely
    if (f.delta_T_C < 0) {
      sigma_n_eff = sigma_n - thermoelastic_MPa;
    }
  }

  // P_max: maximum pore pressure before fault reactivation
  const P_max_MPa =
    (sigma_n_eff - (tau - f.C0_MPa) / f.mu_f) / f.alpha_biot;

  const pass_flag = P_max_MPa > f.P_init_MPa;

  return {
    criterion: "C1",
    label: "Fault Reactivation Safety",
    pass_flag,
    status: pass_flag ? "PASS" : "FAIL",
    value: P_max_MPa,
    threshold: f.P_init_MPa,
    unit: "MPa",
    details: {
      P_max_MPa,
      P_init_MPa: f.P_init_MPa,
      sigma_n_MPa: sigma_n,
      tau_MPa: tau,
      margin_MPa: P_max_MPa - f.P_init_MPa,
    },
  };
}
