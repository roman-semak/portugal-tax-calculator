"use client"

import { useState } from "react"
import { Slider } from "@/components/ui/slider"
import { findRequiredGross } from "@/lib/reverseCalc"
import { type DeductionInputs, type VatPayer } from "@/lib/taxEngine"
import { IVA_STANDARD_RATE, type SsCategory } from "@/lib/brackets"
import { PriceWithUSD } from "@/components/PriceWithUSD"
import { UI } from "@/lib/constants"

interface Props {
  activityYear: 1 | 2 | 3
  hasNHR: boolean
  coefficient: number
  ssCategory: SsCategory
  deductions?: DeductionInputs
  vatEnabled?: boolean
  vatPayer?: VatPayer
}

export function ReverseCalculator({
  activityYear,
  hasNHR,
  coefficient,
  ssCategory,
  deductions,
  vatEnabled = false,
  vatPayer = "client",
}: Props) {
  const [targetNet, setTargetNet] = useState(5000)

  const result = findRequiredGross(targetNet, activityYear, hasNHR, coefficient, ssCategory, deductions)
  const saving = result.grossFL - result.grossNHR
  const nhrCardClassName = hasNHR
    ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-400"
    : "border-border bg-muted/20 text-muted-foreground opacity-60"

  // Знайдений gross — це завжди оподатковувана сума. Якщо ПДВ увімкнений, показуємо, яку
  // суму треба фактично виставити/погодити з клієнтом, щоб отримати саме цей net.
  const vatInvoiceLabel = vatPayer === "client" ? UI.vat.reverseInvoiceLabel : UI.vat.reverseBudgetLabel
  const vatMultiplier = 1 + IVA_STANDARD_RATE

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Бажаний net / місяць</span>
          <div>
            <PriceWithUSD
              amountEUR={targetNet}
              maximumFractionDigits={0}
              className="items-end"
              amountClassName="text-2xl font-bold text-primary"
            />
          </div>
        </div>
        <Slider
          min={1000}
          max={20000}
          step={250}
          value={[targetNet]}
          onValueChange={(v) => setTargetNet(Array.isArray(v) ? v[0] : v)}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>1 000 €</span>
          <span>20 000 €</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Freelancer режим */}
        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
            Freelancer режим
          </p>
          <div>
            <p className="tabular-nums">
              <PriceWithUSD
                amountEUR={result.grossFL / 12}
                maximumFractionDigits={0}
                amountClassName="text-xl font-bold"
              />
              <span className="text-sm font-normal text-muted-foreground ml-1">/міс</span>
            </p>
          </div>
          <p className="text-xs text-muted-foreground border-t border-border/40 pt-1 mt-1">
            <span className="font-medium">Річно:</span> <PriceWithUSD amountEUR={result.grossFL} />
          </p>
          {vatEnabled && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">{vatInvoiceLabel}:</span>{" "}
              <PriceWithUSD amountEUR={result.grossFL * vatMultiplier} reserveUSDSpace={false} />
            </p>
          )}
        </div>

        {/* NHR режим */}
        <div className={`rounded-xl border p-4 space-y-2 ${nhrCardClassName}`}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-wide font-medium">
              NHR режим
            </p>
            {!hasNHR && (
              <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] leading-4">
                Неактивний: увімкніть NHR зліва
              </span>
            )}
          </div>
          <div>
            <p className="tabular-nums">
              <PriceWithUSD
                amountEUR={result.grossNHR / 12}
                maximumFractionDigits={0}
                amountClassName="text-xl font-bold"
              />
              <span className="text-sm font-normal ml-1">/міс</span>
            </p>
          </div>
          <p className="text-xs border-t border-current/20 pt-1 mt-1">
            <span className="font-medium">Річно:</span> <PriceWithUSD amountEUR={result.grossNHR} />
          </p>
          {vatEnabled && hasNHR && (
            <p className="text-xs">
              <span className="font-medium">{vatInvoiceLabel}:</span>{" "}
              <PriceWithUSD amountEUR={result.grossNHR * vatMultiplier} reserveUSDSpace={false} />
            </p>
          )}
        </div>
      </div>

      {/* Економія з NHR */}
      {hasNHR && saving > 0 && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3 text-center">
          <p className="text-sm text-amber-700 dark:text-amber-400">
            З NHR можна заробляти{" "}
            <strong>
              <PriceWithUSD amountEUR={saving} maximumFractionDigits={0} /> / рік
            </strong>{" "}
            менше
          </p>
        </div>
      )}
    </div>
  )
}
