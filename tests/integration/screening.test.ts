/**
 * Integration tests for the full 14-criterion screening pipeline.
 * Equations aligned with Python reference (c1_c10_screening.py).
 */

import { describe, it, expect } from "vitest";
import { runScreening } from "../../src/main.js";
import type { FormationInput } from "../../src/types.js";

// Sleipner Utsira-like formation
const sleipner: FormationInput = {
  sigma1_MPa: 28.0, sigma3_MPa: 18.0, P_init_MPa: 9.8,
  beta_deg: 30.0, mu_f: 0.65, C0_MPa: 0.0, alpha_biot: 0.75,
  E_GPa: 20.0, alpha_T: 1e-5, nu_poisson: 0.25,
  k_cap_mD: 1e-6, phi_cap_frac: 0.08,
  IFT_mNm: 30.0, theta_deg: 15.0,
  Q_m3s: 0.024, t_s: 8 * 3.1536e7,
  k_res_mD: 2000.0, phi_res_frac: 0.37,
  ct_Pa: 5e-10, h_m: 250.0, V_DP: 0.30, S_CO2: 0.65,
  mu_CO2: 5.5e-5, mu_brine_Pa_s: 8e-4, kv_kh_ratio: 0.1,
  delta_rho_kgm3: 10.0, D_m: 2e-9,
  T_C: 37.0, P_MPa: 10.0,
  plume_thickness_m: 40.0, delta_P_inj_Pa: 5e5,
  area_km2: 100.0, rho_CO2_kgm3: 720.0, E_vol: 0.02, V_target_Mt: 10.0,
  plume_area_km2: 4.0,
  chi_w: 4.2e-4, S_wi: 0.20, rho_brine_kgm3: 1020.0, r_crit_m: 1.0,
  t_permit_s: 9.467e8,
  dP_crit_Pa: 1e5, r_permitted_m: 20000,
  c11_usdw_exempt: true, c12_legacy_wells: true,
  c13_mineral_rights: true, c14_eia_complete: true,
};

describe("runScreening - Sleipner Utsira (full PASS)", () => {
  it("returns 14 criteria", () => {
    const r = runScreening(sleipner, "Sleipner Utsira");
    expect(r.criteria).toHaveLength(14);
  });

  it("all 14 criteria PASS for well-characterised Sleipner parameters", () => {
    const r = runScreening(sleipner, "Sleipner Utsira");
    const fails = r.criteria.filter((c) => c.status === "FAIL" || c.status === "NSR");
    expect(fails).toHaveLength(0);
    expect(r.overall_pass).toBe(true);
  });

  it("formation name preserved", () => {
    const r = runScreening(sleipner, "Sleipner Utsira");
    expect(r.formation_name).toBe("Sleipner Utsira");
  });

  it("C1 P_max > P_init", () => {
    const r = runScreening(sleipner);
    const c1 = r.criteria.find((c) => c.criterion === "C1")!;
    expect(c1.value as number).toBeGreaterThan(sleipner.P_init_MPa);
  });

  it("C8 capacity > 100 Mt for Utsira-scale reservoir", () => {
    const r = runScreening(sleipner);
    const c8 = r.criteria.find((c) => c.criterion === "C8")!;
    expect(c8.details.M_CO2_Mt as number).toBeGreaterThan(100);
  });

  it("C9 II_SI > 1e-9 m3/s/Pa for 2000 mD reservoir", () => {
    const r = runScreening(sleipner);
    const c9 = r.criteria.find((c) => c.criterion === "C9")!;
    expect(c9.details.II_m3s_per_Pa as number).toBeGreaterThan(1e-9);
  });
});

