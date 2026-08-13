import { calcAll, type DeductionInputs } from "./taxEngine"
import type { SsCategory } from "./brackets"

export function findRequiredGross(
  targetNetMonthly: number,
  activityYear: 1 | 2 | 3,
  hasNHR: boolean,
  coefficient = 0.75,
  ssCategory: SsCategory = "services",
  deductions?: DeductionInputs,
): { grossFL: number; grossNHR: number } {
  const targetNetAnnual = targetNetMonthly * 12

  function solve(useNHR: boolean): number {
    let lo = targetNetAnnual
    let hi = targetNetAnnual * 4

    for (let i = 0; i < 100; i++) {
      const mid = (lo + hi) / 2
      const result = calcAll({ grossAnnual: mid, activityYear, hasNHR: useNHR, coefficient, ssCategory, deductions })
      const net = useNHR
        ? Math.max(result.netFreelancer, result.netNHR)
        : result.netFreelancer

      if (Math.abs(net - targetNetAnnual) < 1) break
      if (net < targetNetAnnual) lo = mid
      else hi = mid
    }

    return (lo + hi) / 2
  }

  return {
    grossFL:  solve(false),
    grossNHR: solve(true),
  }
}
