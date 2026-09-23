/**
 * Formation input parameters for the 14-criterion CO2 storage screening matrix.
 * C1-C10 are physics-computable from these fields.
 * C11-C14 are regulatory permit inputs (boolean flags).
 */
export interface FormationInput {
  // --- Geomechanical (C1) ---
  sigma1_MPa: number;           // Maximum principal stress (MPa)
  sigma3_MPa: number;           // Minimum principal stress (MPa)
  P_init_MPa: number;           // Initial reservoir pore pressure (MPa)
  beta_deg: number;             // Fault dip angle (degrees)
  mu_f: number;                 // Fault friction coefficient (dimensionless)
  C0_MPa: number;               // Cohesion (MPa); 0 for pre-existing faults
  alpha_biot: number;           // Biot poroelastic coefficient (dimensionless)
  delta_T_C?: number;           // Joule-Thomson temperature change (degC); negative = cooling
  E_GPa?: number;               // Young's modulus (GPa); default 20
  alpha_T?: number;             // Linear thermal expansion coeff (1/degC); default 1e-5
  nu_poisson?: number;          // Poisson's ratio; default 0.25

  // --- Seal capacity (C2) ---
  k_cap_mD: number;             // Caprock permeability (mD)
  phi_cap_frac: number;         // Caprock porosity (fraction)
  IFT_mNm: number;              // CO2-brine interfacial tension (mN/m)
  theta_deg: number;            // Contact angle (degrees)
  r35_cap_um?: number;          // Measured MICP r35 (um); bypasses Pittman if supplied
  caprock_lithology?: "sandstone" | "carbonate"; // default "sandstone"

  // --- AoR / plume geometry (C3) ---
  Q_m3s: number;                // Injection rate (m3/s)
  t_s: number;                  // Injection duration (seconds)
  k_res_mD: number;             // Reservoir permeability (mD)
  phi_res_frac: number;         // Reservoir porosity (fraction)
  ct_Pa: number;                // Total compressibility (Pa^-1)
  h_m: number;                  // Reservoir thickness (m)
  mu_brine_Pa_s: number;        // Brine viscosity (Pa.s); used in Theis formula
  S_CO2?: number;               // Max CO2 saturation (1-Swi); default 0.65
  r_permitted_m?: number;       // Regulatory AoR boundary (m); enables C3 pass/fail
  dP_crit_Pa?: number;          // AoR pressure threshold (Pa); default 1e5

  // --- Convective mixing / dissolution trapping (C4) ---
  delta_rho_kgm3: number;       // CO2-saturated brine minus resident brine density (kg/m3)
  D_m: number;                  // CO2 diffusivity in brine (m2/s)
  kv_kh_ratio?: number;         // Vertical-to-horizontal permeability ratio; default 0.1
  V_DP?: number;                // Dykstra-Parsons coefficient (0-1)

  // --- Halite precipitation (C5 - Zeidouni 2009 Eq. 26) ---
  S_wi?: number;                // Irreducible water saturation (fraction); default 0.20
  rho_brine_kgm3?: number;      // Brine density (kg/m3); default 1050
  r_crit_m?: number;            // Critical drying radius (m); default 1.0
  chi_w?: number;               // Water mass fraction in CO2 phase
  t_permit_s?: number;          // Permit injection duration (s); default 9.467e8 (30 yr)

  // --- Supercritical phase (C6) ---
  T_C: number;                  // Reservoir temperature (degC)
  P_MPa: number;                // Reservoir pressure (MPa)

  // --- Capillary seal overpressure margin (C7) ---
  delta_P_inj_Pa?: number;      // Injection-induced wellbore overpressure (Pa); default 0
  plume_thickness_m: number;    // CO2 plume column height (m)

  // --- Storage capacity (C8) ---
  area_km2: number;             // Reservoir area (km2)
  rho_CO2_kgm3: number;         // CO2 density at reservoir conditions (kg/m3)
  E_vol: number;                // Volumetric efficiency factor (fraction)
  V_target_Mt?: number;         // Storage target (Mt); enables C8 pass/fail

  // --- Injectivity (C9) ---
  mu_CO2?: number;              // CO2 viscosity (Pa.s)
  r_e_m?: number;               // Drainage radius (m); default 1000
  r_w_m?: number;               // Wellbore radius (m); default 0.1
  skin?: number;                // Skin factor; default 0

  // --- Monitoring feasibility (C10) ---
  plume_area_km2: number;       // Expected CO2 plume footprint area (km2)
  monitor_type?: "4D_seismic" | "gravity" | "InSAR"; // default "4D_seismic"
  monitor_min_area_km2?: number;    // Override threshold (km2)
  monitor_min_thickness_m?: number; // Override threshold (m)

  // --- Regulatory permit inputs (C11-C14) ---
  c11_usdw_exempt?: boolean;
  c12_legacy_wells?: boolean;
  c13_mineral_rights?: boolean;
  c14_eia_complete?: boolean;

  // --- Convenience fields ---
  depth_m?: number;
  salinity_ppm?: number;
}

export interface CriterionResult {
  criterion: string;
  label: string;
  pass_flag: boolean;
  status: "PASS" | "FAIL" | "NSR" | "N/A";
  value?: number;
  threshold?: number;
  unit?: string;
  note?: string;
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
  percentiles: Record<string, number>;
  pass_probabilities: Record<string, number>;
}
