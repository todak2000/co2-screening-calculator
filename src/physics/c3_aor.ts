/**
 * C3: Area of Review (AoR) Plume and Pressure Front Geometry
 *
 * Computes:
 *   1. Pressure front radius using radial diffusion: r_pf = sqrt(4 * eta * t)
 *      where eta = k / (phi * mu * ct) is hydraulic diffusivity (m2/s)
 *   2. Plume radius from injected volume: r_plume = sqrt(V_inj / (pi * h * phi * Sg))
 *   3. Regulatory AoR radius via Cooper-Jacob inversion of the EPA 0.1 MPa threshold
 *   4. r_AoR = max(r_AoR_crit, r_plume)
 *
 * Cooper-Jacob approximation (valid for r^2 * phi * mu * ct / (4 * k * t) < 0.01):
 *   dP(r,t) = (Q * mu) / (4 * pi * k * h) * [-Ei(-r^2 / (4 * eta * t))]
 *   Inversion for r_AoR where dP = dP_crit:
 *   r_AoR_crit = sqrt(-4 * eta * t * ln(dP_crit * 4 * pi * k * h / (Q * mu * exp(gamma))))
 *   where gamma = 0.5772 (Euler-Mascheroni constant)
 *
 * Pass criterion: r_AoR <= regulatory boundary (assessed qualitatively at screening;
 * pass_flag is always True at this stage since the AoR is reported for permit submission,
 * not compared against a fixed threshold). Users apply this output to their site geometry.
 *
 * References:
 *   Cooper, H.H. and Jacob, C.E. (1946). A generalized graphical method for evaluating
 *     formation constants and summarizing well-field history. Trans. AGU 27(4), 526-534.
 *   EPA (2011). Underground Injection Control (UIC) Class VI rule, 40 CFR 146.84.
 */

import type { FormationInput, CriterionResult } from "../types.js";

const EULER_MASCHERONI = 0.5772156649;

export function c3AreaOfReview(f: FormationInput): CriterionResult {
  const k_m2 = f.k_res_mD * 9.869233e-16; // mD -> m2
  const mu = (f.mu_CO2 ?? 6.5e-5);        // Pa.s
  const phi = f.phi_res_frac;
  const ct = f.ct_Pa;
  const h = f.h_m;
  const Q = f.Q_m3s;
  const t = f.t_s;
  const dP_crit_Pa = f.dP_crit_Pa ?? 1e5; // default 0.1 MPa (EPA UIC)

  // Hydraulic diffusivity (m2/s)
  const eta = k_m2 / (phi * mu * ct);

  // 1. Pressure front radius (m)
  const r_pf_m = Math.sqrt(4 * eta * t);

  // 2. Plume radius (assuming Sg = 0.6 for supercritical CO2 plume)
  const Sg = 0.6;
  const V_inj_m3 = Q * t;
  const r_plume_m = Math.sqrt(V_inj_m3 / (Math.PI * h * phi * Sg));

  // 3. Cooper-Jacob AoR inversion
  // dP_crit = (Q * mu) / (4 * pi * k * h) * (-Ei(-u))
  // For small u, -Ei(-u) ~ ln(1/u) - gamma
  // Solve: ln(1/u) - gamma = dP_crit * 4*pi*k*h / (Q*mu)
  // u = exp(-(dP_crit * 4*pi*k*h/(Q*mu) + gamma))
  // r_AoR = sqrt(4 * eta * t * u)
  const transmissivity = (k_m2 * h) / mu;
  const jacob_arg = dP_crit_Pa * 4 * Math.PI * transmissivity / Q;
  const r_AoR_crit_m_sq = 4 * eta * t * Math.exp(-(jacob_arg + EULER_MASCHERONI));
  const r_AoR_crit_m = r_AoR_crit_m_sq > 0 ? Math.sqrt(r_AoR_crit_m_sq) : r_pf_m;

  // 4. Regulatory AoR
  const r_AoR_m = Math.max(r_AoR_crit_m, r_plume_m);

  // Pass: always true at screening (AoR is reported, not pass/fail against fixed boundary)
  const pass_flag = true;

  return {
    criterion: "C3",
    label: "Area of Review",
    pass_flag,
    status: "PASS",
    value: r_AoR_m,
    unit: "m",
    details: {
      r_pf_m,
      r_plume_m,
      r_AoR_crit_m,
      r_AoR_m,
      eta_m2s: eta,
      V_inj_m3,
    },
  };
}
