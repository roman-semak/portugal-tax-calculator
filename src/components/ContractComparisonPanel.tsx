"use client"

import { UI } from "@/lib/constants"

export function ContractComparisonPanel() {
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 pr-4 font-semibold text-muted-foreground w-1/4">
                &nbsp;
              </th>
              <th className="text-left py-3 px-3 font-semibold text-muted-foreground">
                {UI.comparison.columnFreelancer}
              </th>
              <th className="text-left py-3 pl-3 font-semibold text-muted-foreground">
                {UI.comparison.columnEmployee}
              </th>
            </tr>
          </thead>
          <tbody>
            {UI.comparison.rows.map((row) => (
              <tr key={row.label} className="border-b border-border/40 last:border-0 align-top">
                <td className="py-3 pr-4 font-medium text-foreground">{row.label}</td>
                <td className="py-3 px-3 text-muted-foreground">{row.freelancer}</td>
                <td className="py-3 pl-3 text-muted-foreground">{row.employee}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">
        {UI.comparison.disclaimer}
      </div>
    </div>
  )
}
