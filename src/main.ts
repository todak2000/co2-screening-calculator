/**
 * CO2 Geological Storage Screening Calculator
 *
 * Composes all 14 criteria (C1-C10 physics; C11-C14 permit) into a single
 * screening result. Entry point for both the web UI and test suite.
 *
 * Usage:
 *   import { runScreening } from './main.js';
 *   const result = runScreening(formationInput, 'My Formation');
 */

import type { FormationInput, ScreeningResult, CriterionResult } from "./types.js";
import { prDensity, fenghourViscosity } from "./physics/pvt.js";
import { c1FaultReactivation } from "./physics/c1_fault.js";
import { c2SealIntegrity } from "./physics/c2_seal.js";
import { c3AreaOfReview } from "./physics/c3_aor.js";
import { c4DissolutionTrapping } from "./physics/c4_dissolution.js";
import { c5HalitePrecipitation } from "./physics/c5_injection.js";
import { c6SupercriticalPhase } from "./physics/c6_phase.js";
import { c7CapillarySeal } from "./physics/c7_capillary.js";
import { c8StorageCapacity } from "./physics/c8_capacity.js";
import { c9Injectivity } from "./physics/c9_injectivity.js";
import { c10MonitoringFeasibility } from "./physics/c10_monitoring.js";

/**
 * Populate EOS-derived CO2 properties if T_C and P_MPa are present
 * and rho_CO2_kgm3 / mu_CO2 are absent or zero.
 */
function fillEosProperties(f: FormationInput): FormationInput {
  const filled = { ...f };
  if (filled.T_C !== undefined && filled.P_MPa !== undefined) {
    if (!filled.rho_CO2_kgm3 || filled.rho_CO2_kgm3 <= 0) {
      filled.rho_CO2_kgm3 = prDensity(filled.T_C, filled.P_MPa);
    }
    if (!filled.mu_CO2 || filled.mu_CO2 <= 0) {
      filled.mu_CO2 = fenghourViscosity(filled.T_C, filled.rho_CO2_kgm3);
    }
  }
  return filled;
}

/** Evaluate C11-C14 permit criteria (boolean inputs). */
function evalPermitCriteria(f: FormationInput): CriterionResult[] {
  const permit: Array<{
    criterion: string;
    label: string;
    value: boolean | undefined;
  }> = [
    { criterion: "C11", label: "USDW Exemption", value: f.c11_usdw_exempt },
    { criterion: "C12", label: "Legacy Well Assessment", value: f.c12_legacy_wells },
    { criterion: "C13", label: "Mineral Rights / Pore-Space Rights", value: f.c13_mineral_rights },
    { criterion: "C14", label: "Environmental Impact Assessment", value: f.c14_eia_complete },
  ];
  return permit.map(({ criterion, label, value }) => ({
    criterion,
    label,
    pass_flag: value === true,
    status: value === undefined ? "N/A" : value ? "PASS" : "FAIL",
    details: { input_value: value ?? "not provided" },
  }));
}

/**
 * Run the 14-criterion CO2 storage screening for a single formation.
 *
 * @param input           Formation parameter dictionary
 * @param formation_name  Human-readable label for the formation
 * @returns ScreeningResult with all 14 criteria evaluated
 */
export function runScreening(
  input: FormationInput,
  formation_name = "Unnamed Formation"
): ScreeningResult {
  const f = fillEosProperties(input);

  const physicsCriteria: CriterionResult[] = [
    c1FaultReactivation(f),
    c2SealIntegrity(f),
    c3AreaOfReview(f),
    c4DissolutionTrapping(f),
    c5HalitePrecipitation(f),
    c6SupercriticalPhase(f),
    c7CapillarySeal(f),
    c8StorageCapacity(f),
    c9Injectivity(f),
    c10MonitoringFeasibility(f),
  ];

  const permitCriteria = evalPermitCriteria(f);
  const criteria = [...physicsCriteria, ...permitCriteria];

  const pass_count = criteria.filter((c) => c.status === "PASS").length;
  const fail_count = criteria.filter((c) => c.status === "FAIL").length;
  const nsr_count = criteria.filter((c) => c.status === "NSR").length;
  const overall_pass = fail_count === 0 && nsr_count === 0;

  return {
    formation_name,
    criteria,
    overall_pass,
    pass_count,
    fail_count,
    nsr_count,
  };
}
