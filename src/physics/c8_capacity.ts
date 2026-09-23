/**
 * C8: Storage Capacity Estimate
 *
 * Computes the theoretical CO2 storage mass using volumetric method:
 *   M_CO2 = A * h * phi * rho_CO2 * E_vol   [Mt]
 *
 * where E_vol is the volumetric efficiency factor accounting for
 * sweep, heterogeneity, and trapping mechanisms (0.01-0.1 typical).
 *
 * Pass criterion: M_CO2 >= 1 Mt (minimum commercial project scale).
 *
 * Reference:
 *   Gorecki, C.D. et al. (2009). Development of storage coefficients for CO2
 *     storage in deep saline formations. SPE-126444.
 */

import type { FormationInput, CriterionResult } from "../types.js";

const M_CAPACITY_THRESHOLD_MT = 1.0; // Minimum 1 Mt CO2

export function c8StorageCapacity(f: FormationInput): CriterionResult {
  const A_m2 = f.area_km2 * 1e6; // km2 -> m2
  const M_CO2_kg = A_m2 * f.h_m * f.phi_res_frac * f.rho_CO2_kgm3 * f.E_vol;
  const M_CO2_Mt = M_CO2_kg / 1e9; // kg -> Mt

  const pass_flag = M_CO2_Mt >= M_CAPACITY_THRESHOLD_MT;

  return {
    criterion: "C8",
    label: "Storage Capacity",
    pass_flag,
    status: pass_flag ? "PASS" : "FAIL",
    value: M_CO2_Mt,
    threshold: M_CAPACITY_THRESHOLD_MT,
    unit: "Mt CO2",
    details: {
      M_CO2_Mt,
      A_km2: f.area_km2,
      h_m: f.h_m,
      phi_res_frac: f.phi_res_frac,
      rho_CO2_kgm3: f.rho_CO2_kgm3,
      E_vol: f.E_vol,
      threshold_Mt: M_CAPACITY_THRESHOLD_MT,
    },
  };
}
