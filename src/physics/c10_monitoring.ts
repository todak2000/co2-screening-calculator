/**
 * C10: Monitoring Feasibility - Plume Detectability
 *
 * Checks plume dimensions against minimum detectable thresholds for
 * the selected monitoring technology.
 *
 * Default thresholds (EPA 40 CFR 146.90(a); DNV-RP-J203 §6.1):
 *   4D seismic: area >= 0.10 km2, thickness >= 1.0 m
 *   gravity:    area >= 0.50 km2, thickness >= 5.0 m
 *   InSAR:      area >= 1.00 km2, thickness >= 10.0 m
 *
 * Override with monitor_min_area_km2 / monitor_min_thickness_m for
 * site-specific sensitivity study results.
 *
 * Pass: plume_area >= min_area AND plume_thickness >= min_thickness
 *
 * References:
 *   EPA 40 CFR 146.90(a).
 *   DNV-RP-J203 (2012) §6.1.
 *   Arts, R. et al. (2004). Energy 29(9-10), 1383-1392.
 */

import type { FormationInput, CriterionResult } from "../types.js";

const THRESHOLDS = {
  "4D_seismic": { min_area_km2: 0.10, min_thickness_m: 1.0 },
  gravity:      { min_area_km2: 0.50, min_thickness_m: 5.0 },
  InSAR:        { min_area_km2: 1.00, min_thickness_m: 10.0 },
};

export function c10MonitoringFeasibility(f: FormationInput): CriterionResult {
  const monitor_type = f.monitor_type ?? "4D_seismic";
  const base = THRESHOLDS[monitor_type];

  const min_area = f.monitor_min_area_km2 ?? base.min_area_km2;
  const min_thick = f.monitor_min_thickness_m ?? base.min_thickness_m;

  const pass_flag =
    f.plume_area_km2 >= min_area && f.plume_thickness_m >= min_thick;

  const note =
    `Plume ${f.plume_area_km2.toFixed(2)} km2 x ${f.plume_thickness_m.toFixed(1)} m ` +
    `vs ${monitor_type} threshold ${min_area} km2 x ${min_thick} m`;

  return {
    criterion: "C10",
    label: "Monitoring Feasibility",
    pass_flag,
    status: pass_flag ? "PASS" : "FAIL",
    value: f.plume_area_km2,
    threshold: min_area,
    unit: "km2 plume area",
    note,
    details: {
      plume_area_km2: f.plume_area_km2,
      plume_thickness_m: f.plume_thickness_m,
      monitor_type,
      min_area_km2: min_area,
      min_thickness_m: min_thick,
    },
  };
}
