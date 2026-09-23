/**
 * Unit tests for individual screening criteria C1-C10.
 * Uses Sleipner-like and high-risk formation parameters.
 */

import { describe, it, expect } from "vitest";
import { c1FaultReactivation } from "../../src/physics/c1_fault.js";
import { c2SealIntegrity } from "../../src/physics/c2_seal.js";
import { c3AreaOfReview } from "../../src/physics/c3_aor.js";
import { c4DissolutionTrapping } from "../../src/physics/c4_dissolution.js";
import { c5MinInjectionRate } from "../../src/physics/c5_injection.js";
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
};

describe("C1 Fault Reactivation", () => {
  it("PASS for Sleipner-like conditions (large stress margin)", () => {
    const r = c1FaultReactivation(sleipner);
    expect(r.pass_flag).toBe(true);
    expect(r.status).toBe("PASS");
    expect(r.value).toBeGreaterThan(sleipner.P_init_MPa);
  });

  it("FAIL when initial pressure exceeds P_max (over-pressured system)", () => {
    const f = { ...sleipner, P_init_MPa: 50.0 };
    const r = c1FaultReactivation(f);
    expect(r.pass_flag).toBe(false);
    expect(r.status).toBe("FAIL");
  });

  it("thermoelastic correction reduces P_max under cooling", () => {
    const r_no_dt = c1FaultReactivation(sleipner);
    const r_with_dt = c1FaultReactivation({ ...sleipner, delta_T_C: -30 });
    expect(r_no_dt.value as number).toBeGreaterThanOrEqual(r_with_dt.value as number);
  });
});

describe("C2 Seal Integrity", () => {
  it("PASS for tight caprock (low permeability, small r35)", () => {
    const r = c2SealIntegrity(sleipner);
    expect(r.pass_flag).toBe(true);
    expect((r.details.P_entry_MPa as number)).toBeGreaterThanOrEqual(3.0);
  });

  it("FAIL for leaky caprock (high k_cap)", () => {
    const f = { ...sleipner, k_cap_mD: 1.0, phi_cap_frac: 0.30 };
    const r = c2SealIntegrity(f);
    expect(r.pass_flag).toBe(false);
  });

  it("r35 increases with permeability", () => {
    const r1 = c2SealIntegrity({ ...sleipner, k_cap_mD: 0.0001 });
    const r2 = c2SealIntegrity({ ...sleipner, k_cap_mD: 0.01 });
    expect(r2.details.r35_um as number).toBeGreaterThan(r1.details.r35_um as number);
  });
});

describe("C3 Area of Review", () => {
  it("always returns PASS status (AoR is informational at screening)", () => {
    const r = c3AreaOfReview(sleipner);
    expect(r.status).toBe("PASS");
  });

  it("returns positive AoR radii", () => {
    const r = c3AreaOfReview(sleipner);
    expect(r.details.r_pf_m as number).toBeGreaterThan(0);
    expect(r.details.r_plume_m as number).toBeGreaterThan(0);
    expect(r.details.r_AoR_m as number).toBeGreaterThan(0);
  });

  it("r_AoR >= r_plume", () => {
    const r = c3AreaOfReview(sleipner);
    expect(r.details.r_AoR_m as number).toBeGreaterThanOrEqual(
      r.details.r_plume_m as number
    );
  });
});

describe("C4 Dissolution Trapping", () => {
  it("PASS for high Ra at Sleipner conditions", () => {
    const r = c4DissolutionTrapping(sleipner);
    expect(r.pass_flag).toBe(true);
    expect(r.details.Ra_homo as number).toBeGreaterThanOrEqual(40);
  });

  it("NSR when V_DP >= 0.5 (extreme heterogeneity)", () => {
    const f = { ...sleipner, V_DP: 0.55 };
    const r = c4DissolutionTrapping(f);
    expect(r.status).toBe("NSR");
    expect(r.pass_flag).toBe(false);
  });

  it("FAIL when Ra < 40 (low permeability, thin reservoir)", () => {
    const f = { ...sleipner, k_res_mD: 0.5, h_m: 5, delta_rho_kgm3: 1.0 };
    const r = c4DissolutionTrapping(f);
    expect(r.pass_flag).toBe(false);
    expect(r.status).toBe("FAIL");
  });
});

