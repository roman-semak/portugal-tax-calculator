"use client"

import { calcAll } from "@/lib/taxEngine"
import type { DeductionInputs } from "@/lib/taxEngine"
import type { SsCategory } from "@/lib/brackets"
import { PriceWithUSD } from "@/components/PriceWithUSD"

interface Props {
  grossAnnual: number
  hasNHR: boolean
  coefficient: number
  ssCategory: SsCategory
  deductions?: DeductionInputs
  displayDivisor?: number
}

const pct = (n: number) => `${(n * 100).toFixed(1)}%`

export function ComparisonTable({
  grossAnnual,
  hasNHR,
  coefficient,
  ssCategory,
  deductions,
  displayDivisor = 12,
}: Props) {
  const years = [1, 2, 3] as const
  const rows = years.map((y) =>
    calcAll({ grossAnnual, activityYear: y, hasNHR, coefficient, ssCategory, deductions })
  )

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 pr-4 font-semibold text-muted-foreground">Рік</th>
            <th className="text-right py-3 px-2 font-semibold text-muted-foreground">IRS FL</th>
            {hasNHR && (
              <th className="text-right py-3 px-2 font-semibold text-muted-foreground">IRS NHR</th>
            )}
            <th className="text-right py-3 px-2 font-semibold text-muted-foreground">Seg. Social</th>
            <th className="text-right py-3 px-2 font-semibold text-muted-foreground">Net FL</th>
            {hasNHR && (
              <th className="text-right py-3 px-2 font-semibold text-muted-foreground">Net NHR</th>
            )}
            <th className="text-right py-3 pl-2 font-semibold text-muted-foreground">Ставка</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const isNHRBetter = hasNHR && r.netNHR > r.netFreelancer
            return (
              <tr
                key={i}
                className="border-b border-border/50 hover:bg-muted/40 transition-colors"
              >
                <td className="py-3 pr-4 font-medium">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-6 h-6 bg-primary/10 text-primary rounded-full text-xs flex items-center justify-center font-bold">
                      {i === 2 ? "3+" : i + 1}
                    </span>
                    {i === 0 && <span className="text-xs text-emerald-600 font-medium">Sem SS</span>}
                  </span>
                </td>
                <td className="py-3 px-2 text-right tabular-nums text-red-600">
                  <PriceWithUSD amountEUR={r.irsFreelancer / displayDivisor} />
                </td>
                {hasNHR && (
                  <td className="py-3 px-2 text-right tabular-nums text-orange-600">
                    <PriceWithUSD amountEUR={r.irsNHR / displayDivisor} />
                  </td>
                )}
                <td className="py-3 px-2 text-right tabular-nums text-amber-600">
                  <PriceWithUSD amountEUR={r.socialSecurity / displayDivisor} />
                </td>
                <td className={`py-3 px-2 text-right tabular-nums font-semibold ${!isNHRBetter ? "text-emerald-600" : "text-foreground"}`}>
                  <PriceWithUSD amountEUR={r.netFreelancer / displayDivisor} />
                </td>
                {hasNHR && (
                  <td className={`py-3 px-2 text-right tabular-nums font-semibold ${isNHRBetter ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>
                    <PriceWithUSD amountEUR={r.netNHR / displayDivisor} />
                  </td>
                )}
                <td className="py-3 pl-2 text-right tabular-nums text-muted-foreground">
                  {pct(isNHRBetter ? r.effectiveRateNHR : r.effectiveRateFL)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
