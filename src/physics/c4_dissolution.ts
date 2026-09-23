/**
 * C4: Dissolution Trapping / Convective Mixing (Rayleigh Number)
 *
 * Computes the Rayleigh number Ra for convective dissolution:
 *   Ra = (k_v * delta_rho * g * h) / (phi * mu_brine * D)
 *
 * where:
 *   k_v = k_res_mD * kv_kh_ratio (default kv/kh = 0.1 for typical sandstone)
 *   delta_rho = CO2-saturated brine density minus resident brine density (kg/m3)
 *   g = 9.81 m/s2
 *   h = reservoir thickness (m)
 *   phi = porosity (fraction)
 *   mu_brine = brine viscosity (Pa.s)
 *   D = CO2 molecular diffusivity in brine (m2/s)
 *
 * Pass criteria (Ennis-King and Paterson, 2005; Emami-Meybodi et al., 2015):
 *   Ra >= 40   : PASS  (convective mixing active, long-term dissolution trapping assured)
 *   Ra 20-40   : PASS  (onset; marginal but acceptable)
 *   Ra < 20    : FAIL  (diffusion dominated; negligible dissolution trapping)
 *
 * V_DP governance gate:
 *   If V_DP >= 0.5: NSR (Not Suitable for Regulatory screening)
 *   because extreme heterogeneity invalidates the homogeneous Ra assumption.
 *
 * References:
 *   Ennis-King, J. and Paterson, L. (2005). Role of convective mixing in the
 *     long-term storage of CO2 in deep saline formations. SPEJ 10(3), 349-356.
 */

import type { FormationInput, CriterionResult } from "../types.js";

const G = 9.81; // m/s2
const RA_THRESHOLD = 40.0;
const KV_KH_DEFAULT = 0.1;

export function c4DissolutionTrapping(f: FormationInput): CriterionResult {
  const V_DP = f.V_DP ?? 0.45;

  // NSR governance gate: extreme heterogeneity invalidates homogeneous Ra
  if (V_DP >= 0.5) {
    return {
      criterion: "C4",
      label: "Dissolution Trapping (Ra)",
      pass_flag: false,
      status: "NSR",
      details: {
        V_DP,
        reason: "V_DP >= 0.5: extreme heterogeneity invalidates homogeneous Ra assumption",
      },
    };
  }

  const kv_kh = KV_KH_DEFAULT;
  const k_v_m2 = f.k_res_mD * kv_kh * 9.869233e-16; // mD -> m2
  const Ra =
    (k_v_m2 * f.delta_rho_kgm3 * G * f.h_m) /
    (f.phi_res_frac * f.mu_brine_Pa_s * f.D_m);

  const pass_flag = Ra >= RA_THRESHOLD;

  return {
    criterion: "C4",
    label: "Dissolution Trapping (Ra)",
    pass_flag,
    status: pass_flag ? "PASS" : "FAIL",
    value: Ra,
    threshold: RA_THRESHOLD,
    details: {
      Ra_homo: Ra,
      k_v_m2,
      kv_kh,
      delta_rho_kgm3: f.delta_rho_kgm3,
      V_DP,
      threshold: RA_THRESHOLD,
    },
  };
}
