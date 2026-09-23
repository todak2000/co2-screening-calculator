/**
 * C2: Caprock Seal Integrity (Winland r35 pore-throat radius)
 *
 * Pittman (1992) regression for siliciclastics:
 *   log10(r35) = 0.732 + 0.588*log10(k_mD) - 0.864*log10(phi_frac)
 *   r35 in micrometres; k in mD; phi in fraction
 *
 * Capillary entry pressure:
 *   P_entry = 2 * IFT * cos(theta) / r35_m   [Pa -> MPa]
 *
 * Pass criterion: P_entry >= 1.0 MPa (DNV-RP-J203 §4)
 *
 * Carbonate caprocks: Pittman/Kolodzie regressions are calibrated on sandstone
 * only. If caprock_lithology = "carbonate" and no r35_cap_um is supplied,
 * returns FAIL with "MICP Required" note (DNV-RP-J203 §4).
 *
 * References:
 *   Pittman, E.D. (1992). AAPG Bulletin 76(2), 191-198.
 *   DNV-RP-J203 (2012) Geological Storage of Carbon Dioxide, §4.
 */

import type { FormationInput, CriterionResult } from "../types.js";

const P_ENTRY_THRESHOLD_MPa = 1.0; // DNV-RP-J203 §4

export function c2SealIntegrity(f: FormationInput): CriterionResult {
  const lithology = f.caprock_lithology ?? "sandstone";

  // Carbonate caprocks require MICP data (DNV-RP-J203 §4)
  if (lithology === "carbonate" && f.r35_cap_um === undefined) {
    return {
      criterion: "C2",
      label: "Caprock Seal Integrity",
      pass_flag: false,
      status: "FAIL",
      note: "MICP Required: Pittman r35 regression calibrated on sandstone only. " +
            "Supply measured r35_cap_um from MICP for carbonate caprock (DNV-RP-J203 §4).",
      details: {
        lithology,
        k_cap_mD: f.k_cap_mD,
        phi_cap_frac: f.phi_cap_frac,
      },
    };
  }

  const theta_rad = (f.theta_deg * Math.PI) / 180.0;
  const IFT_Nm = f.IFT_mNm * 1e-3;

  // Use measured r35 if supplied; otherwise Pittman (1992) regression
  let r35_um: number;
  let note: string | undefined;
  if (f.r35_cap_um !== undefined) {
    r35_um = f.r35_cap_um;
  } else {
    if (f.k_cap_mD <= 0 || f.phi_cap_frac <= 0) {
      return {
        criterion: "C2",
        label: "Caprock Seal Integrity",
        pass_flag: false,
        status: "FAIL",
        note: "Invalid input: k_cap_mD and phi_cap_frac must be positive.",
        details: {},
      };
    }
    const log_r35 =
      0.732 +
      0.588 * Math.log10(f.k_cap_mD) -
      0.864 * Math.log10(f.phi_cap_frac);
    r35_um = Math.pow(10, log_r35);
    if (lithology !== "sandstone") {
      note = `Warning: Pittman r35 regression applied to '${lithology}' lithology. ` +
             `Regression calibrated on sandstone; result may be unreliable.`;
    }
  }

  const r35_m = r35_um * 1e-6;
  const P_entry_Pa = (2.0 * IFT_Nm * Math.cos(theta_rad)) / r35_m;
  const P_entry_MPa = P_entry_Pa / 1e6;

  const pass_flag = P_entry_MPa >= P_ENTRY_THRESHOLD_MPa;

  const result: CriterionResult = {
    criterion: "C2",
    label: "Caprock Seal Integrity",
    pass_flag,
    status: pass_flag ? "PASS" : "FAIL",
    value: P_entry_MPa,
    threshold: P_ENTRY_THRESHOLD_MPa,
    unit: "MPa",
    details: {
      r35_um,
      P_entry_MPa,
      threshold_MPa: P_ENTRY_THRESHOLD_MPa,
      IFT_mNm: f.IFT_mNm,
      theta_deg: f.theta_deg,
      k_cap_mD: f.k_cap_mD,
      phi_cap_frac: f.phi_cap_frac,
      lithology,
    },
  };
  if (note) result.note = note;
  return result;
}
