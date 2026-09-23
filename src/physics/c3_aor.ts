/**
 * C3: Area of Review (AoR) - Dual-radius
 *
 * 1. Theis characteristic diffusion length (conservative upper bound):
 *      r_pf = sqrt(4 * eta * t)  where eta = k / (phi * mu_brine * ct)
 *    NOTE: mu_brine is used (not mu_CO2) because the pressure front propagates
 *    through brine-saturated rock ahead of the CO2 plume.
 *
 * 2. CO2 plume radius:
 *      r_plume = sqrt(Q * t / (pi * h * phi * S_CO2))   S_CO2 default 0.65
 *
 * 3. Cooper-Jacob regulatory AoR inversion at dP_crit threshold:
 *      W_crit = dP_crit * 4*pi*k*h / (Q * mu_brine)
 *      r_AoR_crit = sqrt(2.25 * eta * t / exp(W_crit))
 *    With overflow guard: if W_crit >= 700 or wellbore dP < dP_crit, r_AoR_crit = 0.
 *
 * 4. r_AoR = max(r_AoR_crit, r_plume)
 *
 * Pass: r_AoR < r_permitted_m  (EPA 40 CFR 146.84(a)(1))
 * If r_permitted_m not supplied, C3 is informational (no pass/fail verdict).
 *
 * References:
 *   Cooper and Jacob (1946) Trans. AGU 27(4), 526-534.
 *   EPA 40 CFR 146.84(a)(1).
 */

import type { FormationInput, CriterionResult } from "../types.js";

const R_W_GUARD = 0.1; // wellbore radius for guard check [m]

export function c3AreaOfReview(f: FormationInput): CriterionResult {
  const k_m2 = f.k_res_mD * 9.869e-16;
  const S_CO2 = f.S_CO2 ?? 0.65;
  const dP_crit_Pa = f.dP_crit_Pa ?? 1e5;

  // Hydraulic diffusivity using BRINE viscosity (pressure front in brine)
  const eta = k_m2 / (f.phi_res_frac * f.mu_brine_Pa_s * f.ct_Pa);

  // 1. Theis diffusion length [m]
  const r_pf_m = Math.sqrt(4.0 * eta * f.t_s);

  // 2. CO2 plume radius [m]
  const r_plume_m = Math.sqrt(
    (f.Q_m3s * f.t_s) / (Math.PI * f.h_m * f.phi_res_frac * S_CO2)
  );

  // 3. Cooper-Jacob AoR inversion
  const W_crit =
    (dP_crit_Pa * 4.0 * Math.PI * k_m2 * f.h_m) /
    Math.max(f.Q_m3s * f.mu_brine_Pa_s, 1e-30);

  // Wellbore pressure guard check
  const ln_arg = (2.25 * eta * f.t_s) / (R_W_GUARD * R_W_GUARD);
  const dP_well_Pa =
    ln_arg > 1.0
      ? ((f.Q_m3s * f.mu_brine_Pa_s) / (4.0 * Math.PI * k_m2 * f.h_m)) *
        Math.log(ln_arg)
      : 0.0;

  let r_AoR_crit_m: number;
  if (dP_well_Pa < dP_crit_Pa) {
    // Pressure nowhere reaches dP_crit; AoR is plume-governed
    r_AoR_crit_m = 0.0;
  } else if (W_crit < 700.0) {
    r_AoR_crit_m = Math.sqrt((2.25 * eta * f.t_s) / Math.exp(W_crit));
  } else {
    // W_crit >= 700: exp() overflow; high transmissivity, pressure decays below dP_crit
    r_AoR_crit_m = 0.0;
  }

  const r_AoR_m = Math.max(r_AoR_crit_m, r_plume_m);

  // Pass/fail only when regulatory boundary is supplied
  let pass_flag: boolean;
  let status: "PASS" | "FAIL" | "NSR" | "N/A";
  let note: string | undefined;
  if (f.r_permitted_m !== undefined) {
    pass_flag = r_AoR_m < f.r_permitted_m;
    status = pass_flag ? "PASS" : "FAIL";
  } else {
    pass_flag = true;
    status = "PASS";
    note = "AoR informational: supply r_permitted_m to enable regulatory pass/fail (EPA 40 CFR 146.84).";
  }

  const result: CriterionResult = {
    criterion: "C3",
    label: "Area of Review",
    pass_flag,
    status,
    value: r_AoR_m,
    unit: "m",
    details: {
      r_pf_m,
      r_plume_m,
      r_AoR_crit_m,
      r_AoR_m,
      r_permitted_m: f.r_permitted_m ?? 0,
      eta_m2s: eta,
      S_CO2,
      dP_crit_Pa,
    },
  };
  if (note) result.note = note;
  return result;
}
