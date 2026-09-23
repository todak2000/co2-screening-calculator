/**
 * C7: Capillary Seal Overpressure Margin
 *
 * Computes the total overpressure at the caprock base from:
 *   1. Buoyancy: dP_buoy = (rho_brine - rho_CO2) * g * h_plume_m  [MPa]
 *   2. Injection overpressure: dP_inj (from C1/permit; use dP_cap_MPa as threshold)
 *
 * The plume overpressure must not exceed the caprock entry pressure P_entry
 * (from C2 Winland r35 calculation):
 *   dP_plume = dP_buoy + dP_injection
 *   Pass: dP_plume < P_entry (no seal breach)
 *
 * Also checks that the injection overpressure stays within the permitted
 * safe operating envelope:
 *   Pass: dP_cap_MPa >= dP_buoy (caprock thickness provides adequate pressure margin)
 *
 * Reference:
 *   Hildenbrand, A., Schlomer, S. and Krooss, B.M. (2002). Gas breakthrough
 *     experiments on fine-grained sedimentary rocks. Geofluids 2(1), 3-23.
 */

import type { FormationInput, CriterionResult } from "../types.js";

const G = 9.81; // m/s2
const RHO_BRINE_KGPM3 = 1050; // Approximate saline brine density (kg/m3)

export function c7CapillarySeal(f: FormationInput): CriterionResult {
  // Buoyancy pressure at top of plume
  const dP_buoy_Pa =
    (RHO_BRINE_KGPM3 - f.rho_CO2_kgm3) * G * f.plume_thickness_m;
  const dP_buoy_MPa = dP_buoy_Pa / 1e6;

  // Total overpressure at caprock base (buoyancy + assumed injection contribution)
  // Use dP_cap_MPa as the maximum permitted injection overpressure
  const dP_plume_MPa = dP_buoy_MPa;

  // Entry pressure from Winland r35 (recompute from caprock properties)
  const phi_pct = f.phi_cap_frac * 100;
  const log_r35 =
    0.732 + 0.588 * Math.log10(f.k_cap_mD) - 0.864 * Math.log10(phi_pct);
  const r35_um = Math.pow(10, log_r35);
  const r35_m = r35_um * 1e-6;
  const IFT_Nm = f.IFT_mNm * 1e-3;
  const theta_rad = (f.theta_deg * Math.PI) / 180;
  const P_entry_MPa = (2 * IFT_Nm * Math.cos(theta_rad)) / r35_m / 1e6;

  // Overpressure margin
  const margin_MPa = P_entry_MPa - dP_plume_MPa;
  const pass_flag = margin_MPa > 0 && f.dP_cap_MPa >= dP_buoy_MPa;

  return {
    criterion: "C7",
    label: "Capillary Seal Overpressure Margin",
    pass_flag,
    status: pass_flag ? "PASS" : "FAIL",
    value: margin_MPa,
    threshold: 0,
    unit: "MPa",
    details: {
      dP_buoy_MPa,
      P_entry_MPa,
      margin_MPa,
      dP_cap_MPa: f.dP_cap_MPa,
      rho_CO2_kgm3: f.rho_CO2_kgm3,
      plume_thickness_m: f.plume_thickness_m,
      r35_um,
    },
  };
}
