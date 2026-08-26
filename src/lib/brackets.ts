export const TAX_BRACKETS = [
  { min: 0,     max: 8342,     rate: 0.125 },
  { min: 8343,  max: 12587,    rate: 0.157 },
  { min: 12588, max: 17838,    rate: 0.212 },
  { min: 17839, max: 23089,    rate: 0.241 },
  { min: 23090, max: 29397,    rate: 0.311 },
  { min: 29398, max: 43091,    rate: 0.349 },
  { min: 43092, max: 46567,    rate: 0.431 },
  { min: 46568, max: 86634,    rate: 0.446 },
  { min: 86635, max: Infinity, rate: 0.48 },
]
// OE2026 (Lei n.º 73-A/2025, DR 30/12/2025): пороги проіндексовані на +3.51% відносно
// 2025 року, ставки 2–5 класів знижені на 0.3 в.п. Перевірено по двох незалежних джерелах;
// перед продакшн-використанням звірте з офіційною Portaria/Diário da República.

export type SsCategory = "services" | "goods"

export const ACTIVITY_COEFFICIENTS = [
  { label: "IT / консалтинг / дизайн", value: 0.75, cae: "62010, 62020", ssCategory: "services" },
  { label: "Загальні послуги",          value: 0.35, cae: "—", ssCategory: "services" },
  { label: "Продаж товарів / e-commerce", value: 0.15, cae: "—", ssCategory: "goods" },
  { label: "Крипто-трейдинг",           value: 0.15, cae: "—", ssCategory: "goods" },
  // Крипто-майнінг: класифікація для Segurança Social (serviços vs. produção/venda) не має
  // однозначного офіційного роз'яснення — наближено як "services" до уточнення.
  { label: "Крипто-майнінг",            value: 0.95, cae: "—", ssCategory: "services" },
] as const satisfies ReadonlyArray<{ label: string; value: number; cae: string; ssCategory: SsCategory }>

// IRS-коефіцієнт (Artigo 31.º CIRS, regime simplificado) і SS-коефіцієнт — це ДВІ РІЗНІ речі
// за законом. SS_RATE застосовується не до IRS taxableBase, а до окремого "rendimento
// relevante": 70% доходу від послуг або 20% доходу від продажу товарів (незалежно від
// IRS-коефіцієнта конкретної діяльності). Джерело: seg-social.pt, trabalhadores independentes.
export const SS_RATE = 0.214 // Segurança Social, trabalhadores independentes — 21.4% від rendimento relevante

export const SS_RELEVANT_INCOME_SHARE: Record<SsCategory, number> = {
  services: 0.70,
  goods: 0.20,
}

export const IAS_2026 = 537.13 // Portaria 480-A/2025
export const SS_MIN_MONTHLY = 20 // мінімальний внесок ТІ, €/міс
// Стеля relevant-income бази для ТІ — 12×IAS ≈ €6 445.56 на МІСЯЦЬ (не на рік).
export const SS_MONTHLY_BASE_CAP = 12 * IAS_2026
export const SS_ANNUAL_BASE_CAP = SS_MONTHLY_BASE_CAP * 12 // ≈ €77 346.72/рік

// Art. 70.º CIRS: "mínimo de existência" — оподатковуваний дохід на рівні/нижче цього
// порогу повністю звільнений від IRS (для 2026 значення співпадає з 14×RMMG = 14×€920).
export const MINIMO_EXISTENCIA_2026 = 12880

export const DEDUCTION_RULES = {
  mortgage:  { rate: 0.15, cap: 296 },    // 15% від відсотків, максимум €296 (Art. 78-E CIRS)
  health:    { rate: 0.15, cap: 1000 },   // 15% від витрат, максимум €1 000 (Art. 78-C CIRS)
  education: { rate: 0.30, cap: 800 },    // 30% від витрат, максимум €800 (Art. 78-D CIRS)
  // Art. 78-A CIRS: базовий кредит €600/дитину (>3 років). Реальна шкала також передбачає
  // підвищений кредит €726 для дітей до 3 років і бонус +€900 для 2-ї+ дитини віком до 6
  // років — калькулятор не збирає вік дітей, тому застосовує тільки базову ставку €600.
  // Див. docs/compliance-audit-2026.md, п. 3.
  depCreditPerChild: 600,
} as const

// ── Категорія A (наймана праця, contrato de trabalho) ─────────────────────────
export const TSU_EMPLOYEE_RATE = 0.11   // внесок працівника, DL 89/2013 (regime geral)
export const TSU_EMPLOYER_RATE = 0.2375 // внесок роботодавця (понад gross, не з net працівника)

// Art. 25.º CIRS: спеціальне відрахування = 8.54 × IAS поточного року
export const CATEGORY_A_SPECIFIC_DEDUCTION = 8.54 * IAS_2026 // ≈ €4 587.07 (2026)

export const MEAL_ALLOWANCE_EXEMPT_DAILY = {
  card: 10.46, // €/робочий день, безготівкова картка — звільнено від IRS і TSU
  cash: 6.15,  // €/робочий день, готівкою — звільнено від IRS і TSU
} as const

// Наближення: реальна кількість робочих днів залежить від свят/відпустки конкретного року
// і не збирається калькулятором окремо.
export const WORKING_DAYS_PER_YEAR = 220

export const MINIMUM_WAGE_MONTHLY_2026 = 920 // RMMG, 14 виплат/рік
export const PAYMENTS_PER_YEAR_EMPLOYEE = 14 // 12 місяців + subsídio de férias + subsídio de Natal

// ── ПДВ / IVA (тільки для B2B/ФОП — Категорія B) ───────────────────────────────
export const IVA_STANDARD_RATE = 0.23 // стандартна ставка, Continente (Açores 16%, Madeira 22% не моделюються)
// Art. 53.º CIVA, regime de isenção — поріг піднято з €14 500 до €15 000 (Lei n.º 24-D/2022, з 2025).
export const IVA_EXEMPTION_THRESHOLD = 15000
// Допуск 25%: до цієї стелі перехід на звичайний режим ПДВ відкладається до 1 січня
// наступного року; вище — перехід стається негайно, у тому ж році.
export const IVA_EXEMPTION_TOLERANCE_CEILING = 18750
