/**
 * C8: Storage Capacity Estimate
 *
 *   M_CO2 = area_km2 * 1e6 * h_m * phi * rho_CO2 * E_vol   [kg -> Mt]
 *
 * Pass: M_CO2 > V_target_Mt (user-supplied storage target)
 * If V_target_Mt not supplied, C8 is informational (no pass/fail verdict).
 *
 * E_vol default 0.03 (3%, USDOE Atlas 2012 midpoint for open saline aquifers).
 *
 * References:
 *   USDOE National Carbon Sequestration Atlas (2012).
 *   Bachu et al. (2007). Int. J. Greenhouse Gas Control 1(4).
 */

import type { FormationInput, CriterionResult } from "../types.js";

export function c8StorageCapacity(f: FormationInput): CriterionResult {
  const area_m2 = f.area_km2 * 1e6;
  const V_pore_m3 = area_m2 * f.h_m * f.phi_res_frac;
  const M_CO2_kg = V_pore_m3 * f.rho_CO2_kgm3 * f.E_vol;
  const M_CO2_Mt = M_CO2_kg / 1e9;

  let pass_flag: boolean;
  let status: "PASS" | "FAIL" | "NSR" | "N/A";
  let note: string | undefined;
  if (f.V_target_Mt !== undefined) {
    pass_flag = M_CO2_Mt > f.V_target_Mt;
    status = pass_flag ? "PASS" : "FAIL";
  } else {
    pass_flag = true;
    status = "PASS";
    note = "C8 informational: supply V_target_Mt to enable pass/fail against storage target.";
  }

  const result: CriterionResult = {
    criterion: "C8",
    label: "Storage Capacity",
    pass_flag,
    status,
    value: M_CO2_Mt,
    threshold: f.V_target_Mt,
    unit: "Mt CO2",
    details: {
      M_CO2_Mt,
      V_pore_m3,
      area_km2: f.area_km2,
      h_m: f.h_m,
      phi_res_frac: f.phi_res_frac,
      rho_CO2_kgm3: f.rho_CO2_kgm3,
      E_vol: f.E_vol,
    },
  };
  if (note) result.note = note;
  if (f.V_target_Mt !== undefined) result.threshold = f.V_target_Mt;
  return result;
}
