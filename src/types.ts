/**
 * Formation input parameters for the 14-criterion CO2 storage screening matrix.
 * C1-C10 are physics-computable from these fields.
 * C11-C14 are regulatory permit inputs (boolean flags).
 */
export interface FormationInput {
  // --- Geomechanical (C1) ---
  sigma1_MPa: number;         // Maximum principal stress (MPa)
  sigma3_MPa: number;         // Minimum principal stress (MPa)
  P_init_MPa: number;         // Initial reservoir pore pressure (MPa)
  beta_deg: number;           // Fault dip angle (degrees)
  mu_f: number;               // Fault friction coefficient (dimensionless)
  C0_MPa: number;             // Cohesion (MPa); 0 for pre-existing faults
  alpha_biot: number;         // Biot poroelastic coefficient (dimensionless)
  delta_T_C?: number;         // Joule-Thomson temperature change (degC); negative = cooling

  // --- Seal capacity (C2) ---
  k_cap_mD: number;           // Caprock permeability (mD)
  phi_cap_frac: number;       // Caprock porosity (fraction)
  IFT_mNm: number;            // CO2-brine interfacial tension (mN/m)
  theta_deg: number;          // Contact angle (degrees)
  r35_um?: number;            // Winland r35 pore-throat radius (micrometres); computed if absent

  // --- AoR / plume geometry (C3) ---
  Q_m3s: number;              // Injection rate (m3/s)
  t_s: number;                // Injection duration (seconds)
  k_res_mD: number;           // Reservoir permeability (mD)
  phi_res_frac: number;       // Reservoir porosity (fraction)
  ct_Pa: number;              // Total compressibility (Pa^-1)
  h_m: number;                // Reservoir thickness (m)
  V_DP?: number;              // Dykstra-Parsons coefficient (0-1); default 0.45
  mu_CO2?: number;            // CO2 viscosity (Pa.s); computed if T_C and P_MPa given
  mu_brine_Pa_s: number;      // Brine viscosity (Pa.s)
  dP_crit_Pa?: number;        // AoR pressure threshold (Pa); default 1e5 (0.1 MPa, EPA UIC)

  // --- Convective mixing / dissolution trapping (C4) ---
  delta_rho_kgm3: number;     // CO2-saturated brine minus resident brine density contrast (kg/m3)
  D_m: number;                // CO2 diffusivity in brine (m2/s)

  // --- Minimum injection rate (C5) ---
  // (uses Q_m3s, rho_CO2_kgm3, reused from above)

  // --- Supercritical phase / temperature-pressure (C6) ---
  T_C: number;                // Reservoir temperature (degC)
  P_MPa: number;              // Reservoir pressure (MPa)

  // --- Capillary seal overpressure margin (C7) ---
  h_cap_m: number;            // Caprock thickness (m)
  dP_cap_MPa: number;         // Maximum safe injection overpressure at caprock (MPa)

  // --- Storage capacity estimate (C8) ---
  area_km2: number;           // Reservoir area (km2)
  rho_CO2_kgm3: number;       // CO2 density at reservoir conditions (kg/m3)
  E_vol: number;              // Volumetric efficiency factor (fraction; 0.01-0.1 typical)

  // --- Injectivity (C9) ---
  // (uses k_res_mD, h_m, mu_CO2, reused from above)

  // --- Monitoring feasibility (C10) ---
  depth_m: number;            // Top-of-reservoir depth (m)
  salinity_ppm: number;       // Formation water salinity (ppm TDS)
  plume_area_km2: number;     // Expected CO2 plume footprint area (km2)
  plume_thickness_m: number;  // Expected plume thickness (m)
  chi_w?: number;             // Water mass fraction in CO2 phase (dimensionless)

  // --- Regulatory permit inputs (C11-C14, boolean) ---
  c11_usdw_exempt?: boolean;  // C11: USDW exemption obtained (UIC Class VI)
  c12_legacy_wells?: boolean; // C12: No uncemented legacy wells within AoR
  c13_mineral_rights?: boolean; // C13: Pore-space mineral rights secured
  c14_eia_complete?: boolean; // C14: Environmental Impact Assessment complete
}

export interface CriterionResult {
  criterion: string;          // e.g. "C1"
  label: string;              // e.g. "Fault Reactivation Safety"
  pass_flag: boolean;
  status: "PASS" | "FAIL" | "NSR" | "N/A";
  value?: number;
  threshold?: number;
  unit?: string;
  details: Record<string, number | string | boolean>;
}

export interface ScreeningResult {
  formation_name: string;
  criteria: CriterionResult[];
  overall_pass: boolean;
  pass_count: number;
  fail_count: number;
  nsr_count: number;
}

export interface ParamSpec {
  dist: "normal" | "uniform" | "lognormal";
  mean?: number;
  std?: number;
  low?: number;
  high?: number;
}

export interface LHSResult {
  n_valid_samples: number;
  percentiles: Record<string, number>;  // e.g. "C1_P_max_MPa_P10"
  pass_probabilities: Record<string, number>; // e.g. "C1_pass_prob"
}
