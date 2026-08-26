"use client"

import { useState } from "react"
import type { ReactNode } from "react"
import Link from "next/link"
import { Slider } from "@/components/ui/slider"
import { NumberInput } from "@/components/ui/number-input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { SelectRoot, SelectTrigger, SelectContent, SelectViewport, SelectItem } from "@/components/ui/select"
import { CollapsibleRoot, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import { AlertCircle, HelpCircle, Moon, Sun } from "lucide-react"
import { calcAll, calcVat, type DeductionInputs, type VatPayer } from "@/lib/taxEngine"
import { calcEmployeeAll } from "@/lib/employeeEngine"
import { ACTIVITY_COEFFICIENTS } from "@/lib/brackets"
import { incomeBucket, trackEvent } from "@/lib/analytics"
import { UI, TOOLTIPS } from "@/lib/constants"
import { ComparisonTable } from "@/components/ComparisonTable"
import { BracketVisualizer } from "@/components/BracketVisualizer"
import { ReverseCalculator } from "@/components/ReverseCalculator"
import { OpeningTimingCalculator } from "@/components/OpeningTimingCalculator"
import { ContractComparisonPanel } from "@/components/ContractComparisonPanel"
import { DeductionsPanel } from "@/components/DeductionsPanel"
import { PriceDisplayProvider, PriceWithUSD } from "@/components/PriceWithUSD"
import { useExchangeRate } from "@/components/ExchangeRateToast"

const pct = (n: number) => `${(n * 100).toFixed(1)}%`
const eur = (n: number) => `${Math.round(n).toLocaleString("uk-UA")} €`

type IncomePeriod = "annual" | "monthly"
type ContractType = "freelancer" | "employee"

const periodLabel = {
  annual: "рік",
  monthly: "місяць",
} satisfies Record<IncomePeriod, string>

function SegmentButton({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition-all ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border/40 bg-muted text-foreground hover:bg-muted/80"
      }`}
    >
      {children}
    </button>
  )
}

function TooltipIcon({ text }: { text: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <HelpCircle className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-help transition-colors" />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-sm">{text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark")

  function toggleTheme() {
    const isDark = document.documentElement.classList.contains("dark")
    const nextTheme = isDark ? "light" : "dark"

    setTheme(nextTheme)
    document.documentElement.classList.toggle("dark", nextTheme === "dark")
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Увімкнути світлу тему" : "Увімкнути темну тему"}
      className="gap-2"
    >
      {theme === "dark" ? (
        <Sun className="size-3.5" />
      ) : (
        <Moon className="size-3.5" />
      )}
      <span className="hidden sm:inline">
        {theme === "dark" ? "Світла" : "Темна"}
      </span>
    </Button>
  )
}

function Header({
  showUSD,
  setShowUSD,
}: {
  showUSD: boolean
  setShowUSD: (showUSD: boolean) => void
}) {
  return (
    <header className="border-b border-border/60 bg-background/75 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            Portugal Tax Calculator
          </p>
          <p className="hidden text-xs text-muted-foreground sm:block">
            IRS 2026, B2B/Найм, NHR/IFICI
          </p>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/ui"
            className="inline-flex h-7 items-center justify-center rounded-lg px-2.5 text-[0.8rem] font-medium transition-colors hover:bg-muted hover:text-foreground"
          >
            UI
          </Link>
          <Link
            href="/methodology"
            className="inline-flex h-7 items-center justify-center rounded-lg px-2.5 text-[0.8rem] font-medium transition-colors hover:bg-muted hover:text-foreground"
          >
            <span className="sm:hidden">Метод</span>
            <span className="hidden sm:inline">Методологія</span>
          </Link>
          <button
            type="button"
            onClick={() => {
              const nextShowUSD = !showUSD
              setShowUSD(nextShowUSD)
              trackEvent("usd_toggle", { enabled: nextShowUSD })
            }}
            aria-pressed={showUSD}
            className={`inline-flex h-7 items-center gap-1 rounded-lg border px-2 text-[0.75rem] font-semibold transition-colors ${
              showUSD
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-border/40 bg-muted/30 text-muted-foreground hover:text-foreground"
            }`}
          >
            USD
          </button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}

export default function Home() {
  const [incomeAmount, setIncomeAmount] = useState(100000)
  const [incomePeriod, setIncomePeriod] = useState<IncomePeriod>("annual")
  const [showUSD, setShowUSD] = useState(false)
  const { rate, loading: rateLoading, error: rateError } = useExchangeRate()
  const [contractType, setContractType] = useState<ContractType>("freelancer")
  const [activityYear, setActivityYear] = useState<1 | 2 | 3>(1)
  const [hasNHR, setHasNHR] = useState(false)
  const [coeffIdx, setCoeffIdx] = useState(0)
  const [mealAllowanceDaily, setMealAllowanceDaily] = useState(0)
  const [mealAllowanceMethod, setMealAllowanceMethod] = useState<"card" | "cash">("card")
  const [vatEnabled, setVatEnabled] = useState(false)
  const [vatPayer, setVatPayer] = useState<VatPayer>("client")
  const [deductions, setDeductions] = useState<DeductionInputs>({
    maritalStatus: "single",
    mortgageInterest: 0,
    healthExpenses: 0,
    educationExpenses: 0,
    numChildren: 0,
  })

  const isEmployee = contractType === "employee"
  const activity = ACTIVITY_COEFFICIENTS[coeffIdx]
  const coefficient = activity.value
  const ssCategory = activity.ssCategory
  // Freelancer: 12 виплат/рік. Наймана праця: 14 виплат/рік (12 місяців + 2 субсидії).
  const paymentsPerYear = isEmployee ? 14 : 12
  const enteredAmount = incomePeriod === "annual" ? incomeAmount : incomeAmount * paymentsPerYear
  // ПДВ тільки для B2B. "self" перевизначає введену суму як таку, що вже включає ПДВ,
  // тому оподатковуваний grossAnnual нижче за неї — див. calcVat.
  const vat = calcVat(enteredAmount, vatEnabled && !isEmployee, vatPayer)
  const grossAnnual = vat.taxableGrossAnnual

  const freelancerResult = calcAll({ grossAnnual, activityYear, hasNHR, coefficient, ssCategory, deductions })
  const employeeResult = calcEmployeeAll({
    grossAnnual,
    hasIFICI: hasNHR,
    mealAllowanceDaily,
    mealAllowanceMethod,
    deductions,
  })

  // Уніфікований вигляд результату для спільного UI (обидва режими мають однакову форму).
  const view = isEmployee
    ? {
        netAnnual: employeeResult.bestNet,
        irs: employeeResult.bestMode === "ifici" ? employeeResult.irsIFICI : employeeResult.irsStandard,
        solidarity: employeeResult.bestMode === "ifici" ? employeeResult.solidarityIFICI : employeeResult.solidarityStandard,
        socialOrSS: employeeResult.ssEmployee,
        effectiveRate: employeeResult.bestMode === "ifici" ? employeeResult.effectiveRateIFICI : employeeResult.effectiveRateStandard,
        totalDeduction: employeeResult.totalDeduction,
        familyQuotient: employeeResult.familyQuotient,
        taxableBase: employeeResult.taxableIncome,
        isAltApplied: employeeResult.bestMode === "ifici",
        altNetDifference: Math.abs(employeeResult.netIFICI - employeeResult.netStandard),
      }
    : {
        netAnnual: freelancerResult.bestNet,
        irs: freelancerResult.bestMode === "nhr" ? freelancerResult.irsNHR : freelancerResult.irsFreelancer,
        solidarity: freelancerResult.bestMode === "nhr" ? freelancerResult.solidarityNHR : freelancerResult.solidarityFL,
        socialOrSS: freelancerResult.socialSecurity,
        effectiveRate: freelancerResult.bestMode === "nhr" ? freelancerResult.effectiveRateNHR : freelancerResult.effectiveRateFL,
        totalDeduction: freelancerResult.totalDeduction,
        familyQuotient: freelancerResult.familyQuotient,
        taxableBase: freelancerResult.taxableBaseReduced,
        isAltApplied: freelancerResult.bestMode === "nhr",
        altNetDifference: Math.abs(freelancerResult.netNHR - freelancerResult.netFreelancer),
      }
  const isNhrApplied = hasNHR && view.isAltApplied
  const altLabel = "NHR / IFICI"
  const nhrExplanation = isNhrApplied
    ? `${altLabel} застосовується, бо при поточному доході та налаштуваннях він дає більший net. Різниця: приблизно ${eur(view.altNetDifference)} на рік.`
    : `${altLabel} увімкнений, але зараз не застосовується, бо стандартний режим дає більший або такий самий net. Різниця: приблизно ${eur(view.altNetDifference)} на рік.`
  const netAnnual = view.netAnnual
  const displayDivisor = incomePeriod === "annual" ? 1 : 12
  const inputMax = incomePeriod === "annual" ? 300000 : 25000
  const inputMin = incomePeriod === "annual" ? 10000 : 1000
  const inputStep = incomePeriod === "annual" ? 1000 : 250

  function changeIncomePeriod(nextPeriod: IncomePeriod) {
    if (nextPeriod === incomePeriod) return
    trackEvent("income_period_change", {
      from: incomePeriod,
      to: nextPeriod,
      income_bucket: incomeBucket(grossAnnual),
    })
    setIncomeAmount((value) => nextPeriod === "annual" ? value * paymentsPerYear : value / paymentsPerYear)
    setIncomePeriod(nextPeriod)
  }

  function changeContractType(nextType: ContractType) {
    if (nextType === contractType) return
    trackEvent("contract_type_change", {
      from: contractType,
      to: nextType,
      income_bucket: incomeBucket(grossAnnual),
    })
    setContractType(nextType)
  }

  function changeActivityYear(nextYear: 1 | 2 | 3) {
    setActivityYear(nextYear)
    trackEvent("activity_year_change", {
      year: nextYear,
      income_bucket: incomeBucket(grossAnnual),
    })
  }

  function changeNhr(nextHasNHR: boolean) {
    setHasNHR(nextHasNHR)
    trackEvent("nhr_toggle", {
      enabled: nextHasNHR,
      currently_applied: nextHasNHR && view.isAltApplied,
      income_bucket: incomeBucket(grossAnnual),
    })
  }

  function changeActivityType(nextCoeffIdx: number) {
    setCoeffIdx(nextCoeffIdx)
    trackEvent("activity_type_change", {
      coefficient: ACTIVITY_COEFFICIENTS[nextCoeffIdx].value,
      income_bucket: incomeBucket(grossAnnual),
    })
  }

  function changeVatEnabled(nextEnabled: boolean) {
    setVatEnabled(nextEnabled)
    trackEvent("vat_toggle", {
      enabled: nextEnabled,
      payer: vatPayer,
      income_bucket: incomeBucket(grossAnnual),
    })
  }

  function changeVatPayer(nextPayer: VatPayer) {
    setVatPayer(nextPayer)
    trackEvent("vat_payer_change", {
      payer: nextPayer,
      income_bucket: incomeBucket(grossAnnual),
    })
  }

  return (
    <PriceDisplayProvider showUSD={showUSD} setShowUSD={setShowUSD} rate={rate} loading={rateLoading} error={rateError}>
      <div className="gradient-hero min-h-screen">
        <Header showUSD={showUSD} setShowUSD={setShowUSD} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* ── Hero ─────────────────────────────────────────────── */}
        {/* <div className="mb-12 pt-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-primary leading-tight mb-2">
            {UI.hero.title}{" "}
            <span className="text-primary">{UI.hero.subtitle}</span>
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-2xl">
            {UI.hero.description}
          </p>
        </div> */}

        {/* ── Main 2-column layout ───────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">

          {/* ── LEFT: Inputs ─────────────────────────────────── */}
          <div className="lg:col-span-1">
            <Card className="shadow-lg border-border/60 sticky top-8">
              <CardContent className="pt-6 space-y-5">

                {/* Contract type */}
                <div className="space-y-2.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-widest font-bold">
                    {UI.contractType.label}
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <SegmentButton
                      active={contractType === "freelancer"}
                      onClick={() => changeContractType("freelancer")}
                    >
                      {UI.contractType.freelancer}
                    </SegmentButton>
                    <SegmentButton
                      active={contractType === "employee"}
                      onClick={() => changeContractType("employee")}
                    >
                      {UI.contractType.employee}
                    </SegmentButton>
                  </div>
                </div>

                <Separator />

                {/* Income input */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-widest font-bold">
                      {isEmployee ? UI.inputs.grossLabelEmployee : "Дохід"}
                    </Label>
                    <TooltipIcon text={isEmployee ? UI.inputs.grossHelperEmployee : TOOLTIPS.grossIncome} />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <SegmentButton
                      active={incomePeriod === "annual"}
                      onClick={() => changeIncomePeriod("annual")}
                    >
                      На рік
                    </SegmentButton>
                    <SegmentButton
                      active={incomePeriod === "monthly"}
                      onClick={() => changeIncomePeriod("monthly")}
                    >
                      На місяць
                    </SegmentButton>
                  </div>

                  <NumberInput
                    value={Math.round(incomeAmount)}
                    onChange={setIncomeAmount}
                    className="w-full px-4 py-3 bg-muted border border-border/40 rounded-lg text-lg font-semibold text-foreground"
                  />
                  <Slider
                    min={inputMin}
                    max={inputMax}
                    step={inputStep}
                    value={[incomeAmount]}
                    onValueChange={(v) => setIncomeAmount(Array.isArray(v) ? v[0] : v)}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{inputMin.toLocaleString("uk-UA")} €</span>
                    <span>{inputMax.toLocaleString("uk-UA")} €</span>
                  </div>

                  {showUSD && (
                    <div className="space-y-2 pt-2 border-t border-border/40">
                      <Label className="text-xs text-muted-foreground uppercase tracking-widest font-bold">
                        {UI.inputs.usdLabel}
                      </Label>
                      <input
                        type="number"
                        value={Math.round(incomeAmount * rate)}
                        onChange={(e) => setIncomeAmount(Number(e.target.value) / rate)}
                        className="w-full px-4 py-3 bg-muted border border-border/40 rounded-lg text-lg font-semibold text-foreground"
                      />
                    </div>
                  )}
                </div>

                <Separator />

                {/* Activity year (freelancer only) */}
                {!isEmployee && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-widest font-bold">
                      {UI.inputs.yearLabel}
                    </Label>
                    <TooltipIcon text={TOOLTIPS.activityYear} />
                  </div>
                  <div className="flex gap-2">
                    {([1, 2, 3] as const).map((y) => (
                      <button
                        key={y}
                        onClick={() => changeActivityYear(y)}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all border ${
                          activityYear === y
                            ? "bg-primary text-white border-primary"
                            : "bg-muted border-border/40 text-foreground hover:bg-muted/80"
                        }`}
                      >
                        {y === 3 ? "3+" : y} {y === 1 ? "рік" : "рік"}
                      </button>
                    ))}
                  </div>
                </div>
                )}

                {/* NHR */}
                <div
                  className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                    hasNHR
                      ? "border-amber-500/50 bg-amber-500/10"
                      : "border-border/40 bg-muted/50"
                  }`}
                >
                  <Switch
                    id="nhr"
                    checked={hasNHR}
                    onCheckedChange={changeNhr}
                    className="data-checked:bg-amber-500"
                  />
                  <div className="flex-1 flex items-center gap-2">
                    <Label
                      htmlFor="nhr"
                      className={`cursor-pointer text-sm font-medium ${
                        hasNHR ? "text-amber-700 dark:text-amber-400" : ""
                      }`}
                    >
                      {UI.inputs.nhrLabel}
                      <span
                        className={`ml-1 text-xs ${
                          hasNHR ? "text-amber-700/80 dark:text-amber-300/80" : "text-muted-foreground"
                        }`}
                      >
                        ({UI.inputs.nhrDescription})
                      </span>
                    </Label>
                    <TooltipIcon text={TOOLTIPS.nhr} />
                  </div>
                </div>

                {/* Activity type (freelancer only) */}
                {!isEmployee && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-widest font-bold">
                      {UI.inputs.activityLabel}
                    </Label>
                    <TooltipIcon text={TOOLTIPS.activityYear} />
                  </div>
                  <SelectRoot
                    value={coeffIdx.toString()}
                    onValueChange={(val) => {
                      if (val !== null) {
                        changeActivityType(parseInt(val))
                      }
                    }}
                  >
                    <SelectTrigger>
                      {ACTIVITY_COEFFICIENTS[coeffIdx].label.split(" / ")[0]}
                      <span className="text-xs text-muted-foreground ml-1">
                        {(ACTIVITY_COEFFICIENTS[coeffIdx].value * 100).toFixed(0)}%
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectViewport>
                        {ACTIVITY_COEFFICIENTS.map((a, i) => (
                          <SelectItem
                            key={i}
                            value={i.toString()}
                            className="cursor-pointer"
                          >
                            <div className="flex items-center justify-between gap-3 w-full">
                              <span>{a.label}</span>
                              <span className="text-xs text-muted-foreground">
                                {(a.value * 100).toFixed(0)}%
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectViewport>
                    </SelectContent>
                  </SelectRoot>
                </div>
                )}

                {/* VAT / IVA (freelancer only) */}
                {!isEmployee && (
                <div className="space-y-2.5">
                  <div
                    className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                      vatEnabled
                        ? "border-primary/50 bg-primary/10"
                        : "border-border/40 bg-muted/50"
                    }`}
                  >
                    <Switch
                      id="vat"
                      checked={vatEnabled}
                      onCheckedChange={changeVatEnabled}
                    />
                    <div className="flex-1 flex items-center gap-2">
                      <Label htmlFor="vat" className="cursor-pointer text-sm font-medium">
                        {UI.vat.switchLabel}
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({UI.vat.switchDescription})
                        </span>
                      </Label>
                      <TooltipIcon text={TOOLTIPS.vat} />
                    </div>
                  </div>

                  {vatEnabled && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground uppercase tracking-widest font-bold">
                          {UI.vat.payerLabel}
                        </Label>
                        <TooltipIcon text={vatPayer === "client" ? TOOLTIPS.vatPayerClient : TOOLTIPS.vatPayerSelf} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <SegmentButton
                          active={vatPayer === "client"}
                          onClick={() => changeVatPayer("client")}
                        >
                          {UI.vat.payerClient}
                        </SegmentButton>
                        <SegmentButton
                          active={vatPayer === "self"}
                          onClick={() => changeVatPayer("self")}
                        >
                          {UI.vat.payerSelf}
                        </SegmentButton>
                      </div>
                    </div>
                  )}
                </div>
                )}

                {/* Meal allowance (employee only) */}
                {isEmployee && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-widest font-bold">
                      {UI.employee.mealAllowanceLabel}
                    </Label>
                    <TooltipIcon text={UI.employee.mealAllowanceHelper} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <SegmentButton
                      active={mealAllowanceMethod === "card"}
                      onClick={() => setMealAllowanceMethod("card")}
                    >
                      {UI.employee.mealAllowanceMethodCard}
                    </SegmentButton>
                    <SegmentButton
                      active={mealAllowanceMethod === "cash"}
                      onClick={() => setMealAllowanceMethod("cash")}
                    >
                      {UI.employee.mealAllowanceMethodCash}
                    </SegmentButton>
                  </div>
                  <NumberInput
                    value={mealAllowanceDaily}
                    onChange={setMealAllowanceDaily}
                    className="w-full px-3 py-2 bg-muted border border-border/40 rounded-lg text-sm font-semibold text-foreground"
                  />
                </div>
                )}

                <Separator />

                {/* Deductions Panel */}
                <CollapsibleRoot defaultOpen={false}>
                  <CollapsibleTrigger className="rounded-lg border border-border/40 bg-muted/30 px-3 py-2 text-sm">
                    {UI.deductions.sectionLabel}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="data-open:pt-3 [&>div]:px-0 [&>div]:py-0">
                    <DeductionsPanel
                      deductions={deductions}
                      onChange={setDeductions}
                      totalDeduction={view.totalDeduction}
                    />
                  </CollapsibleContent>
                </CollapsibleRoot>

              </CardContent>
            </Card>
          </div>

          {/* ── RIGHT: Results ─────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Main result with accent line */}
            <Card className={`relative shadow-lg overflow-hidden ${isNhrApplied ? "border-amber-500/50" : "border-border/60"}`}>
              <div className={`absolute inset-y-0 left-0 w-2 ${isNhrApplied ? "bg-amber-500" : "bg-primary"}`} />
              <CardContent className="p-0">
                <div>
                  <div className="py-3 pl-5 pr-3 sm:pl-7 sm:pr-4">
                    <div className="mx-auto flex max-w-3xl flex-col items-center gap-3">
                      {/* Income summary */}
                      <div className="w-full space-y-1 rounded-lg bg-muted/25 p-1">
                        {view.familyQuotient > 1.0 && (
                          <div className="flex justify-center gap-1.5 px-2 pt-1">
                            <Badge className="bg-emerald-600 text-white text-[10px] h-5 px-1.5" title={TOOLTIPS.familyQuotient}>
                              Коеф. {view.familyQuotient.toFixed(2)}
                            </Badge>
                          </div>
                        )}
                        {[
                          {
                            label: "За рік",
                            period: "annual" as const,
                            net: netAnnual,
                            gross: grossAnnual,
                          },
                          {
                            label: "За місяць",
                            period: "monthly" as const,
                            net: netAnnual / 12,
                            gross: grossAnnual / 12,
                          },
                        ].map((row) => {
                          const isActive = incomePeriod === row.period

                          return (
                            <div
                              key={row.period}
                              className={`grid gap-2 rounded-lg px-2.5 py-2 sm:grid-cols-[0.7fr_1fr_1fr] sm:items-center ${
                                isActive
                                  ? `bg-card shadow-sm ring-1 ${isNhrApplied ? "ring-amber-500/35" : "ring-primary/25"}`
                                  : "bg-transparent"
                              }`}
                            >
                              <span className={`text-xs font-semibold uppercase tracking-widest ${
                                isActive
                                  ? isNhrApplied ? "text-amber-700 dark:text-amber-300" : "text-primary"
                                  : "text-muted-foreground"
                              }`}>
                                {row.label}
                              </span>
                              <div className="min-w-0 sm:text-right">
                                <span className="mb-0.5 block text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                                  Net
                                </span>
                                <PriceWithUSD
                                  amountEUR={row.net}
                                  showFull={isActive}
                                  maximumFractionDigits={0}
                                  className="items-start sm:items-end"
                                  amountClassName={isActive ? "text-2xl leading-none" : "text-sm text-foreground"}
                                />
                              </div>
                              <div className="min-w-0 sm:text-right">
                                <span className="mb-0.5 block text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                                  Gross
                                </span>
                                <PriceWithUSD
                                  amountEUR={row.gross}
                                  maximumFractionDigits={0}
                                  className="items-start sm:items-end"
                                  amountClassName="text-sm text-foreground"
                                />
                              </div>
                            </div>
                          )
                        })}
                        <div className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs">
                          <span className="font-bold uppercase tracking-widest text-muted-foreground">
                            Ставка
                          </span>
                          <span className={`text-lg font-bold ${isNhrApplied ? "text-amber-700 dark:text-amber-300" : "text-primary"}`}>
                            {pct(view.effectiveRate)}
                          </span>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {isEmployee && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-muted/30 px-4 py-3 text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  {UI.employee.employerCostLabel}
                  <TooltipIcon text={UI.employee.employerCostHelper} />
                </span>
                <span className="font-semibold tabular-nums">
                  <PriceWithUSD amountEUR={employeeResult.employerCostMonthly} maximumFractionDigits={0} reserveUSDSpace={false} /> / міс
                </span>
              </div>
            )}

            {!isEmployee && vatEnabled && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  {vatPayer === "client" ? UI.vat.invoiceLineLabel : UI.vat.withheldLineLabel}
                  <TooltipIcon text={vatPayer === "client" ? TOOLTIPS.vatPayerClient : TOOLTIPS.vatPayerSelf} />
                </span>
                <span className="font-semibold tabular-nums">
                  <PriceWithUSD
                    amountEUR={vatPayer === "client" ? vat.invoicedAmount / displayDivisor : vat.vatAmount / displayDivisor}
                    maximumFractionDigits={0}
                    reserveUSDSpace={false}
                  /> / {periodLabel[incomePeriod]}
                </span>
              </div>
            )}

            <Card className="shadow-lg border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Податки та деталізація</CardTitle>
                <CardDescription className="text-xs">
                  Дані показані за {periodLabel[incomePeriod]}, шкала рахується від річного gross.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs
                  defaultValue="overview"
                  onValueChange={(tab) => {
                    trackEvent("tax_detail_tab_change", {
                      tab,
                      income_bucket: incomeBucket(grossAnnual),
                      contract_type: contractType,
                    })
                  }}
                >
                  <TabsList className="w-full bg-muted border border-border/40">
                    <TabsTrigger value="overview" className="text-xs sm:text-sm">
                      Огляд
                    </TabsTrigger>
                    {!isEmployee && (
                    <TabsTrigger value="reverse" className="text-xs sm:text-sm">
                      {UI.tabs.reverse}
                    </TabsTrigger>
                    )}
                    {!isEmployee && (
                    <TabsTrigger value="years" className="text-xs sm:text-sm">
                      По роках
                    </TabsTrigger>
                    )}
                    {!isEmployee && (
                    <TabsTrigger value="timing" className="text-xs sm:text-sm">
                      {UI.tabs.timing}
                    </TabsTrigger>
                    )}
                    <TabsTrigger value="brackets" className="text-xs sm:text-sm">
                      Шкала ПДФО
                    </TabsTrigger>
                    <TabsTrigger value="comparison" className="text-xs sm:text-sm">
                      {UI.tabs.comparison}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="mt-5">
                    <div className="space-y-3">
                      <div className="mx-auto flex h-3 max-w-2xl overflow-hidden rounded-full bg-muted">
                        {[
                          {
                            label: UI.results.totalNet,
                            value: view.netAnnual,
                            color: "bg-emerald-500",
                          },
                          {
                            label: UI.results.pdfoPD,
                            value: view.irs,
                            color: "bg-red-500",
                          },
                          {
                            label: UI.results.socialContribution,
                            value: view.socialOrSS,
                            color: "bg-amber-500",
                          },
                          {
                            label: UI.results.solidarityTax,
                            value: view.solidarity,
                            color: "bg-orange-500",
                          },
                        ].map((segment) =>
                          segment.value > 0 ? (
                            <div
                              key={segment.label}
                              className={segment.color}
                              style={{ width: `${(segment.value / grossAnnual) * 100}%` }}
                              title={`${segment.label}: ${pct(segment.value / grossAnnual)}`}
                            />
                          ) : null
                        )}
                      </div>
                      <div className="flex flex-wrap justify-center gap-1.5">
                        {[
                          {
                            label: "Net / Gross",
                            value: {
                              net: view.netAnnual / displayDivisor,
                              gross: grossAnnual / displayDivisor,
                            },
                            share: view.netAnnual / grossAnnual,
                            color: "text-emerald-600 dark:text-emerald-400",
                            chip: "border-emerald-500/25 bg-emerald-500/10",
                          },
                          {
                            label: UI.results.pdfoPD,
                            value: view.irs / displayDivisor,
                            share: view.irs / grossAnnual,
                            color: "text-red-600 dark:text-red-400",
                            chip: "border-red-500/25 bg-red-500/10",
                            tooltip: TOOLTIPS.pdfo,
                          },
                          {
                            label: UI.results.socialContribution,
                            value: view.socialOrSS / displayDivisor,
                            share: view.socialOrSS / grossAnnual,
                            color: "text-amber-600 dark:text-amber-400",
                            chip: "border-amber-500/25 bg-amber-500/10",
                            tooltip: isEmployee ? TOOLTIPS.employeeSS : TOOLTIPS.socialContribution,
                          },
                          {
                            label: UI.results.solidarityTax,
                            value: view.solidarity / displayDivisor,
                            share: view.solidarity / grossAnnual,
                            color: "text-orange-500",
                            chip: "border-orange-500/25 bg-orange-500/10",
                          },
                          ...(view.totalDeduction > 0 && !view.isAltApplied ? [{
                            label: UI.deductions.totalLabel,
                            value: -view.totalDeduction / displayDivisor,
                            share: view.totalDeduction / grossAnnual,
                            color: "text-emerald-600 dark:text-emerald-400",
                            chip: "border-emerald-500/25 bg-emerald-500/10",
                          }] : []),
                        ].map((row) => {
                          const compoundValue = typeof row.value === "object" ? row.value : null
                          const isEmpty = compoundValue
                            ? compoundValue.net === 0 && compoundValue.gross === 0
                            : row.value === 0

                          return (
                            <div
                              key={row.label}
                              className={`relative inline-flex min-w-34 flex-col rounded-lg border px-2.5 py-1.5 pb-4 ${
                                isEmpty ? "border-border/40 bg-muted/20 opacity-60" : row.chip
                              }`}
                            >
                              <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                                {row.label}
                                {"tooltip" in row && row.tooltip ? (
                                  <TooltipIcon text={row.tooltip} />
                                ) : null}
                              </span>
                              {compoundValue ? (
                                <div className="mt-1.5 text-xs leading-tight">
                                  <div className={`flex items-baseline ${isEmpty ? "text-muted-foreground" : row.color}`}>
                                    <span className="mr-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                                      Net
                                    </span>
                                    <PriceWithUSD
                                      amountEUR={compoundValue.net}
                                      className="min-h-0"
                                      reserveUSDSpace={false}
                                      forceHideUSD
                                    />
                                  </div>
                                  <div className={`flex items-baseline ${isEmpty ? "text-muted-foreground" : "text-foreground"}`}>
                                    <span className="mr-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                                      Gross
                                    </span>
                                    <PriceWithUSD
                                      amountEUR={compoundValue.gross}
                                      className="min-h-0"
                                      reserveUSDSpace={false}
                                      forceHideUSD
                                    />
                                  </div>
                                </div>
                              ) : (
                                <div className={`${isEmpty ? "text-muted-foreground" : row.color} mt-1 text-xs`}>
                                  <PriceWithUSD
                                    amountEUR={typeof row.value === "number" ? row.value : 0}
                                    reserveUSDSpace={false}
                                    forceHideUSD
                                  />
                                </div>
                              )}
                              <span className="absolute bottom-1 right-2 text-[9px] text-muted-foreground">
                                {pct(row.share)}
                              </span>
                            </div>
                          )
                        })}
                      </div>

                      {view.familyQuotient > 1.0 && (
                        <div className="mx-auto flex max-w-xl justify-between items-center gap-3 rounded-lg bg-emerald-50 px-2 py-2 text-xs border border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/40">
                          <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                            Сімейний коефіцієнт: {view.familyQuotient.toFixed(2)}
                          </span>
                          <span className="text-right text-[10px] text-emerald-600 dark:text-emerald-500">
                            {TOOLTIPS.familyQuotient}
                          </span>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {!isEmployee && (
                  <TabsContent value="reverse" className="mt-5">
                    <ReverseCalculator
                      activityYear={activityYear}
                      hasNHR={hasNHR}
                      coefficient={coefficient}
                      ssCategory={ssCategory}
                      deductions={deductions}
                      vatEnabled={vatEnabled}
                      vatPayer={vatPayer}
                    />
                  </TabsContent>
                  )}

                  {!isEmployee && (
                  <TabsContent value="years" className="mt-5">
                    <ComparisonTable
                      grossAnnual={grossAnnual}
                      hasNHR={hasNHR}
                      coefficient={coefficient}
                      ssCategory={ssCategory}
                      deductions={deductions}
                      displayDivisor={displayDivisor}
                    />
                  </TabsContent>
                  )}

                  {!isEmployee && (
                  <TabsContent value="timing" className="mt-5">
                    <OpeningTimingCalculator
                      grossAnnual={grossAnnual}
                      hasNHR={hasNHR}
                      coefficient={coefficient}
                      ssCategory={ssCategory}
                      deductions={deductions}
                    />
                  </TabsContent>
                  )}

                  <TabsContent value="brackets" className="mt-5">
                    <BracketVisualizer taxableIncome={view.taxableBase} />
                  </TabsContent>

                  <TabsContent value="comparison" className="mt-5">
                    <ContractComparisonPanel />
                  </TabsContent>
                </Tabs>

                {hasNHR && (
                  <div className={`mt-5 rounded-lg border px-3 py-2 text-xs leading-5 ${
                    isNhrApplied
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200"
                      : "border-border/60 bg-muted/30 text-muted-foreground"
                  }`}>
                    <p className="font-semibold">
                      {isNhrApplied ? `${altLabel} активний у розрахунку` : `${altLabel} увімкнений, але не застосований`}
                    </p>
                    <p>{nhrExplanation}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Warning if high tax bracket */}
            {view.effectiveRate > 0.35 && (
              <div className="flex gap-3 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-red-900 dark:text-red-400 mb-1">
                    {UI.results.warningTitle}
                  </p>
                  <p className="text-red-800 dark:text-red-300">
                    {UI.results.warningText(view.effectiveRate)}
                  </p>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* ── Footer ───────────────────────────────────────────── */}
        <footer className="text-center py-8 border-t border-border/20 text-xs text-muted-foreground">
          <p>{UI.footer.copyright}</p>
        </footer>

        </main>
      </div>
    </PriceDisplayProvider>
  )
}
