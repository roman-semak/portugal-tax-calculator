"use client"

import { useEffect, useState } from "react"
import { UI } from "@/lib/constants"

interface ExchangeRate {
  rate: number
  date: string
  loading: boolean
  error: boolean
}

export function useExchangeRate() {
  const [state, setState] = useState<ExchangeRate>({
    rate: 1.1,
    date: new Date().toLocaleDateString("uk-UA"),
    loading: true,
    error: false,
  })

  useEffect(() => {
    const fetchRate = async () => {
      try {
        // Using free API: exchangerate-api.com або openexchangerates
        // Безплатна альтернатива: api.exchangerate-api.com
        const response = await fetch(
          "https://api.exchangerate-api.com/v4/latest/EUR",
          { next: { revalidate: 300 } } // кешування на 5 хв
        )

        if (!response.ok) throw new Error("Failed to fetch")

        const data = await response.json()
        const usdRate = data.rates.USD

        setState({
          rate: usdRate,
          date: new Date().toLocaleDateString("uk-UA"),
          loading: false,
          error: false,
        })
      } catch {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: true,
        }))
      }
    }

    fetchRate()
  }, [])

  return state
}

interface ExchangeToastProps {
  amountEUR: number
}

export function ExchangeRateToast({ amountEUR }: ExchangeToastProps) {
  const { rate, date, loading, error } = useExchangeRate()

  if (error) {
    return (
      <div className="text-xs text-muted-foreground">
        {UI.exchange.error}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="text-xs text-muted-foreground">
        {UI.exchange.loading}
      </div>
    )
  }

  const amountUSD = (amountEUR * rate).toFixed(2)

  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-primary uppercase tracking-widest">
        {UI.exchange.title}
      </p>
      <p className="text-lg font-bold text-foreground">
        ${amountUSD} USD
      </p>
      <p className="text-[10px] text-muted-foreground">
        {UI.exchange.rateLabel(date)} · 1€ = ${rate.toFixed(4)}
      </p>
    </div>
  )
}
