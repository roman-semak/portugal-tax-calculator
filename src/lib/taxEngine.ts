import {
  TAX_BRACKETS,
  DEDUCTION_RULES,
  SS_RATE,
  SS_RELEVANT_INCOME_SHARE,
  SS_MIN_MONTHLY,
  SS_ANNUAL_BASE_CAP,
  MINIMO_EXISTENCIA_2026,
  IVA_STANDARD_RATE,
  type SsCategory,
} from "./brackets"

export interface DeductionInputs {
  maritalStatus: "single" | "married" | "single_parent"
  mortgageInterest: number
  healthExpenses: number
  educationExpenses: number
  numChildren: number
}

export interface TaxInputs {
  grossAnnual: number
  activityYear: 1 | 2 | 3
  hasNHR: boolean
  coefficient: number
  ssCategory: SsCategory
  nhrRate?: number
  deductions?: DeductionInputs
}

export interface TaxResult {
  grossAnnual: number
  taxableBase: number
  taxableBaseReduced: number
  irsFreelancer: number
  irsNHR: number
  solidarityFL: number
  solidarityNHR: number
  totalTaxFL: number
  totalTaxNHR: number
  socialSecurity: number
  netFreelancer: number
  netNHR: number
  netMonthlyFL: number
  netMonthlyNHR: number
  effectiveRateFL: number
  effectiveRateNHR: number
  bestMode: "freelancer" | "nhr"
  bestNet: number
  bestNetMonthly: number
  totalDeduction: number
  familyQuotient: number
}

export function applyNewActivityDiscount(taxableBase: number, activityYear: 1 | 2 | 3): number {
  if (activityYear === 1) return taxableBase * 0.5
  if (activityYear === 2) return taxableBase * 0.75
  return taxableBase
}

export function calcIRS(taxableIncome: number): number {
  let tax = 0
  let remaining = taxableIncome

  for (const bracket of TAX_BRACKETS) {
    if (remaining <= 0) break
    const bracketSize = bracket.max === Infinity
      ? remaining
      : Math.min(remaining, bracket.max - bracket.min + 1)
    const taxableInBracket = Math.min(remaining, bracketSize)
    tax += taxableInBracket * bracket.rate
    remaining -= taxableInBracket
  }

  return tax
}

export function calcIRS_NHR(taxableBase: number, nhrRate = 0.2): number {
  return taxableBase * nhrRate
}

export function calcSolidaritySurcharge(taxableIncome: number): number {
  let surcharge = 0
  if (taxableIncome > 250000) {
    surcharge += (taxableIncome - 250000) * 0.05
    surcharge += (250000 - 80000) * 0.025
  } else if (taxableIncome > 80000) {
    surcharge += (taxableIncome - 80000) * 0.025
  }
  return surcharge
}

// Segurança Social для trabalhadores independentes: 21.4% від "rendimento relevante" —
// 70% доходу від послуг або 20% доходу від продажу товарів. Це ОКРЕМИЙ коефіцієнт від
// IRS Art. 31 coefficient (переданого в TaxInputs.coefficient), не той самий.
export function calcSocialSecurity(grossAnnual: number, ssCategory: SsCategory, activityYear: 1 | 2 | 3): number {
  if (activityYear === 1) return 0
  if (grossAnnual <= 0) return 0

  const relevantIncome = grossAnnual * SS_RELEVANT_INCOME_SHARE[ssCategory]
  const cappedRelevantIncome = Math.min(relevantIncome, SS_ANNUAL_BASE_CAP)
  const contribution = cappedRelevantIncome * SS_RATE

  return Math.max(contribution, SS_MIN_MONTHLY * 12)
}

// Art. 69.º CIRS: спільне оподаткування подружжя ділить taxableBase на 2, рахує IRS від
// половини і множить результат на 2 (quociente conjugal). Діти НЕ впливають на цей
// дільник — вони дають лише окремий податковий кредит, див. calcDependentTaxCredit.
export function applyMarriedSplit(
  taxableBase: number,
  maritalStatus: DeductionInputs["maritalStatus"]
): number {
  // Art. 70.º CIRS — mínimo de existência: дохід на цьому рівні чи нижче повністю
  // звільнений від IRS. Спрощення: поріг не масштабується для married joint taxation.
  if (taxableBase <= MINIMO_EXISTENCIA_2026) return 0
  if (maritalStatus === "married") {
    return calcIRS(taxableBase / 2) * 2
  }
  return calcIRS(taxableBase)
}

