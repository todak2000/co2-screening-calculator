/**
 * C9: Injectivity Index
 *
 * Computes the radial-flow injectivity index (II) using the steady-state
 * Darcy equation for a vertical well:
 *   II = (2 * pi * k * h) / (mu * ln(r_e / r_w))
 *
 * Units: m3/(day·MPa) after conversion
 *   k in m2, h in m, mu in Pa.s, r_e/r_w dimensionless
 *
 * Default: r_e = 500 m (drainage radius), r_w = 0.15 m (wellbore radius)
 * Pass criterion: II >= 10 m3/(day·MPa) (minimum for commercial injection)
 *
 * Reference:
 *   Bachu, S. (2003). Screening and ranking of sedimentary basins for sequestration
 *     of CO2 in geological media in response to climate change. Environmental Geology
 *     44(3), 277-289.
 */

import type { FormationInput, CriterionResult } from "../types.js";

const II_THRESHOLD = 10.0; // m3/(day·MPa)
const R_E = 500;           // m (drainage radius)
const R_W = 0.15;          // m (wellbore radius)
const SECONDS_PER_DAY = 86400;

export function c9Injectivity(f: FormationInput): CriterionResult {
  const k_m2 = f.k_res_mD * 9.869233e-16;
  // Use mu_CO2 if provided, otherwise fall back to a default
  const mu = (f.mu_CO2 ?? 6.5e-5); // Pa.s

  // II in m3/(s·Pa) then convert to m3/(day·MPa)
  const II_SI = (2 * Math.PI * k_m2 * f.h_m) / (mu * Math.log(R_E / R_W));
  const II_m3d_per_MPa = II_SI * SECONDS_PER_DAY * 1e6; // Pa -> MPa; s -> day

  const pass_flag = II_m3d_per_MPa >= II_THRESHOLD;

  return {
    criterion: "C9",
    label: "Injectivity Index",
    pass_flag,
    status: pass_flag ? "PASS" : "FAIL",
    value: II_m3d_per_MPa,
    threshold: II_THRESHOLD,
    unit: "m3/(day·MPa)",
    details: {
      II_m3d_per_MPa,
      k_res_mD: f.k_res_mD,
      h_m: f.h_m,
      mu_CO2_Pa_s: mu,
      r_e_m: R_E,
      r_w_m: R_W,
      threshold: II_THRESHOLD,
    },
  };
}
