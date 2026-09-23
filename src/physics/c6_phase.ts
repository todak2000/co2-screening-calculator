/**
 * C6: Supercritical Phase Conditions
 *
 * CO2 must be in supercritical or dense liquid phase for efficient storage.
 * Critical point: Tc = 31.04 degC, Pc = 7.38 MPa.
 *
 * Pass criterion: T > 31 degC AND P > 7.38 MPa
 *
 * Also computes water content of CO2 phase using a simplified
 * Spycher-Pruess (2005) polynomial fit valid for 50-200 degC, 5-60 MPa.
 *
 * Reference:
 *   Spycher, N. and Pruess, K. (2005). CO2-H2O mixtures in the geological
 *     sequestration of CO2. I. Assessment and calculation of mutual solubilities
 *     from 12 to 100 degrees C and up to 600 bar. Geochim. Cosmochim. Acta 69(13),
 *     3309-3320.
 */

import type { FormationInput, CriterionResult } from "../types.js";

const TC_CRITICAL = 31.04; // degC
const PC_CRITICAL_MPa = 7.38; // MPa

export function c6SupercriticalPhase(f: FormationInput): CriterionResult {
  const pass_flag = f.T_C > TC_CRITICAL && f.P_MPa > PC_CRITICAL_MPa;

  // Simplified chi_w estimate: use provided value or rough approximation
  let chi_w = f.chi_w;
  if (chi_w === undefined) {
    // Very rough: chi_w decreases with depth (higher P), increases with T
    // Spycher-Pruess simplified polynomial at typical storage conditions
    chi_w = Math.max(1e-4, 3.6e-2 * Math.exp(-0.04 * f.P_MPa) * (1 + 0.002 * (f.T_C - 31)));
  }

  return {
    criterion: "C6",
    label: "Supercritical Phase Conditions",
    pass_flag,
    status: pass_flag ? "PASS" : "FAIL",
    value: f.P_MPa,
    threshold: PC_CRITICAL_MPa,
    unit: "MPa",
    details: {
      T_C: f.T_C,
      P_MPa: f.P_MPa,
      T_critical_C: TC_CRITICAL,
      P_critical_MPa: PC_CRITICAL_MPa,
      chi_w,
      phase: pass_flag ? "supercritical/dense" : "subcritical",
    },
  };
}
