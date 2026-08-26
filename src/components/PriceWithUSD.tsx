"use client"

import { createContext, useContext } from "react"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

interface Props {
  amountEUR: number
  showFull?: boolean
  className?: string
  amountClassName?: string
  usdClassName?: string
  maximumFractionDigits?: number
  reserveUSDSpace?: boolean
  forceHideUSD?: boolean
}

type PriceDisplayContextValue = {
  showUSD: boolean
  setShowUSD: (showUSD: boolean) => void
  rate: number
  loading: boolean
  error: boolean
}

const PriceDisplayContext = createContext<PriceDisplayContextValue>({
  showUSD: false,
  setShowUSD: () => {},
  rate: 1.1,
  loading: false,
  error: true,
})

export function PriceDisplayProvider({
  showUSD,
  setShowUSD,
  rate,
  loading,
  error,
  children,
}: {
  showUSD: boolean
  setShowUSD: (showUSD: boolean) => void
  rate: number
  loading: boolean
  error: boolean
  children: ReactNode
}) {
  return (
    <PriceDisplayContext.Provider value={{ showUSD, setShowUSD, rate, loading, error }}>
      {children}
    </PriceDisplayContext.Provider>
  )
}

export function usePriceDisplay() {
  return useContext(PriceDisplayContext)
}

const fmtDec = (n: number, maximumFractionDigits = 2) =>
  n.toLocaleString("uk-UA", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits,
  })

const fmtUSD = (n: number) =>
  n.toLocaleString("uk-UA", { style: "currency", currency: "USD", maximumFractionDigits: 2 })

export function PriceWithUSD({
  amountEUR,
  showFull = false,
  className,
  amountClassName,
  usdClassName,
  maximumFractionDigits = showFull ? 2 : 0,
  reserveUSDSpace = true,
  forceHideUSD = false,
}: Props) {
  const { showUSD, rate, loading, error } = usePriceDisplay()
  const amountUSD = amountEUR * rate
  const canShowUSD = showUSD && !forceHideUSD && !loading && !error

  return (
    <span className={cn("inline-flex min-h-8 flex-col justify-center leading-tight", className)}>
      <span
        className={cn(
          "font-semibold tabular-nums",
          showFull && "text-lg text-primary",
          amountClassName
        )}
      >
        {fmtDec(amountEUR, maximumFractionDigits)}
      </span>
      {canShowUSD || reserveUSDSpace ? (
        <span
          aria-hidden={!canShowUSD}
          className={cn(
            "min-h-3 text-[10px] tabular-nums text-muted-foreground transition-opacity",
            showFull && "text-[11px]",
            canShowUSD ? "opacity-100" : "opacity-0",
            usdClassName
          )}
        >
          {canShowUSD ? `≈ ${fmtUSD(amountUSD)}` : "≈ $0.00"}
        </span>
      ) : null}
    </span>
  )
}
