import { calcAll, type DeductionInputs } from "./taxEngine"
import { SS_RATE, SS_RELEVANT_INCOME_SHARE, type SsCategory } from "./brackets"

export interface OpeningTimingInputs {
  currentMonth: number // 1-12
  openMonth: number    // 1-12, currentMonth <= openMonth <= 12
  grossAnnual: number
  coefficient: number
  ssCategory: SsCategory
  hasNHR: boolean
  contractMonthlyNet: number
  deductions?: DeductionInputs
}

export interface ScenarioBreakdown {
  gapMonths: number
  gapIncome: number
  b2bIncome: number
  total: number
}

export interface OpeningTimingResult {
  scenarioNow: ScenarioBreakdown
  scenarioWait: ScenarioBreakdown
  difference: number // scenarioNow.total - scenarioWait.total
  recommendation: "now" | "wait" | "equal"
}

export const EQUAL_THRESHOLD_EUR = 500

export function calcOpeningTiming(inputs: OpeningTimingInputs): OpeningTimingResult {
  const {
    currentMonth,
    grossAnnual,
    coefficient,
    ssCategory,
    hasNHR,
    contractMonthlyNet,
    deductions,
  } = inputs
  const openMonth = Math.min(12, Math.max(currentMonth, inputs.openMonth))

  // Scenario "now": open B2B in `openMonth` of this year.
  const gapNowMonths = openMonth - currentMonth
  const gapNowIncome = gapNowMonths * contractMonthlyNet

  const monthsActiveThisYear = 13 - openMonth
  const partialYearResult = calcAll({
    grossAnnual: (grossAnnual * monthsActiveThisYear) / 12,
    activityYear: 1,
    hasNHR,
    coefficient,
    ssCategory,
    deductions,
  })
  const netThisYear = partialYearResult.bestNet

  // Exemption window keeps rolling into next year: exempt for Jan..openMonth-1,
  // SS-liable for openMonth..Dec. IRS-wise this is the 2nd calendar year of activity.
  const nextYearResult = calcAll({
    grossAnnual,
    activityYear: 2,
    hasNHR,
    coefficient,
    ssCategory,
    deductions,
  })
  const ssLiableMonthsNextYear = 13 - openMonth
  const nextYearSS = (grossAnnual * SS_RELEVANT_INCOME_SHARE[ssCategory] * SS_RATE * ssLiableMonthsNextYear) / 12
  const netNextYearFL = grossAnnual - nextYearResult.totalTaxFL - nextYearSS
  const netNextYearNHR = grossAnnual - nextYearResult.totalTaxNHR - nextYearSS
  const bestNetNextYear = hasNHR && netNextYearNHR > netNextYearFL ? netNextYearNHR : netNextYearFL

  const scenarioNow: ScenarioBreakdown = {
    gapMonths: gapNowMonths,
    gapIncome: gapNowIncome,
    b2bIncome: netThisYear + bestNetNextYear,
    total: gapNowIncome + netThisYear + bestNetNextYear,
  }

  // Scenario "wait": open B2B in January of next year, fully exempt for 12 months.
  const gapWaitMonths = 13 - currentMonth
  const gapWaitIncome = gapWaitMonths * contractMonthlyNet
  const fullNextYearResult = calcAll({
    grossAnnual,
    activityYear: 1,
    hasNHR,
    coefficient,
    ssCategory,
    deductions,
  })
  const netFullNextYear = fullNextYearResult.bestNet

  const scenarioWait: ScenarioBreakdown = {
    gapMonths: gapWaitMonths,
    gapIncome: gapWaitIncome,
    b2bIncome: netFullNextYear,
    total: gapWaitIncome + netFullNextYear,
  }

  const difference = scenarioNow.total - scenarioWait.total
  const recommendation: OpeningTimingResult["recommendation"] =
    Math.abs(difference) < EQUAL_THRESHOLD_EUR ? "equal" : difference > 0 ? "now" : "wait"

  return { scenarioNow, scenarioWait, difference, recommendation }
}
