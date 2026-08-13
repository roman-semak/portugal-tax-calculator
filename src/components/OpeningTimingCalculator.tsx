"use client"

import { useMemo, useState } from "react"
import { Slider } from "@/components/ui/slider"
import {
  SelectRoot,
  SelectTrigger,
  SelectContent,
  SelectViewport,
  SelectItem,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { HelpCircle } from "lucide-react"
import { calcOpeningTiming } from "@/lib/openingTiming"
import { type DeductionInputs } from "@/lib/taxEngine"
import type { SsCategory } from "@/lib/brackets"
import { PriceWithUSD } from "@/components/PriceWithUSD"
import { UI, TOOLTIPS } from "@/lib/constants"
import { trackEvent, incomeBucket } from "@/lib/analytics"

interface Props {
  grossAnnual: number
  hasNHR: boolean
  coefficient: number
  ssCategory: SsCategory
  deductions?: DeductionInputs
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

export function OpeningTimingCalculator({ grossAnnual, hasNHR, coefficient, ssCategory, deductions }: Props) {
  const { currentMonth, currentYear } = useMemo(() => {
    const d = new Date()
    return { currentMonth: d.getMonth() + 1, currentYear: d.getFullYear() }
  }, [])

  const [openMonth, setOpenMonth] = useState(currentMonth)
  const [contractMonthlyNet, setContractMonthlyNet] = useState(1500)

  const monthOptions = useMemo(
    () => Array.from({ length: 12 - currentMonth + 1 }, (_, i) => currentMonth + i),
    [currentMonth]
  )

  const result = calcOpeningTiming({
    currentMonth,
    openMonth,
    grossAnnual,
    coefficient,
    ssCategory,
    hasNHR,
    contractMonthlyNet,
    deductions,
  })

  function changeOpenMonth(nextMonth: number) {
    setOpenMonth(nextMonth)
    trackEvent("opening_timing_month_change", {
      month: nextMonth,
      income_bucket: incomeBucket(grossAnnual),
    })
  }

  function changeContractMonthlyNet(next: number) {
    setContractMonthlyNet(next)
    trackEvent("opening_timing_contract_change", {
      income_bucket: incomeBucket(grossAnnual),
    })
  }

  const recommendationClassName =
    result.recommendation === "now"
      ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400"
      : result.recommendation === "wait"
        ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-400"
        : "border-border bg-muted/20 text-muted-foreground"

  const recommendationText =
    result.recommendation === "now"
      ? UI.openingTiming.recommendNow(result.difference)
      : result.recommendation === "wait"
        ? UI.openingTiming.recommendWait(-result.difference)
        : UI.openingTiming.recommendEqual

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{UI.openingTiming.monthLabel}</span>
            <TooltipIcon text={TOOLTIPS.openingTimingRolling} />
          </div>
          <SelectRoot
            value={openMonth.toString()}
            onValueChange={(val) => {
              if (val !== null) changeOpenMonth(parseInt(val))
            }}
          >
            <SelectTrigger>
              {UI.months[openMonth - 1]} {currentYear}
            </SelectTrigger>
            <SelectContent>
              <SelectViewport>
                {monthOptions.map((m) => (
                  <SelectItem key={m} value={m.toString()}>
                    {UI.months[m - 1]} {currentYear}
                  </SelectItem>
                ))}
              </SelectViewport>
            </SelectContent>
          </SelectRoot>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">{UI.openingTiming.contractLabel}</span>
            <PriceWithUSD
              amountEUR={contractMonthlyNet}
              maximumFractionDigits={0}
              reserveUSDSpace={false}
              amountClassName="text-base font-bold text-primary"
            />
          </div>
          <Slider
            min={0}
            max={5000}
            step={50}
            value={[contractMonthlyNet]}
            onValueChange={(v) => changeContractMonthlyNet(Array.isArray(v) ? v[0] : v)}
            className="w-full mt-3"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0 €</span>
            <span>5 000 €</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
            {UI.openingTiming.nowCardTitle(`${UI.months[openMonth - 1]} ${currentYear}`)}
          </p>
          <div>
            <PriceWithUSD
              amountEUR={result.scenarioNow.total}
              maximumFractionDigits={0}
              amountClassName="text-xl font-bold"
            />
          </div>
          <div className="text-xs text-muted-foreground border-t border-border/40 pt-1 mt-1 space-y-0.5">
            <p>
              <span className="font-medium">{UI.openingTiming.gapLabel}:</span>{" "}
              <PriceWithUSD amountEUR={result.scenarioNow.gapIncome} maximumFractionDigits={0} reserveUSDSpace={false} />
            </p>
            <p>
              <span className="font-medium">{UI.openingTiming.b2bLabel}:</span>{" "}
              <PriceWithUSD amountEUR={result.scenarioNow.b2bIncome} maximumFractionDigits={0} reserveUSDSpace={false} />
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
            {UI.openingTiming.waitCardTitle(currentYear + 1)}
          </p>
          <div>
            <PriceWithUSD
              amountEUR={result.scenarioWait.total}
              maximumFractionDigits={0}
              amountClassName="text-xl font-bold"
            />
          </div>
          <div className="text-xs text-muted-foreground border-t border-border/40 pt-1 mt-1 space-y-0.5">
            <p>
              <span className="font-medium">{UI.openingTiming.gapLabel}:</span>{" "}
              <PriceWithUSD amountEUR={result.scenarioWait.gapIncome} maximumFractionDigits={0} reserveUSDSpace={false} />
            </p>
            <p>
              <span className="font-medium">{UI.openingTiming.b2bLabel}:</span>{" "}
              <PriceWithUSD amountEUR={result.scenarioWait.b2bIncome} maximumFractionDigits={0} reserveUSDSpace={false} />
            </p>
          </div>
        </div>
      </div>

      <div className={`rounded-lg border p-3 text-center text-sm ${recommendationClassName}`}>
        {recommendationText}
      </div>
    </div>
  )
}