describe("runScreening - High-risk formation (multiple FAILs)", () => {
  const highRisk: FormationInput = {
    ...sleipner,
    P_init_MPa: 45.0,           // C1 FAIL (over-pressured)
    k_cap_mD: 5.0,               // C2 FAIL (leaky caprock)
    phi_cap_frac: 0.30,
    T_C: 20.0, P_MPa: 5.0,       // C6 FAIL (subcritical)
    area_km2: 0.001, h_m: 2,     // C8 FAIL (tiny, below V_target_Mt)
    V_target_Mt: 10.0,
    plume_area_km2: 0.02,         // C10 FAIL (undetectable plume)
    c11_usdw_exempt: false,       // C11 FAIL
    c12_legacy_wells: false,      // C12 FAIL
  };

  it("overall_pass is false", () => {
    const r = runScreening(highRisk, "High Risk");
    expect(r.overall_pass).toBe(false);
  });

  it("C6 FAIL for subcritical T=20C, P=5 MPa", () => {
    const r = runScreening(highRisk, "High Risk");
    const c6 = r.criteria.find((c) => c.criterion === "C6")!;
    expect(c6.status).toBe("FAIL");
  });

  it("C10 FAIL for plume area below 4D seismic threshold", () => {
    const r = runScreening(highRisk, "High Risk");
    const c10 = r.criteria.find((c) => c.criterion === "C10")!;
    expect(c10.status).toBe("FAIL");
  });

  it("has multiple FAIL criteria", () => {
    const r = runScreening(highRisk, "High Risk");
    expect(r.fail_count).toBeGreaterThan(3);
  });
});

describe("runScreening - NSR governance gate (V_DP > 0.5)", () => {
  it("C4 NSR when V_DP = 0.55", () => {
    const r = runScreening({ ...sleipner, V_DP: 0.55 }, "High Heterogeneity");
    const c4 = r.criteria.find((c) => c.criterion === "C4")!;
    expect(c4.status).toBe("NSR");
    expect(r.nsr_count).toBeGreaterThan(0);
    expect(r.overall_pass).toBe(false);
  });

  it("C4 PASS (not NSR) when V_DP exactly = 0.5 (Python uses > 0.5)", () => {
    const r = runScreening({ ...sleipner, V_DP: 0.5 }, "V_DP boundary");
    const c4 = r.criteria.find((c) => c.criterion === "C4")!;
    expect(c4.status).not.toBe("NSR");
  });
});

describe("runScreening - Carbonate caprock (C2 MICP gate)", () => {
  it("C2 FAIL with MICP Required when carbonate lithology and no r35_cap_um", () => {
    const r = runScreening(
      { ...sleipner, caprock_lithology: "carbonate" },
      "Carbonate Caprock"
    );
    const c2 = r.criteria.find((c) => c.criterion === "C2")!;
    expect(c2.status).toBe("FAIL");
    expect(c2.note).toContain("MICP Required");
  });
});

describe("runScreening - EOS auto-fill", () => {
  it("fills rho_CO2 and mu_CO2 from T/P when zero", () => {
    const f: FormationInput = { ...sleipner, rho_CO2_kgm3: 0, mu_CO2: 0 };
    expect(() => runScreening(f, "EOS fill")).not.toThrow();
    const r = runScreening(f, "EOS fill");
    const c8 = r.criteria.find((c) => c.criterion === "C8")!;
    expect(c8.details.rho_CO2_kgm3 as number).toBeGreaterThan(0);
  });
});

describe("runScreening - Permit criteria (C11-C14)", () => {
  it("C11-C14 PASS when all true", () => {
    const r = runScreening(sleipner);
    ["C11", "C12", "C13", "C14"].forEach((c) => {
      expect(r.criteria.find((x) => x.criterion === c)!.status).toBe("PASS");
    });
  });

  it("C11-C14 N/A when undefined", () => {
    const f = { ...sleipner };
    delete (f as Partial<FormationInput>).c11_usdw_exempt;
    delete (f as Partial<FormationInput>).c12_legacy_wells;
    delete (f as Partial<FormationInput>).c13_mineral_rights;
    delete (f as Partial<FormationInput>).c14_eia_complete;
    const r = runScreening(f, "Permit Not Assessed");
    ["C11", "C12", "C13", "C14"].forEach((c) => {
      expect(r.criteria.find((x) => x.criterion === c)!.status).toBe("N/A");
    });
  });
});
