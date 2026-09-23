/**
 * C6: CO2 Phase State - Supercritical Verification
 *
 * Pass: P > 7.38 MPa AND T > 31.1 degC (CO2 critical point)
 *
 * Critical constants from Span and Wagner (1996):
 *   T_crit = 304.13 K = 30.98 degC
 *   P_crit = 7.3773 MPa
 *
 * Reference:
 *   Span, R. and Wagner, W. (1996). J. Phys. Chem. Ref. Data 25(6), 1509-1596.
 */

import type { FormationInput, CriterionResult } from "../types.js";

const T_CRIT_CO2_K = 304.13;
const P_CRIT_CO2_Pa = 7.3773e6;

export function c6SupercriticalPhase(f: FormationInput): CriterionResult {
  const P_crit_MPa = P_CRIT_CO2_Pa / 1e6; // 7.38 MPa
  const T_crit_C = T_CRIT_CO2_K - 273.15; // 30.98 degC

  const supercritical = f.P_MPa > P_crit_MPa && f.T_C > T_crit_C;

  return {
    criterion: "C6",
    label: "Supercritical Phase Conditions",
    pass_flag: supercritical,
    status: supercritical ? "PASS" : "FAIL",
    value: f.P_MPa,
    threshold: P_crit_MPa,
    unit: "MPa",
    details: {
      T_C: f.T_C,
      P_MPa: f.P_MPa,
      T_critical_C: T_crit_C,
      P_critical_MPa: P_crit_MPa,
      supercritical,
    },
  };
}
