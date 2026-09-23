/**
 * C4: Dissolution Trapping - Rayleigh-Darcy Number
 *
 *   Ra_homo = (delta_rho * k_v * g * H) / (phi * D_m * mu_brine)
 *   where k_v = k_h * kv_kh_ratio (default 0.1)
 *
 * Pass: Ra_homo > 40 (Ennis-King and Paterson 2005)
 *
 * V_DP governance gate: if V_DP > 0.5, analytical screening is not credible
 * (Pau et al. 2010). Returns NSR (Not Suitable for Regulatory screening)
 * with pass_flag = false. Numerical simulation required.
 *
 * References:
 *   Ennis-King, J. and Paterson, L. (2005). SPEJ 10(3), 349-356.
 *   Pau et al. (2010). J. Comput. Phys. 229.
 *   DNV-RP-J203 (2012) §5.2.
 */

import type { FormationInput, CriterionResult } from "../types.js";

const G = 9.81;
const RA_CRIT = 40.0;

export function c4DissolutionTrapping(f: FormationInput): CriterionResult {
  const V_DP = f.V_DP ?? 0.0;
  const kv_kh = f.kv_kh_ratio ?? 0.1;

  const k_h_m2 = f.k_res_mD * 9.869e-16;
  const k_v_m2 = k_h_m2 * kv_kh;
  const Ra_homo =
    (f.delta_rho_kgm3 * k_v_m2 * G * f.h_m) /
    (f.phi_res_frac * f.D_m * f.mu_brine_Pa_s);

  // V_DP > 0.5: NSR gate (cannot credit dissolution trapping analytically)
  if (V_DP > 0.5) {
    return {
      criterion: "C4",
      label: "Dissolution Trapping (Ra)",
      pass_flag: false,
      status: "NSR",
      value: Ra_homo,
      note:
        "C4 analytical screening not credible for V_DP > 0.5. " +
        "Ra_homo is an upper bound only. Numerical simulation required " +
        "(Pau et al. 2010; DNV-RP-J203 §5.2).",
      details: {
        Ra_homo,
        V_DP,
        k_v_m2,
        kv_kh,
        sim_required: true,
      },
    };
  }

  const pass_flag = Ra_homo > RA_CRIT;

  return {
    criterion: "C4",
    label: "Dissolution Trapping (Ra)",
    pass_flag,
    status: pass_flag ? "PASS" : "FAIL",
    value: Ra_homo,
    threshold: RA_CRIT,
    details: {
      Ra_homo,
      k_v_m2,
      kv_kh,
      delta_rho_kgm3: f.delta_rho_kgm3,
      V_DP,
    },
  };
}
