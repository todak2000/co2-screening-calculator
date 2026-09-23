/**
 * C5: Minimum Injection Rate Viability
 *
 * Converts the volumetric injection rate to mass injection rate and
 * checks against the minimum economically viable injection threshold
 * for a commercial CCS project (0.1 Mt CO2/year).
 *
 * Q_min_Mtpa = Q_m3s * rho_CO2_kgm3 * seconds_per_year / 1e9  [Mt/year]
 *
 * Pass criterion: Q_min_Mtpa >= 0.1 Mt/year (regulatory/economic minimum)
 */

import type { FormationInput, CriterionResult } from "../types.js";

const SECONDS_PER_YEAR = 3.1536e7;
const Q_MIN_THRESHOLD_MTPA = 0.1;

export function c5MinInjectionRate(f: FormationInput): CriterionResult {
  const Q_min_Mtpa =
    (f.Q_m3s * f.rho_CO2_kgm3 * SECONDS_PER_YEAR) / 1e9;

  const pass_flag = Q_min_Mtpa >= Q_MIN_THRESHOLD_MTPA;

  return {
    criterion: "C5",
    label: "Minimum Injection Rate",
    pass_flag,
    status: pass_flag ? "PASS" : "FAIL",
    value: Q_min_Mtpa,
    threshold: Q_MIN_THRESHOLD_MTPA,
    unit: "Mt/year",
    details: {
      Q_m3s: f.Q_m3s,
      rho_CO2_kgm3: f.rho_CO2_kgm3,
      Q_min_Mtpa,
      threshold_Mtpa: Q_MIN_THRESHOLD_MTPA,
    },
  };
}
