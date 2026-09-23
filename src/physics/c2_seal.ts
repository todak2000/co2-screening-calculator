/**
 * C2: Caprock Seal Integrity (Winland r35 pore-throat radius)
 *
 * Uses the Winland (1972) empirical regression on caprock Klinkenberg
 * permeability and porosity to estimate the r35 pore-throat radius,
 * then derives the capillary entry pressure via the Young-Laplace equation.
 *
 * Winland r35 regression (Pittman, 1992):
 *   log10(r35) = 0.732 + 0.588*log10(k_air) - 0.864*log10(phi_percent)
 *   where k_air is in mD and phi is in percent; r35 in micrometres.
 *
 * Capillary entry pressure:
 *   P_entry = 2 * IFT * cos(theta) / r35   [converted to MPa]
 *
 * Seal passes C2 if P_entry >= 3 MPa (standard regulatory minimum).
 *
 * References:
 *   Pittman, E.D. (1992). Relationship of porosity and permeability to various
 *     parameters derived from mercury injection-capillary pressure curves.
 *     AAPG Bulletin 76(2), 191-198.
 */

import type { FormationInput, CriterionResult } from "../types.js";

const SEAL_ENTRY_THRESHOLD_MPa = 3.0; // Minimum acceptable seal entry pressure

export function c2SealIntegrity(f: FormationInput): CriterionResult {
  const k_cap = f.k_cap_mD;
  const phi_pct = f.phi_cap_frac * 100;
  const IFT = f.IFT_mNm;
  const theta_rad = (f.theta_deg * Math.PI) / 180;

  // Winland r35 regression (Pittman 1992)
  const log_r35 =
    0.732 +
    0.588 * Math.log10(k_cap) -
    0.864 * Math.log10(phi_pct);
  const r35_um = Math.pow(10, log_r35);

  // Young-Laplace: P_entry (MPa) = 2 * IFT (mN/m) * cos(theta) / (r35 * 1e3 [nm->um->m])
  // IFT in mN/m = 1e-3 N/m; r35 in um = 1e-6 m
  // P_entry_Pa = 2 * IFT_Nm * cos(theta) / r35_m
  const r35_m = r35_um * 1e-6;
  const IFT_Nm = IFT * 1e-3;
  const P_entry_Pa = (2 * IFT_Nm * Math.cos(theta_rad)) / r35_m;
  const P_entry_MPa = P_entry_Pa / 1e6;

  const pass_flag = P_entry_MPa >= SEAL_ENTRY_THRESHOLD_MPa;

  return {
    criterion: "C2",
    label: "Caprock Seal Integrity",
    pass_flag,
    status: pass_flag ? "PASS" : "FAIL",
    value: P_entry_MPa,
    threshold: SEAL_ENTRY_THRESHOLD_MPa,
    unit: "MPa",
    details: {
      r35_um,
      P_entry_MPa,
      threshold_MPa: SEAL_ENTRY_THRESHOLD_MPa,
      k_cap_mD: k_cap,
      phi_cap_pct: phi_pct,
      IFT_mNm: IFT,
      theta_deg: f.theta_deg,
    },
  };
}
