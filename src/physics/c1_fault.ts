/**
 * C1: Fault Reactivation Safety (Mohr-Coulomb criterion)
 *
 * Thermoelastic correction (uniaxial strain, laterally extensive reservoir):
 *   delta_sigma_T = E * alpha_T * delta_T / (1 - nu)  [Pa]
 *   (Fjaer et al. 2008; Zoback 2007)
 *
 * Applied to sigma_3 (cooling reduces horizontal stress, tightening injection window).
 *
 * P_max = [sigma_n_total - (tau - C0) / mu_f] / alpha_biot
 * Pass: P_init < P_max
 *
 * References:
 *   Jaeger, Cook and Zimmerman (2007) Fundamentals of Rock Mechanics, 4th ed.
 *   Zoback, M.D. (2007) Reservoir Geomechanics. Cambridge University Press.
 *   Fjaer et al. (2008) Petroleum Related Rock Mechanics, 2nd ed.
 */

import type { FormationInput, CriterionResult } from "../types.js";

const DEG2RAD = Math.PI / 180;

export function c1FaultReactivation(f: FormationInput): CriterionResult {
  // Thermoelastic stress correction (uniaxial strain; Fjaer et al. 2008)
  const delta_T = f.delta_T_C ?? 0.0;
  const E_Pa = (f.E_GPa ?? 20.0) * 1e9;
  const alpha_T = f.alpha_T ?? 1e-5;
  const nu = f.nu_poisson ?? 0.25;
  const delta_sigma_T_Pa = (E_Pa * alpha_T * delta_T) / (1.0 - nu);
  const delta_sigma_T_MPa = delta_sigma_T_Pa / 1e6;

  // Cooling (delta_T < 0) reduces sigma_3, tightening the injection window
  const sigma3_eff_MPa = f.sigma3_MPa + delta_sigma_T_MPa;

  const beta_rad = f.beta_deg * DEG2RAD;

  // Normal and shear stress on fault plane (Eqs 1-2 of main paper)
  const sigma_n_total =
    (f.sigma1_MPa + sigma3_eff_MPa) / 2.0 -
    ((f.sigma1_MPa - sigma3_eff_MPa) / 2.0) * Math.cos(2.0 * beta_rad);
  const tau =
    ((f.sigma1_MPa - sigma3_eff_MPa) / 2.0) * Math.sin(2.0 * beta_rad);
  const sigma_n_eff = sigma_n_total - f.P_init_MPa;

  // Slip criterion with Biot effective stress (Zoback 2007 §6):
  //   tau = C0 + mu_f * (sigma_n_total - alpha * P_max)
  //   => P_max_biot = [sigma_n_total - (tau - C0)/mu_f] / alpha_biot
  const bracket = sigma_n_total - (tau - f.C0_MPa) / f.mu_f;
  const P_max_MPa = bracket / f.alpha_biot;

  const pass_flag = f.P_init_MPa < P_max_MPa;

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
      sigma_n_total_MPa: sigma_n_total,
      sigma_n_eff_MPa: sigma_n_eff,
      tau_MPa: tau,
      delta_sigma_T_MPa,
      margin_MPa: P_max_MPa - f.P_init_MPa,
    },
  };
}