// Art. 78-A CIRS: фіксований податковий кредит за утриманця (спрощено — базова ставка
// €600/дитину; вищі ставки для дітей до 3/6 років не моделюються, див. brackets.ts).
export function calcDependentTaxCredit(numChildren: number): number {
  return numChildren * DEDUCTION_RULES.depCreditPerChild
}

export type VatPayer = "client" | "self"

export interface VatResult {
  taxableGrossAnnual: number // йде далі в calcAll як grossAnnual — дохід від послуг без ПДВ
  vatAmount: number          // ПДВ за рік: або нараховується зверху, або утримується з введеної суми
  invoicedAmount: number     // повна сума, що фігурує в рахунку клієнту / проходить через його бюджет
}

// ПДВ ніколи не є доходом ФОП — він або додається зверху до ставки (клієнт платить його
// окремо понад суму), або вираховується з фіксованого бюджету клієнта (ФОП фактично платить
// його сам, і оподатковуваний дохід відповідно зменшується). Перемикач `vatPayer` визначає,
// яке з цих двох тлумачень отримує введена користувачем сума.
export function calcVat(
  enteredAmount: number,
  vatEnabled: boolean,
  vatPayer: VatPayer,
  vatRate = IVA_STANDARD_RATE
): VatResult {
  if (!vatEnabled) {
    return { taxableGrossAnnual: enteredAmount, vatAmount: 0, invoicedAmount: enteredAmount }
  }
  if (vatPayer === "client") {
    const vatAmount = enteredAmount * vatRate
    return { taxableGrossAnnual: enteredAmount, vatAmount, invoicedAmount: enteredAmount + vatAmount }
  }
  const taxableGrossAnnual = enteredAmount / (1 + vatRate)
  return { taxableGrossAnnual, vatAmount: enteredAmount - taxableGrossAnnual, invoicedAmount: enteredAmount }
}

export function calcAll(inputs: TaxInputs): TaxResult {
  const { grossAnnual, activityYear, hasNHR, coefficient, ssCategory, nhrRate = 0.2, deductions } = inputs

  const taxableBase = grossAnnual * coefficient
  const taxableBaseReduced = applyNewActivityDiscount(taxableBase, activityYear)

  // Compute collection deductions (applied to tax amount, not base)
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

  // Art. 69.º quociente conjugal: 2 для married (спільне оподаткування), 1 інакше.
  // Це вже не "family quotient" у старому сенсі — діти на нього не впливають.
  const familyQuotient = maritalStatus === "married" ? 2 : 1
  const grossIRS = applyMarriedSplit(taxableBaseReduced, maritalStatus)

  // Collection deductions applied to tax (not base)
  const irsFreelancer = Math.max(0, grossIRS - totalDeduction)
  const irsNHR        = calcIRS_NHR(taxableBase, nhrRate)

  const solidarityFL  = calcSolidaritySurcharge(taxableBaseReduced)
  const solidarityNHR = calcSolidaritySurcharge(taxableBase)

  const socialSecurity = calcSocialSecurity(grossAnnual, ssCategory, activityYear)

  const totalTaxFL  = irsFreelancer + solidarityFL
  const totalTaxNHR = irsNHR + solidarityNHR

  const netFreelancer = grossAnnual - totalTaxFL - socialSecurity
  const netNHR        = grossAnnual - totalTaxNHR - socialSecurity

  const bestMode = (hasNHR && netNHR > netFreelancer) ? "nhr" : "freelancer"
  const bestNet  = bestMode === "nhr" ? netNHR : netFreelancer

  return {
    grossAnnual,
    taxableBase,
    taxableBaseReduced,
    irsFreelancer,
    irsNHR,
    solidarityFL,
    solidarityNHR,
    totalTaxFL,
    totalTaxNHR,
    socialSecurity,
    netFreelancer,
    netNHR,
    netMonthlyFL:  netFreelancer / 12,
    netMonthlyNHR: netNHR / 12,
    effectiveRateFL:  grossAnnual > 0 ? totalTaxFL  / grossAnnual : 0,
    effectiveRateNHR: grossAnnual > 0 ? totalTaxNHR / grossAnnual : 0,
    bestMode,
    bestNet,
    bestNetMonthly: bestNet / 12,
    totalDeduction,
    familyQuotient,
  }
}
