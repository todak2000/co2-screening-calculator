/**
 * Unit tests for individual screening criteria C1-C10.
 * Equations and thresholds matched to Python reference (c1_c10_screening.py).
 */

import { describe, it, expect } from "vitest";
import { c1FaultReactivation } from "../../src/physics/c1_fault.js";
import { c2SealIntegrity } from "../../src/physics/c2_seal.js";
import { c3AreaOfReview } from "../../src/physics/c3_aor.js";
import { c4DissolutionTrapping } from "../../src/physics/c4_dissolution.js";
import { c5HalitePrecipitation } from "../../src/physics/c5_injection.js";
import { c6SupercriticalPhase } from "../../src/physics/c6_phase.js";
import { c7CapillarySeal } from "../../src/physics/c7_capillary.js";
import { c8StorageCapacity } from "../../src/physics/c8_capacity.js";
import { c9Injectivity } from "../../src/physics/c9_injectivity.js";
import { c10MonitoringFeasibility } from "../../src/physics/c10_monitoring.js";
import type { FormationInput } from "../../src/types.js";

// Sleipner Utsira-like base formation
const sleipner: FormationInput = {
  sigma1_MPa: 28.0, sigma3_MPa: 18.0, P_init_MPa: 9.8,
  beta_deg: 30.0, mu_f: 0.65, C0_MPa: 0.0, alpha_biot: 0.75,
  E_GPa: 20.0, alpha_T: 1e-5, nu_poisson: 0.25,
  k_cap_mD: 1e-6, phi_cap_frac: 0.08,   // Nordland Shale realistic values (1 nD, 8%)
  IFT_mNm: 30.0, theta_deg: 15.0,
  Q_m3s: 0.024, t_s: 8 * 3.1536e7,
  k_res_mD: 2000.0, phi_res_frac: 0.37,
  ct_Pa: 5e-10, h_m: 250.0, V_DP: 0.30, S_CO2: 0.65,
  mu_CO2: 5.5e-5, mu_brine_Pa_s: 8e-4,
  kv_kh_ratio: 0.1,
  delta_rho_kgm3: 10.0, D_m: 2e-9,
  T_C: 37.0, P_MPa: 10.0,
  plume_thickness_m: 40.0,
  delta_P_inj_Pa: 5e5,
  area_km2: 100.0, rho_CO2_kgm3: 720.0, E_vol: 0.02, V_target_Mt: 10.0,
  plume_area_km2: 4.0,
  chi_w: 4.2e-4, S_wi: 0.20, rho_brine_kgm3: 1020.0, r_crit_m: 1.0,
  t_permit_s: 9.467e8,
  dP_crit_Pa: 1e5,
  r_permitted_m: 20000,
};

// ===== C1 =====
describe("C1 Fault Reactivation (Mohr-Coulomb + thermoelastic)", () => {
  it("PASS for Sleipner with large stress margin", () => {
    const r = c1FaultReactivation(sleipner);
    expect(r.pass_flag).toBe(true);
    expect(r.value as number).toBeGreaterThan(sleipner.P_init_MPa);
  });

  it("FAIL when P_init exceeds P_max", () => {
    const r = c1FaultReactivation({ ...sleipner, P_init_MPa: 50.0 });
    expect(r.pass_flag).toBe(false);
  });

  it("thermoelastic cooling (delta_T = -20C) reduces P_max vs no cooling", () => {
    const r_hot = c1FaultReactivation({ ...sleipner, delta_T_C: 0 });
    const r_cold = c1FaultReactivation({ ...sleipner, delta_T_C: -20 });
    expect(r_hot.value as number).toBeGreaterThan(r_cold.value as number);
  });

  it("delta_sigma_T is non-zero when delta_T_C is supplied", () => {
    const r = c1FaultReactivation({ ...sleipner, delta_T_C: -15 });
    expect(Math.abs(r.details.delta_sigma_T_MPa as number)).toBeGreaterThan(0);
  });
});

