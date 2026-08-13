import {
  calcIRS_NHR,
  calcSolidaritySurcharge,
  applyMarriedSplit,
  calcDependentTaxCredit,
  type DeductionInputs,
} from "./taxEngine"
import {
  DEDUCTION_RULES,
  TSU_EMPLOYEE_RATE,
  TSU_EMPLOYER_RATE,
  CATEGORY_A_SPECIFIC_DEDUCTION,
  MEAL_ALLOWANCE_EXEMPT_DAILY,
  WORKING_DAYS_PER_YEAR,
} from "./brackets"

export interface EmployeeInputs {
  grossAnnual: number // сума 14 виплат (12 місяців + 2 субсидії), не 12×monthly
  hasIFICI: boolean
  ificiRate?: number
  mealAllowanceDaily: number
  mealAllowanceMethod: "card" | "cash"
  deductions?: DeductionInputs
}

export interface EmployeeResult {
  grossAnnual: number
  ssEmployee: number
  specificDeduction: number
  mealAllowanceExempt: number
  mealAllowanceTaxable: number
  taxableIncome: number
  irsStandard: number
  irsIFICI: number
  solidarityStandard: number
  solidarityIFICI: number
  totalTaxStandard: number
  totalTaxIFICI: number
  netStandard: number
  netIFICI: number
  netMonthlyStandard: number
  netMonthlyIFICI: number
  effectiveRateStandard: number
  effectiveRateIFICI: number
  bestMode: "standard" | "ifici"
  bestNet: number
  bestNetMonthly: number
  totalDeduction: number
  familyQuotient: number
  employerTSU: number
  employerCostAnnual: number
  employerCostMonthly: number
}

// Category A (contrato de trabalho) payroll — той самий annual-effective-rate підхід,
// що й у freelancer-рушку (calcAll), а не місячні tabelas de retenção na fonte АТ.
// Це навмисне спрощення: реальна щомісячна утримана сума з зарплати відрізняється від
// офіційних withholding-таблиць, але річний net після acerto de contas (IRS-декларації)
// збігається з цим розрахунком. Див. docs/calculation-methodology.md, розділ 11.
export function calcEmployeeAll(inputs: EmployeeInputs): EmployeeResult {
  const {
    grossAnnual,
    hasIFICI,
    ificiRate = 0.2,
    mealAllowanceDaily,
    mealAllowanceMethod,
    deductions,
  } = inputs

  const ssEmployee = grossAnnual * TSU_EMPLOYEE_RATE

  const exemptDailyCap = MEAL_ALLOWANCE_EXEMPT_DAILY[mealAllowanceMethod]
  const mealAllowanceExempt = Math.min(mealAllowanceDaily, exemptDailyCap) * WORKING_DAYS_PER_YEAR
  const mealAllowanceTaxable = Math.max(0, mealAllowanceDaily - exemptDailyCap) * WORKING_DAYS_PER_YEAR

  const taxableIncome = Math.max(
    0,
    grossAnnual + mealAllowanceTaxable - ssEmployee - CATEGORY_A_SPECIFIC_DEDUCTION
  )

  const {
    maritalStatus = "single",
    mortgageInterest = 0,
    healthExpenses = 0,
    educationExpenses = 0,
    numChildren = 0,
  } = deductions ?? {}

  const deductMortgage = Math.min(
    mortgageInterest * DEDUCTION_RULES.mortgage.rate,
    DEDUCTION_RULES.mortgage.cap
  )
  const deductHealth = Math.min(
    healthExpenses * DEDUCTION_RULES.health.rate,
    DEDUCTION_RULES.health.cap
  )
  const deductEducation = Math.min(
    educationExpenses * DEDUCTION_RULES.education.rate,
    DEDUCTION_RULES.education.cap
  )
  const deductChildren = calcDependentTaxCredit(numChildren)
  const totalDeduction = deductMortgage + deductHealth + deductEducation + deductChildren

  const familyQuotient = maritalStatus === "married" ? 2 : 1
  const grossIRS = applyMarriedSplit(taxableIncome, maritalStatus)
  const irsStandard = Math.max(0, grossIRS - totalDeduction)
  const irsIFICI = calcIRS_NHR(taxableIncome, ificiRate)

  const solidarityStandard = calcSolidaritySurcharge(taxableIncome)
  const solidarityIFICI = calcSolidaritySurcharge(taxableIncome)

  const totalTaxStandard = irsStandard + solidarityStandard
  const totalTaxIFICI = irsIFICI + solidarityIFICI

  const netStandard = grossAnnual - totalTaxStandard - ssEmployee
  const netIFICI = grossAnnual - totalTaxIFICI - ssEmployee

  const bestMode: "standard" | "ifici" = (hasIFICI && netIFICI > netStandard) ? "ifici" : "standard"
  const bestNet = bestMode === "ifici" ? netIFICI : netStandard

  const employerTSU = grossAnnual * TSU_EMPLOYER_RATE
  const employerCostAnnual = grossAnnual + employerTSU

  return {
    grossAnnual,
    ssEmployee,
    specificDeduction: CATEGORY_A_SPECIFIC_DEDUCTION,
    mealAllowanceExempt,
    mealAllowanceTaxable,
    taxableIncome,
    irsStandard,
    irsIFICI,
    solidarityStandard,
    solidarityIFICI,
    totalTaxStandard,
    totalTaxIFICI,
    netStandard,
    netIFICI,
    netMonthlyStandard: netStandard / 12,
    netMonthlyIFICI: netIFICI / 12,
    effectiveRateStandard: grossAnnual > 0 ? totalTaxStandard / grossAnnual : 0,
    effectiveRateIFICI: grossAnnual > 0 ? totalTaxIFICI / grossAnnual : 0,
    bestMode,
    bestNet,
    bestNetMonthly: bestNet / 12,
    totalDeduction,
    familyQuotient,
    employerTSU,
    employerCostAnnual,
    employerCostMonthly: employerCostAnnual / 12,
  }
}
