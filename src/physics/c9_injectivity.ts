/**
 * C9: Injectivity Feasibility - Darcy Radial Flow
 *
 *   II = (2 * pi * k * h) / (mu * (ln(r_e/r_w) + skin))   [m3/s/Pa]
 *
 * Pass: II > 1e-9 m3/(s·Pa)  (technically feasible; EPA 40 CFR 146.82(a)(1)(iv))
 * This equals approximately 86 m3/(day·MPa).
 *
 * Defaults: r_e = 1000 m, r_w = 0.1 m, skin = 0
 *
 * References:
 *   Bachu, S. (2003). Environmental Geology 44(3), 277-289.
 *   EPA 40 CFR 146.82(a)(1)(iv).
 */

import type { FormationInput, CriterionResult } from "../types.js";

const II_THRESHOLD_SI = 1e-9;      // m3/(s·Pa)
const SECONDS_PER_DAY = 86400;

export function c9Injectivity(f: FormationInput): CriterionResult {
  const k_m2 = f.k_res_mD * 9.869e-16;
  const mu = f.mu_CO2 ?? 6.5e-5; // Pa.s
  const r_e = f.r_e_m ?? 1000.0;
  const r_w = f.r_w_m ?? 0.1;
  const skin = f.skin ?? 0.0;

  const ln_term = Math.log(r_e / r_w) + skin;
  const II_SI = (2.0 * Math.PI * k_m2 * f.h_m) / (mu * ln_term);
  const II_m3d_per_MPa = II_SI * SECONDS_PER_DAY * 1e6;

  const pass_flag = II_SI > II_THRESHOLD_SI;

  return {
    criterion: "C9",
    label: "Injectivity Index",
    pass_flag,
    status: pass_flag ? "PASS" : "FAIL",
    value: II_m3d_per_MPa,
    threshold: II_THRESHOLD_SI * SECONDS_PER_DAY * 1e6, // ~86 m3/(day·MPa)
    unit: "m3/(day·MPa)",
    details: {
      II_m3s_per_Pa: II_SI,
      II_m3d_per_MPa,
      threshold_m3s_per_Pa: II_THRESHOLD_SI,
      k_res_mD: f.k_res_mD,
      h_m: f.h_m,
      mu_CO2_Pa_s: mu,
      r_e_m: r_e,
      r_w_m: r_w,
      skin,
    },
  };
}
