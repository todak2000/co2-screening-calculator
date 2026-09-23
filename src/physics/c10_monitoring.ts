/**
 * C10: Monitoring Feasibility (4D Seismic + Wellbore)
 *
 * Assesses whether the site is amenable to standard CCS monitoring methods.
 * Two sub-checks:
 *
 *   (a) 4D seismic detectability: depth <= 3000 m (adequate seismic resolution)
 *       and plume_area_km2 >= 0.1 km2 (detectable anomaly size)
 *
 *   (b) Wellbore surveillance: salinity <= 300,000 ppm TDS
 *       (high salinity degrades pressure transient interpretation)
 *
 * Pass: both sub-checks pass.
 *
 * Reference:
 *   Arts, R. et al. (2004). Seismic monitoring at the Sleipner underground CO2
 *     storage site (North Sea). Energy 29(9-10), 1383-1392.
 */

import type { FormationInput, CriterionResult } from "../types.js";

const DEPTH_MAX_M = 3000;
const SALINITY_MAX_PPM = 300000;
const PLUME_AREA_MIN_KM2 = 0.1;

export function c10MonitoringFeasibility(f: FormationInput): CriterionResult {
  const seismic_ok =
    f.depth_m <= DEPTH_MAX_M && f.plume_area_km2 >= PLUME_AREA_MIN_KM2;
  const wellbore_ok = f.salinity_ppm <= SALINITY_MAX_PPM;
  const pass_flag = seismic_ok && wellbore_ok;

  return {
    criterion: "C10",
    label: "Monitoring Feasibility",
    pass_flag,
    status: pass_flag ? "PASS" : "FAIL",
    value: f.depth_m,
    threshold: DEPTH_MAX_M,
    unit: "m depth",
    details: {
      depth_m: f.depth_m,
      depth_limit_m: DEPTH_MAX_M,
      salinity_ppm: f.salinity_ppm,
      salinity_limit_ppm: SALINITY_MAX_PPM,
      plume_area_km2: f.plume_area_km2,
      plume_area_min_km2: PLUME_AREA_MIN_KM2,
      seismic_ok,
      wellbore_ok,
    },
  };
}
