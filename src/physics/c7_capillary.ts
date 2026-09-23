/**
 * C7: Capillary Seal Overpressure Margin
 *
 * Evaluates the DYNAMIC worst-case overpressure during active injection
 * (buoyancy head + injection-induced wellbore overpressure) against
 * the Winland capillary entry pressure of the caprock.
 *
 * Distinct from C2 (static column check): C7 evaluates combined
 * buoyancy + injection overpressure. A formation can satisfy C2 and
 * fail C7 if planned injection rate produces wellbore overpressure
 * exceeding the seal capillary margin.
 *
 *   dP_buoy  = (rho_brine - rho_CO2) * g * h_plume  [Pa]
 *   dP_total = dP_buoy + delta_P_inj_Pa
 *   P_entry  = 2 * IFT * cos(theta) / r35_cap_m      [Pa]
 *   margin   = P_entry - dP_total                     [Pa]
 *   Pass: margin > 0
 *
 * r35_cap_m is computed from caprock k and phi via Pittman (1992) unless
 * r35_cap_um is supplied directly.
 *
 * References:
 *   DNV-RP-J203 (2012) §4.4.
 *   Hildenbrand, A. et al. (2002). Geofluids 2(1), 3-23.
 */

import type { FormationInput, CriterionResult } from "../types.js";

const G = 9.80665; // m/s2 (matches Python reference)
const RHO_BRINE_DEFAULT = 1020.0; // kg/m3 (Python default)

export function c7CapillarySeal(f: FormationInput): CriterionResult {
  const rho_brine = f.rho_brine_kgm3 ?? RHO_BRINE_DEFAULT;
  const delta_P_inj_Pa = f.delta_P_inj_Pa ?? 0.0;
  const theta_rad = (f.theta_deg * Math.PI) / 180.0;
  const IFT_Nm = f.IFT_mNm * 1e-3;

  // Buoyancy overpressure
  const dP_buoy_Pa = (rho_brine - f.rho_CO2_kgm3) * G * f.plume_thickness_m;

  // Total dynamic overpressure (buoyancy + injection-induced)
  const dP_total_Pa = dP_buoy_Pa + delta_P_inj_Pa;

  // Caprock r35: use measured value if supplied, otherwise Pittman (1992)
  let r35_cap_m: number;
  let r35_cap_um: number;
  if (f.r35_cap_um !== undefined) {
    r35_cap_um = f.r35_cap_um;
    r35_cap_m = f.r35_cap_um * 1e-6;
  } else {
    const log_r35 =
      0.732 +
      0.588 * Math.log10(f.k_cap_mD) -
      0.864 * Math.log10(f.phi_cap_frac);
    r35_cap_um = Math.pow(10, log_r35);
    r35_cap_m = r35_cap_um * 1e-6;
  }

  const P_entry_Pa = (2.0 * IFT_Nm * Math.cos(theta_rad)) / r35_cap_m;
  const margin_Pa = P_entry_Pa - dP_total_Pa;

  const pass_flag = margin_Pa > 0.0;

  return {
    criterion: "C7",
    label: "Capillary Seal Overpressure Margin",
    pass_flag,
    status: pass_flag ? "PASS" : "FAIL",
    value: margin_Pa / 1e6,
    threshold: 0,
    unit: "MPa margin",
    details: {
      dP_buoy_MPa: dP_buoy_Pa / 1e6,
      delta_P_inj_MPa: delta_P_inj_Pa / 1e6,
      dP_total_MPa: dP_total_Pa / 1e6,
      P_entry_MPa: P_entry_Pa / 1e6,
      margin_MPa: margin_Pa / 1e6,
      r35_cap_um,
      rho_brine_kgm3: rho_brine,
      rho_CO2_kgm3: f.rho_CO2_kgm3,
      plume_thickness_m: f.plume_thickness_m,
    },
  };
}