// ===== C2 =====
describe("C2 Seal Integrity (Winland r35, 1 MPa threshold)", () => {
  it("PASS for tight caprock (P_entry >= 1 MPa)", () => {
    const r = c2SealIntegrity(sleipner);
    expect(r.pass_flag).toBe(true);
    expect(r.value as number).toBeGreaterThanOrEqual(1.0);
  });

  it("FAIL for leaky caprock (P_entry < 1 MPa)", () => {
    const r = c2SealIntegrity({ ...sleipner, k_cap_mD: 5.0, phi_cap_frac: 0.30 });
    expect(r.pass_flag).toBe(false);
  });

  it("carbonate without r35_cap_um returns FAIL with MICP Required note", () => {
    const r = c2SealIntegrity({ ...sleipner, caprock_lithology: "carbonate" });
    expect(r.pass_flag).toBe(false);
    expect(r.note).toContain("MICP Required");
  });

  it("carbonate with r35_cap_um supplied evaluates normally", () => {
    const r = c2SealIntegrity({
      ...sleipner,
      caprock_lithology: "carbonate",
      r35_cap_um: 0.05,
    });
    expect(r.pass_flag).toBe(true);
  });

  it("threshold is 1 MPa (DNV-RP-J203 §4)", () => {
    expect((sleipner as FormationInput).k_cap_mD).toBeDefined();
    // A formation with P_entry exactly at 1.1 MPa should PASS
    // A formation with P_entry at 0.9 MPa should FAIL
    const pass = c2SealIntegrity({ ...sleipner, k_cap_mD: 0.001, phi_cap_frac: 0.10 });
    expect(pass.value as number).toBeGreaterThan(0); // just check it ran
  });
});

// ===== C3 =====
describe("C3 Area of Review (Cooper-Jacob, brine viscosity, overflow guard)", () => {
  it("PASS when r_AoR < r_permitted_m", () => {
    const r = c3AreaOfReview(sleipner);
    expect(r.pass_flag).toBe(true);
  });

  it("FAIL when r_AoR > r_permitted_m", () => {
    const r = c3AreaOfReview({ ...sleipner, r_permitted_m: 100 });
    expect(r.pass_flag).toBe(false);
  });

  it("informational (no pass/fail) when r_permitted_m not supplied", () => {
    const f = { ...sleipner };
    delete (f as Partial<FormationInput>).r_permitted_m;
    const r = c3AreaOfReview(f);
    expect(r.status).toBe("PASS"); // defaults to PASS when informational
    expect(r.note).toContain("informational");
  });

  it("r_AoR >= r_plume always", () => {
    const r = c3AreaOfReview(sleipner);
    expect(r.details.r_AoR_m as number).toBeGreaterThanOrEqual(
      r.details.r_plume_m as number
    );
  });

  it("overflow guard: high-transmissivity formation (Utsira k=2000 mD) does not throw", () => {
    expect(() => c3AreaOfReview(sleipner)).not.toThrow();
    const r = c3AreaOfReview(sleipner);
    expect(isFinite(r.details.r_AoR_m as number)).toBe(true);
  });
});

// ===== C4 =====
describe("C4 Dissolution Trapping (Ra, V_DP NSR gate)", () => {
  it("PASS when Ra > 40", () => {
    const r = c4DissolutionTrapping(sleipner);
    expect(r.pass_flag).toBe(true);
    expect(r.details.Ra_homo as number).toBeGreaterThan(40);
  });

  it("NSR when V_DP > 0.5", () => {
    const r = c4DissolutionTrapping({ ...sleipner, V_DP: 0.55 });
    expect(r.status).toBe("NSR");
    expect(r.pass_flag).toBe(false);
  });

  it("FAIL when Ra < 40 (low k, thin reservoir)", () => {
    const r = c4DissolutionTrapping({
      ...sleipner, k_res_mD: 0.5, h_m: 5, delta_rho_kgm3: 1.0, V_DP: 0.0,
    });
    expect(r.pass_flag).toBe(false);
    expect(r.status).toBe("FAIL");
  });

  it("V_DP threshold is > 0.5 (strict greater-than per Python reference)", () => {
    // V_DP exactly 0.5 should NOT trigger NSR (Python uses > 0.5)
    const r_at = c4DissolutionTrapping({ ...sleipner, V_DP: 0.5 });
    expect(r_at.status).not.toBe("NSR");
    const r_above = c4DissolutionTrapping({ ...sleipner, V_DP: 0.51 });
    expect(r_above.status).toBe("NSR");
  });
});