describe("C5 Minimum Injection Rate", () => {
  it("PASS for Sleipner injection rate (>0.1 Mt/year)", () => {
    const r = c5MinInjectionRate(sleipner);
    expect(r.pass_flag).toBe(true);
    expect(r.details.Q_min_Mtpa as number).toBeGreaterThanOrEqual(0.1);
  });

  it("FAIL for very low injection rate", () => {
    const f = { ...sleipner, Q_m3s: 1e-6, rho_CO2_kgm3: 720 };
    const r = c5MinInjectionRate(f);
    expect(r.pass_flag).toBe(false);
  });
});

describe("C6 Supercritical Phase", () => {
  it("PASS at Sleipner conditions (T=37C, P=10 MPa)", () => {
    const r = c6SupercriticalPhase(sleipner);
    expect(r.pass_flag).toBe(true);
  });

  it("FAIL at subcritical conditions (T=20C, P=5 MPa)", () => {
    const f = { ...sleipner, T_C: 20, P_MPa: 5.0 };
    const r = c6SupercriticalPhase(f);
    expect(r.pass_flag).toBe(false);
  });

  it("FAIL when only T exceeds critical (P too low)", () => {
    const f = { ...sleipner, T_C: 40, P_MPa: 6.0 };
    const r = c6SupercriticalPhase(f);
    expect(r.pass_flag).toBe(false);
  });
});

describe("C7 Capillary Seal", () => {
  it("PASS for Sleipner tight caprock", () => {
    const r = c7CapillarySeal(sleipner);
    expect(r.pass_flag).toBe(true);
  });

  it("FAIL when plume buoyancy exceeds caprock entry pressure", () => {
    const f = {
      ...sleipner,
      k_cap_mD: 5.0,
      phi_cap_frac: 0.35,
      rho_CO2_kgm3: 400,  // low density -> large buoyancy
      plume_thickness_m: 200,
    };
    const r = c7CapillarySeal(f);
    expect(r.pass_flag).toBe(false);
  });
});

describe("C8 Storage Capacity", () => {
  it("PASS for Sleipner Utsira (large area, thick reservoir)", () => {
    const r = c8StorageCapacity(sleipner);
    expect(r.pass_flag).toBe(true);
    expect(r.details.M_CO2_Mt as number).toBeGreaterThan(10);
  });

  it("FAIL for tiny formation", () => {
    const f = { ...sleipner, area_km2: 0.01, h_m: 5, E_vol: 0.01 };
    const r = c8StorageCapacity(f);
    expect(r.pass_flag).toBe(false);
  });
});

describe("C9 Injectivity", () => {
  it("PASS for high-permeability Utsira sand (2000 mD)", () => {
    const r = c9Injectivity(sleipner);
    expect(r.pass_flag).toBe(true);
    expect(r.details.II_m3d_per_MPa as number).toBeGreaterThan(10);
  });

  it("FAIL for very low permeability formation", () => {
    const f = { ...sleipner, k_res_mD: 0.1, h_m: 5 };
    const r = c9Injectivity(f);
    expect(r.pass_flag).toBe(false);
  });
});

describe("C10 Monitoring Feasibility", () => {
  it("PASS for shallow, low-salinity Sleipner site", () => {
    const r = c10MonitoringFeasibility(sleipner);
    expect(r.pass_flag).toBe(true);
  });

  it("FAIL for deep, high-salinity formation", () => {
    const f = { ...sleipner, depth_m: 4000, salinity_ppm: 350000 };
    const r = c10MonitoringFeasibility(f);
    expect(r.pass_flag).toBe(false);
  });

  it("FAIL for tiny plume (undetectable by seismic)", () => {
    const f = { ...sleipner, plume_area_km2: 0.01 };
    const r = c10MonitoringFeasibility(f);
    expect(r.pass_flag).toBe(false);
  });
});
