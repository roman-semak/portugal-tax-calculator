"use client"

import { Slider } from "@/components/ui/slider"
import { NumberInput } from "@/components/ui/number-input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { HelpCircle } from "lucide-react"
import { DeductionInputs } from "@/lib/taxEngine"
import { UI, TOOLTIPS } from "@/lib/constants"
import { PriceWithUSD } from "@/components/PriceWithUSD"

interface Props {
  deductions: DeductionInputs
  onChange: (d: DeductionInputs) => void
  totalDeduction: number
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

export function DeductionsPanel({ deductions, onChange, totalDeduction }: Props) {
  const updateDeduction = <Key extends keyof DeductionInputs>(
    key: Key,
    value: DeductionInputs[Key]
  ) => {
    onChange({ ...deductions, [key]: value })
  }

  return (
    <div className="space-y-3 rounded-lg border border-border/40 bg-muted/20 p-3">
      {/* Marital status */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-widest font-bold">
            {UI.family.statusLabel}
          </Label>
          <TooltipIcon text={TOOLTIPS.familyStatus} />
        </div>
        <div className="flex gap-2">
          {(["single", "married", "single_parent"] as const).map((s) => (
            <button
              key={s}
              onClick={() => updateDeduction("maritalStatus", s)}
              className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                deductions.maritalStatus === s
                  ? "bg-primary text-white border-primary"
                  : "bg-muted border-border/40 text-foreground hover:bg-muted/80"
              }`}
            >
              {UI.family[s === "single_parent" ? "singleParent" : s]}
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Children count */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-widest font-bold">
            {UI.deductions.childrenLabel}
          </Label>
          <TooltipIcon text={TOOLTIPS.children} />
        </div>
        <div className="flex gap-2">
          {([0, 1, 2, 3, 4] as const).map((n) => (
            <button
              key={n}
              onClick={() => updateDeduction("numChildren", n)}
              className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                deductions.numChildren === n
                  ? "bg-primary text-white border-primary"
                  : "bg-muted border-border/40 text-foreground hover:bg-muted/80"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Mortgage interest */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-widest font-bold">
            {UI.deductions.mortgageLabel}
          </Label>
          <TooltipIcon text={TOOLTIPS.mortgage} />
        </div>
        <NumberInput
          value={deductions.mortgageInterest}
          onChange={(v) => updateDeduction("mortgageInterest", v)}
          className="w-full px-3 py-2 bg-muted border border-border/40 rounded-lg text-sm font-semibold text-foreground"
        />
        <Slider
          min={0}
          max={20000}
          step={100}
          value={[deductions.mortgageInterest]}
          onValueChange={(v) => updateDeduction("mortgageInterest", Array.isArray(v) ? v[0] : v)}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>€0</span>
          <span>€20k</span>
        </div>
      </div>

      {/* Health expenses */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-widest font-bold">
            {UI.deductions.healthLabel}
          </Label>
          <TooltipIcon text={TOOLTIPS.health} />
        </div>
        <NumberInput
          value={deductions.healthExpenses}
          onChange={(v) => updateDeduction("healthExpenses", v)}
          className="w-full px-3 py-2 bg-muted border border-border/40 rounded-lg text-sm font-semibold text-foreground"
        />
        <Slider
          min={0}
          max={20000}
          step={100}
          value={[deductions.healthExpenses]}
          onValueChange={(v) => updateDeduction("healthExpenses", Array.isArray(v) ? v[0] : v)}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>€0</span>
          <span>€20k</span>
        </div>
      </div>

      {/* Education expenses */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-widest font-bold">
            {UI.deductions.educationLabel}
          </Label>
          <TooltipIcon text={TOOLTIPS.education} />
        </div>
        <NumberInput
          value={deductions.educationExpenses}
          onChange={(v) => updateDeduction("educationExpenses", v)}
          className="w-full px-3 py-2 bg-muted border border-border/40 rounded-lg text-sm font-semibold text-foreground"
        />
        <Slider
          min={0}
          max={20000}
          step={100}
          value={[deductions.educationExpenses]}
          onValueChange={(v) => updateDeduction("educationExpenses", Array.isArray(v) ? v[0] : v)}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>€0</span>
          <span>€20k</span>
        </div>
      </div>

      <Separator />

      {/* Total deduction summary */}
      {totalDeduction > 0 && (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 flex justify-between items-center">
          <span className="font-bold text-emerald-700 dark:text-emerald-400 uppercase text-[10px] tracking-wider">
            {UI.deductions.totalLabel}
          </span>
          <span className="text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
            <PriceWithUSD amountEUR={totalDeduction} maximumFractionDigits={0} />
          </span>
        </div>
      )}
    </div>
  )
}