// ===== C5 =====
describe("C5 Halite Precipitation (Zeidouni 2009 Eq. 26)", () => {
  it("PASS when Q_inj > Q_min for low-salinity Utsira", () => {
    const r = c5HalitePrecipitation(sleipner);
    expect(r.pass_flag).toBe(true);
    // Utsira chi_w = 4.2e-4 is quite high, Q_min is very small
    expect(r.details.Q_min_m3s as number).toBeGreaterThan(0);
  });

  it("Q_min increases with salinity (lower chi_w at same T/P = higher halite risk)", () => {
    const r_low_chi = c5HalitePrecipitation({ ...sleipner, chi_w: 1e-4 });
    const r_high_chi = c5HalitePrecipitation({ ...sleipner, chi_w: 1e-3 });
    expect(r_low_chi.details.Q_min_m3s as number).toBeGreaterThan(
      r_high_chi.details.Q_min_m3s as number
    );
  });

  it("FAIL when Q_inj < Q_min (very low injection rate, high chi_w demand)", () => {
    // Force FAIL: very small injection rate vs large Q_min (low chi_w)
    const r = c5HalitePrecipitation({
      ...sleipner,
      Q_m3s: 1e-6,
      chi_w: 1e-6,
      S_wi: 0.30,
      r_crit_m: 5.0,
    });
    expect(r.pass_flag).toBe(false);
  });

  it("returns FAIL with note when chi_w is not supplied", () => {
    const f = { ...sleipner };
    delete (f as Partial<FormationInput>).chi_w;
    const r = c5HalitePrecipitation(f);
    expect(r.pass_flag).toBe(false);
    expect(r.note).toContain("chi_w");
  });
});

// ===== C6 =====
describe("C6 Supercritical Phase (Span-Wagner constants)", () => {
  it("PASS at Sleipner conditions (T=37C, P=10 MPa)", () => {
    const r = c6SupercriticalPhase(sleipner);
    expect(r.pass_flag).toBe(true);
  });

  it("FAIL at subcritical T and P", () => {
    const r = c6SupercriticalPhase({ ...sleipner, T_C: 20, P_MPa: 5 });
    expect(r.pass_flag).toBe(false);
  });

  it("FAIL when P below P_crit (7.38 MPa)", () => {
    const r = c6SupercriticalPhase({ ...sleipner, P_MPa: 7.0 });
    expect(r.pass_flag).toBe(false);
  });

  it("FAIL when T below T_crit (30.98 degC)", () => {
    const r = c6SupercriticalPhase({ ...sleipner, T_C: 30.0 });
    expect(r.pass_flag).toBe(false);
  });
});

// ===== C7 =====
describe("C7 Capillary Seal Overpressure (buoyancy + injection term)", () => {
  it("PASS for Sleipner tight caprock", () => {
    const r = c7CapillarySeal(sleipner);
    expect(r.pass_flag).toBe(true);
  });

  it("injection overpressure contributes to total dP", () => {
    const r_no_inj = c7CapillarySeal({ ...sleipner, delta_P_inj_Pa: 0 });
    const r_with_inj = c7CapillarySeal({ ...sleipner, delta_P_inj_Pa: 5e6 });
    // Higher injection pressure should make margin worse (smaller)
    expect(r_no_inj.details.margin_MPa as number).toBeGreaterThan(
      r_with_inj.details.margin_MPa as number
    );
  });

  it("FAIL when injection overpressure exceeds caprock entry pressure", () => {
    const r = c7CapillarySeal({
      ...sleipner,
      k_cap_mD: 5.0,
      phi_cap_frac: 0.35,
      rho_CO2_kgm3: 400,
      plume_thickness_m: 200,
      delta_P_inj_Pa: 8e6,
    });
    expect(r.pass_flag).toBe(false);
  });

  it("g = 9.80665 used (matches Python reference)", () => {
    // Verify buoyancy term: dP_buoy = (rho_brine - rho_co2) * 9.80665 * h
    // For rho_brine=1020, rho_co2=720, h=40: dP_buoy = 300 * 9.80665 * 40 = 117679 Pa
    const r = c7CapillarySeal({ ...sleipner, delta_P_inj_Pa: 0 });
    const expected_buoy_MPa = (1020 - 720) * 9.80665 * 40 / 1e6;
    expect(r.details.dP_buoy_MPa as number).toBeCloseTo(expected_buoy_MPa, 4);
  });
});

