/**
 * Integration tests for the full 14-criterion screening pipeline.
 * Tests complete pass (Sleipner-like), specific failures, and NSR governance gate.
 */

import { describe, it, expect } from "vitest";
import { runScreening } from "../../src/main.js";
import type { FormationInput } from "../../src/types.js";

// Sleipner Utsira-like formation (should score 10/10 on C1-C10)
const sleipner: FormationInput = {
  sigma1_MPa: 28.0, sigma3_MPa: 18.0, P_init_MPa: 9.8,
  beta_deg: 30.0, mu_f: 0.65, C0_MPa: 0.0, alpha_biot: 0.75,
  k_cap_mD: 0.0001, phi_cap_frac: 0.06,
  IFT_mNm: 30.0, theta_deg: 15.0,
  Q_m3s: 0.024, t_s: 8 * 3.1536e7,
  k_res_mD: 2000.0, phi_res_frac: 0.37,
  ct_Pa: 5e-10, h_m: 250.0, V_DP: 0.30,
  mu_CO2: 5.5e-5, mu_brine_Pa_s: 8e-4,
  delta_rho_kgm3: 10.0, D_m: 2e-9,
  T_C: 37.0, P_MPa: 10.0,
  h_cap_m: 200.0, dP_cap_MPa: 3.0,
  area_km2: 100.0, rho_CO2_kgm3: 720.0, E_vol: 0.02,
  depth_m: 800.0, salinity_ppm: 32000,
  plume_area_km2: 4.0, plume_thickness_m: 40.0,
  chi_w: 0.0023, dP_crit_Pa: 1e5,
  c11_usdw_exempt: true,
  c12_legacy_wells: true,
  c13_mineral_rights: true,
  c14_eia_complete: true,
};

describe("runScreening - Sleipner Utsira (full PASS)", () => {
  it("returns 14 criteria in result", () => {
    const r = runScreening(sleipner, "Sleipner Utsira");
    expect(r.criteria).toHaveLength(14);
  });

  it("all 14 criteria PASS", () => {
    const r = runScreening(sleipner, "Sleipner Utsira");
    const fails = r.criteria.filter((c) => c.status === "FAIL" || c.status === "NSR");
    expect(fails).toHaveLength(0);
    expect(r.overall_pass).toBe(true);
  });

  it("formation name is preserved in result", () => {
    const r = runScreening(sleipner, "Sleipner Utsira");
    expect(r.formation_name).toBe("Sleipner Utsira");
  });

  it("C1 P_max > P_init for Sleipner", () => {
    const r = runScreening(sleipner, "Sleipner Utsira");
    const c1 = r.criteria.find((c) => c.criterion === "C1")!;
    expect(c1.value as number).toBeGreaterThan(sleipner.P_init_MPa);
  });

  it("C8 capacity > 100 Mt for Utsira-scale reservoir", () => {
    const r = runScreening(sleipner, "Sleipner Utsira");
    const c8 = r.criteria.find((c) => c.criterion === "C8")!;
    expect(c8.details.M_CO2_Mt as number).toBeGreaterThan(100);
  });
});

describe("runScreening - High-risk formation (multiple FAILs)", () => {
  const highRisk: FormationInput = {
    ...sleipner,
    // Over-pressured (C1 FAIL)
    P_init_MPa: 45.0,
    // Leaky caprock (C2 + C7 FAIL)
    k_cap_mD: 10.0,
    phi_cap_frac: 0.40,
    // Subcritical conditions (C6 FAIL)
    T_C: 20.0,
    P_MPa: 5.0,
    // Tiny formation (C8 FAIL)
    area_km2: 0.005,
    h_m: 2,
    // Too deep and high salinity (C10 FAIL)
    depth_m: 4500,
    salinity_ppm: 350000,
    // Permit issues
    c11_usdw_exempt: false,
    c12_legacy_wells: false,
  };

  it("overall_pass is false", () => {
    const r = runScreening(highRisk, "High Risk");
    expect(r.overall_pass).toBe(false);
  });

  it("has multiple FAIL criteria", () => {
    const r = runScreening(highRisk, "High Risk");
    expect(r.fail_count).toBeGreaterThan(3);
  });

  it("C6 is FAIL for subcritical conditions", () => {
    const r = runScreening(highRisk, "High Risk");
    const c6 = r.criteria.find((c) => c.criterion === "C6")!;
    expect(c6.status).toBe("FAIL");
  });
});

describe("runScreening - NSR governance gate (V_DP >= 0.5)", () => {
  it("C4 is NSR when V_DP = 0.55", () => {
    const f = { ...sleipner, V_DP: 0.55 };
    const r = runScreening(f, "High Heterogeneity");
    const c4 = r.criteria.find((c) => c.criterion === "C4")!;
    expect(c4.status).toBe("NSR");
    expect(c4.pass_flag).toBe(false);
    expect(r.nsr_count).toBeGreaterThan(0);
    expect(r.overall_pass).toBe(false);
  });
});

describe("runScreening - EOS auto-fill", () => {
  it("fills rho_CO2 and mu_CO2 from T/P when not provided", () => {
    const f: FormationInput = {
      ...sleipner,
      rho_CO2_kgm3: 0, // force EOS fill
      mu_CO2: 0,        // force EOS fill
      T_C: 54,
      P_MPa: 22,
    };
    const r = runScreening(f, "EOS Auto-fill");
    // If EOS filled correctly, C5 and C8 should use non-zero rho
    const c8 = r.criteria.find((c) => c.criterion === "C8")!;
    expect(c8.details.rho_CO2_kgm3 as number).toBeGreaterThan(0);
  });
});

describe("runScreening - Permit criteria (C11-C14)", () => {
  it("C11-C14 are PASS when all permit flags true", () => {
    const r = runScreening(sleipner, "Permit Complete");
    ["C11", "C12", "C13", "C14"].forEach((c) => {
      const crit = r.criteria.find((x) => x.criterion === c)!;
      expect(crit.status).toBe("PASS");
    });
  });

  it("C11-C14 show N/A when permit flags are undefined", () => {
    const f: FormationInput = { ...sleipner };
    delete (f as Partial<FormationInput>).c11_usdw_exempt;
    delete (f as Partial<FormationInput>).c12_legacy_wells;
    delete (f as Partial<FormationInput>).c13_mineral_rights;
    delete (f as Partial<FormationInput>).c14_eia_complete;
    const r = runScreening(f, "Permit Not Assessed");
    ["C11", "C12", "C13", "C14"].forEach((c) => {
      const crit = r.criteria.find((x) => x.criterion === c)!;
      expect(crit.status).toBe("N/A");
    });
  });
});
