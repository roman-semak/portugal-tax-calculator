"use client"

import { useEffect, useState } from "react"

interface NumberInputProps {
  value: number
  onChange: (value: number) => void
  className?: string
}

export function NumberInput({ value, onChange, className }: NumberInputProps) {
  const [text, setText] = useState(String(value))

  useEffect(() => {
    if (Number(text) !== value) {
      setText(String(value))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <input
      type="number"
      value={text}
      onChange={(e) => {
        const raw = e.target.value
        setText(raw)
        const parsed = Number(raw)
        if (raw === "") {
          onChange(0)
        } else if (!Number.isNaN(parsed)) {
          onChange(parsed)
        }
      }}
      className={className}
    />
  )
}