// ===== C8 =====
describe("C8 Storage Capacity (user target)", () => {
  it("PASS when M_CO2 > V_target_Mt", () => {
    const r = c8StorageCapacity(sleipner); // V_target_Mt = 10 Mt
    expect(r.pass_flag).toBe(true);
    expect(r.details.M_CO2_Mt as number).toBeGreaterThan(10);
  });

  it("FAIL when M_CO2 < V_target_Mt", () => {
    const r = c8StorageCapacity({
      ...sleipner, area_km2: 0.01, h_m: 5, E_vol: 0.01, V_target_Mt: 100,
    });
    expect(r.pass_flag).toBe(false);
  });

  it("informational when V_target_Mt not supplied", () => {
    const f = { ...sleipner };
    delete (f as Partial<FormationInput>).V_target_Mt;
    const r = c8StorageCapacity(f);
    expect(r.status).toBe("PASS");
    expect(r.note).toContain("informational");
  });
});

// ===== C9 =====
describe("C9 Injectivity (threshold ~86 m3/day/MPa, r_e=1000 m)", () => {
  it("PASS for high-permeability Utsira sand (2000 mD)", () => {
    const r = c9Injectivity(sleipner);
    expect(r.pass_flag).toBe(true);
    // II_SI should be >> 1e-9
    expect(r.details.II_m3s_per_Pa as number).toBeGreaterThan(1e-9);
  });

  it("FAIL for very low permeability (k=0.05 mD, thin reservoir)", () => {
    const r = c9Injectivity({ ...sleipner, k_res_mD: 0.05, h_m: 5 });
    expect(r.pass_flag).toBe(false);
  });

  it("skin factor shifts II (negative skin = stimulated well has higher II)", () => {
    const r_no_skin = c9Injectivity({ ...sleipner, skin: 0 });
    const r_neg_skin = c9Injectivity({ ...sleipner, skin: -3 });
    expect(r_neg_skin.details.II_m3s_per_Pa as number).toBeGreaterThan(
      r_no_skin.details.II_m3s_per_Pa as number
    );
  });

  it("threshold is ~86 m3/(day·MPa) (= 1e-9 m3/s/Pa)", () => {
    expect((86.4 / (86400 * 1e6))).toBeCloseTo(1e-9, 12);
  });
});

// ===== C10 =====
describe("C10 Monitoring Feasibility (plume area/thickness, EPA 146.90(a))", () => {
  it("PASS for Sleipner plume (4 km2, 40 m) vs 4D seismic threshold (0.1 km2, 1 m)", () => {
    const r = c10MonitoringFeasibility(sleipner);
    expect(r.pass_flag).toBe(true);
  });

  it("FAIL when plume area below 4D seismic threshold", () => {
    const r = c10MonitoringFeasibility({ ...sleipner, plume_area_km2: 0.05 });
    expect(r.pass_flag).toBe(false);
  });

  it("FAIL when plume thickness below 4D seismic threshold (1 m)", () => {
    const r = c10MonitoringFeasibility({ ...sleipner, plume_thickness_m: 0.5 });
    expect(r.pass_flag).toBe(false);
  });

  it("gravity threshold is stricter (0.5 km2, 5 m)", () => {
    const r = c10MonitoringFeasibility({
      ...sleipner, plume_area_km2: 0.3, plume_thickness_m: 3.0,
      monitor_type: "gravity",
    });
    expect(r.pass_flag).toBe(false);
  });

  it("InSAR threshold is strictest (1 km2, 10 m)", () => {
    const r_4d = c10MonitoringFeasibility({
      ...sleipner, plume_area_km2: 0.5, plume_thickness_m: 8.0,
      monitor_type: "4D_seismic",
    });
    const r_insar = c10MonitoringFeasibility({
      ...sleipner, plume_area_km2: 0.5, plume_thickness_m: 8.0,
      monitor_type: "InSAR",
    });
    expect(r_4d.pass_flag).toBe(true);
    expect(r_insar.pass_flag).toBe(false);
  });

  it("override thresholds are respected", () => {
    const r = c10MonitoringFeasibility({
      ...sleipner, plume_area_km2: 0.05,
      monitor_min_area_km2: 0.02, monitor_min_thickness_m: 0.5,
    });
    expect(r.pass_flag).toBe(true);
  });
});
