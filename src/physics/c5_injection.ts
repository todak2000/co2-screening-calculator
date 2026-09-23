/**
 * C5: Halite Precipitation Risk - Zeidouni (2009) Minimum Injection Rate
 *
 * Uses Zeidouni, Pooladi-Darvish and Keith (2009) Eq. 26 mass balance:
 *   Q_min = pi * h * phi * S_wi * rho_brine * r_crit^2
 *           / (rho_co2 * chi_w * t_permit)
 *
 * Pass: Q_inj > Q_min (injection rate sufficient to prevent near-wellbore
 *        brine evaporation and halite precipitation)
 *
 * Parameters:
 *   S_wi      irreducible water saturation; default 0.20 (Zeidouni 2009 Table 2)
 *   rho_brine brine density kg/m3; default 1050
 *   r_crit_m  critical drying radius m; default 1.0 (Zeidouni 2009)
 *   chi_w     water mass fraction in CO2 phase (required)
 *   t_permit_s permit injection duration s; default 30 yr = 9.467e8 s
 *
 * Reference:
 *   Zeidouni, M., Pooladi-Darvish, M. and Keith, D. (2009).
 *   Int. J. Greenhouse Gas Control 3(5), 600-611.
 */

import type { FormationInput, CriterionResult } from "../types.js";

const SECONDS_PER_YEAR = 3.1536e7;
const T_PERMIT_DEFAULT_S = 30 * SECONDS_PER_YEAR; // 30 yr = 9.467e8 s

export function c5HalitePrecipitation(f: FormationInput): CriterionResult {
  // chi_w required for Zeidouni equation
  if (f.chi_w === undefined || f.chi_w <= 0) {
    return {
      criterion: "C5",
      label: "Halite Precipitation Risk",
      pass_flag: false,
      status: "FAIL",
      note: "chi_w (water mass fraction in CO2 phase) is required for C5. " +
            "Use Spycher-Pruess (2005) at reservoir T and P.",
      details: { chi_w: f.chi_w ?? 0 },
    };
  }

  const h = f.h_m;
  const phi = f.phi_res_frac;
  const S_wi = f.S_wi ?? 0.20;
  const rho_brine = f.rho_brine_kgm3 ?? 1050.0;
  const r_crit = f.r_crit_m ?? 1.0;
  const rho_co2 = f.rho_CO2_kgm3;
  const chi_w = f.chi_w;
  const t_permit = f.t_permit_s ?? T_PERMIT_DEFAULT_S;

  // Zeidouni (2009) Eq. 26
  const Q_min_m3s =
    (Math.PI * h * phi * S_wi * rho_brine * r_crit * r_crit) /
    (rho_co2 * chi_w * t_permit);
  const Q_min_Mtpa = (Q_min_m3s * rho_co2 * SECONDS_PER_YEAR) / 1e9;

  const pass_flag = f.Q_m3s > Q_min_m3s;

  return {
    criterion: "C5",
    label: "Halite Precipitation Risk",
    pass_flag,
    status: pass_flag ? "PASS" : "FAIL",
    value: Q_min_Mtpa,
    unit: "Mt/year (Q_min)",
    details: {
      Q_min_m3s,
      Q_min_Mtpa,
      Q_inj_m3s: f.Q_m3s,
      chi_w,
      S_wi,
      r_crit_m: r_crit,
      rho_brine_kgm3: rho_brine,
      t_permit_s: t_permit,
    },
  };
}
