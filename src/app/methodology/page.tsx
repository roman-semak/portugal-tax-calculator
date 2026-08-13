import type { Metadata } from "next"
import Link from "next/link"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ACTIVITY_COEFFICIENTS, DEDUCTION_RULES, TAX_BRACKETS } from "@/lib/brackets"

export const metadata: Metadata = {
  title: "Методологія розрахунків",
  description:
    "Детальний опис даних, які впливають на розрахунок gross, net, IRS, NHR, Segurança Social, відрахувань і податкового навантаження.",
}

const sources = [
  {
    label: "Portal das Finanças: Códigos Tributários",
    href: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/Pages/default.aspx",
  },
  {
    label: "Código do IRS: Artigo 68.º, taxas gerais",
    href: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/ra/Pages/irs68ra_202412.aspx",
  },
  {
    label: "Código do IRS: Artigo 72.º, NHR 20% (regime encerrado a novos requerentes desde 2024)",
    href: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/ra/Pages/irs72ra_202310.aspx",
  },
  {
    label: "Código do IRS: Artigo 68.º-A, taxa adicional de solidariedade",
    href: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/irs/Pages/irs68a.aspx",
  },
  {
    label: "Código do IRS: Artigo 69.º, quociente conjugal",
    href: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs69.aspx",
  },
  {
    label: "Código do IRS: Artigo 78.º-A, deduções pelos dependentes",
    href: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs78a.aspx",
  },
  {
    label: "Código do IRS: Artigo 25.º, deduções específicas Categoria A",
    href: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs25.aspx",
  },
  {
    label: "Segurança Social: trabalhadores independentes (rendimento relevante 70%/20%)",
    href: "https://www.seg-social.pt/trabalhadores-independentes",
  },
  {
    label: "Lei n.º 73-A/2025 (OE2026): escalões de IRS 2026",
    href: "https://diariodarepublica.pt/",
  },
]

const inputs = [
  {
    name: "Тип контракту",
    effect:
      "B2B/ФОП (Категорія B, `calcAll`) або Найм (Категорія A, `calcEmployeeAll`). Перемикає весь набір інпутів і вихідний рушок — це два незалежні розрахунки, що не діляться проміжними значеннями.",
  },
  {
    name: "Дохід",
    effect:
      "Основна сума, від якої починається розрахунок. У головному інпуті це gross дохід до податків і внесків.",
  },
  {
    name: "Період доходу",
    effect:
      "Перемикач `на рік / на місяць` змінює спосіб введення. Для B2B місячний дохід множиться на 12 виплат/рік, для найму — на 14 (12 місяців + subsídio de férias + subsídio de Natal).",
  },
  {
    name: "Рік активності",
    effect:
      "Тільки для B2B. Податковий період активності; для фізосіб він зазвичай збігається з календарним роком. 1-й період: база IRS 50%, 2-й: 75%, 3-й і далі: повна база. Segurança Social має окреме правило перших 12 місяців.",
  },
  {
    name: "NHR / IFICI",
    effect:
      "Коли увімкнений, калькулятор порівнює стандартний режим з flat rate 20% і показує той, який дає більший net. Застосовується однаково і в B2B, і в режимі найму. Стара програма NHR закрита для нових заявників з 2024 року — актуальна назва режиму IFICI.",
  },
  {
    name: "Тип активності",
    effect:
      "Тільки для B2B. Визначає IRS-коефіцієнт (Art. 31 CIRS) для taxable base та окремо SS-категорію (services/goods) для Segurança Social — це два різні коефіцієнти.",
  },
  {
    name: "Субсидія на харчування",
    effect:
      "Тільки для найму. Звільнена від IRS і TSU до ліміту (€10.46/день картка, €6.15/день готівка); різниця понад ліміт оподатковується як зарплата.",
  },
  {
    name: "Сімейний стан",
    effect:
      "Впливає на family quotient у freelancer IRS. Для single використовується 1.0, для married 2.0 + надбавки за дітей, для single parent окрема шкала.",
  },
  {
    name: "Кількість дітей",
    effect:
      "Впливає на family quotient і додає collection deduction: 600 EUR за дитину або 726 EUR для single parent.",
  },
  {
    name: "Іпотека, медицина, освіта",
    effect:
      "Ці витрати не зменшують gross. Вони зменшують суму IRS після прогресивного розрахунку, у межах лімітів `DEDUCTION_RULES`.",
  },
  {
    name: "USD перемикач",
    effect:
      "Не впливає на податки. Тільки додає приблизний USD еквівалент до сум у EUR через поточний exchange-rate state.",
  },
]

const outputRows = [
  ["grossAnnual", "Річний gross після приведення місячного доходу до року."],
  ["taxableBase", "grossAnnual * coefficient."],
  ["taxableBaseReduced", "taxableBase після знижки 1-го або 2-го року активності."],
  ["irsFreelancer", "Прогресивний IRS після family quotient і collection deductions."],
  ["irsNHR", "NHR IRS: taxableBase * 20%."],
  ["solidarityFL / solidarityNHR", "Додатковий solidarity surcharge для високих taxable income."],
  ["socialSecurity", "Segurança Social: 0 у моделі 1-го року активності, далі min(grossAnnual * ssShare, cap) * 21.4%, де ssShare = 70% (послуги) або 20% (товари) — ОКРЕМИЙ коефіцієнт від IRS coefficient. На практиці перше звільнення прив'язане до перших 12 місяців після початку активності, не до календарного року."],
  ["netFreelancer / netNHR", "grossAnnual мінус IRS, solidarity surcharge і Segurança Social."],
  ["effectiveRateFL / effectiveRateNHR", "Річні податки режиму / grossAnnual."],
  ["bestMode", "NHR або freelancer, залежно від того, який режим дає більший net, якщо NHR увімкнений."],
]

const fmtEUR = (value: number) =>
  value === Infinity
    ? "∞"
    : value.toLocaleString("uk-UA", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    })

const fmtPercent = (value: number) => `${(value * 100).toFixed(1)}%`

export default function MethodologyPage() {
  return (
    <main className="gradient-hero min-h-screen px-4 py-8 sm:px-6 lg:py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="space-y-3">
          <Link href="/" className="text-sm font-medium text-primary hover:underline">
            На калькулятор
          </Link>
          <p className="text-xs font-bold uppercase tracking-widest text-primary">
            Methodology
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Методологія розрахунків
          </h1>
          <p className="text-sm leading-6 text-muted-foreground sm:text-base">
            Тут описано всі дані, які впливають на результат: вхідний дохід,
            рік активності, NHR, тип активності, family quotient, відрахування,
            Segurança Social, solidarity surcharge і спосіб вибору найкращого режиму.
            Повна Markdown-версія також лежить у `docs/calculation-methodology.md`.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Короткий pipeline</CardTitle>
            <CardDescription>
              Саме в такому порядку калькулятор приводить дані до результату.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-6 text-muted-foreground">
            <p>
              1. Введений дохід приводиться до `grossAnnual`. Якщо обрано місячний
              період, значення множиться на 12.
            </p>
            <p>
              2. `taxableBase = grossAnnual * coefficient`. Coefficient залежить
              від типу активності у simplified regime.
            </p>
            <p>
              3. Для freelancer-режиму база зменшується за роком активності:
              50% у перший податковий період, 75% у другий, 100% з третього.
              Для фізосіб податковий період зазвичай збігається з календарним роком.
            </p>
            <p>
              4. Freelancer IRS рахується прогресивно, потім коригується family
              quotient і collection deductions. NHR IRS рахується окремо як 20%
              від taxable base.
            </p>
            <p>
              5. Додаються solidarity surcharge і Segurança Social. Після цього
              калькулятор отримує `netFreelancer`, `netNHR`, effective rate і best mode.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Вхідні дані</CardTitle>
            <CardDescription>
              Усі поля, які змінюють розрахунок або відображення.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {inputs.map((input) => (
                <div key={input.name} className="rounded-lg border border-border/50 bg-muted/20 p-4">
                  <h2 className="text-sm font-semibold text-foreground">{input.name}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {input.effect}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Тип активності і коефіцієнти</CardTitle>
            <CardDescription>
              Ці значення напряму впливають на `taxableBase`.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-3 pr-4 font-semibold">Тип</th>
                    <th className="py-3 px-2 font-semibold">Coefficient</th>
                    <th className="py-3 pl-2 font-semibold">CAE</th>
                  </tr>
                </thead>
                <tbody>
                  {ACTIVITY_COEFFICIENTS.map((item) => (
                    <tr key={item.label} className="border-b border-border/40 last:border-0">
                      <td className="py-3 pr-4">{item.label}</td>
                      <td className="py-3 px-2 tabular-nums text-primary">
                        {fmtPercent(item.value)}
                      </td>
                      <td className="py-3 pl-2 text-muted-foreground">{item.cae}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>IRS brackets у коді</CardTitle>
            <CardDescription>
              Поточні значення з `TAX_BRACKETS`. Якщо змінюється податковий рік,
              потрібно оновити ці константи.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-700 dark:text-amber-300">
              Офіційні пороги IRS можуть змінюватися. Сторінка описує те, що
              зараз закладено в коді калькулятора, а не автоматично оновлює
              `TAX_BRACKETS` з офіційного сайту.
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-3 pr-4 font-semibold">From</th>
                    <th className="py-3 px-2 font-semibold">To</th>
                    <th className="py-3 pl-2 font-semibold">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {TAX_BRACKETS.map((bracket) => (
                    <tr key={`${bracket.min}-${bracket.max}`} className="border-b border-border/40 last:border-0">
                      <td className="py-3 pr-4 tabular-nums">{fmtEUR(bracket.min)}</td>
                      <td className="py-3 px-2 tabular-nums">{fmtEUR(bracket.max)}</td>
                      <td className="py-3 pl-2 tabular-nums text-primary">
                        {fmtPercent(bracket.rate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Відрахування і family quotient</CardTitle>
            <CardDescription>
              Ці дані застосовуються до freelancer IRS, не до NHR flat rate.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 text-sm leading-6 text-muted-foreground">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
                <h2 className="text-sm font-semibold text-foreground">Сімейний стан</h2>
                <p className="mt-2">
                  Art. 69.º CIRS (quociente conjugal): `married` при спільному
                  оподаткуванні ділить taxableBase на 2, рахує IRS від половини
                  і множить на 2. `single` і `single_parent` рахуються з дільником
                  1 — окремого квоцієнта для монобатьківських сімей у поточній
                  моделі немає.
                </p>
              </div>
              <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
                <h2 className="text-sm font-semibold text-foreground">Діти</h2>
                <p className="mt-2">
                  Діти НЕ впливають на quociente conjugal (дільник 2/1) — це поширена
                  помилка. Вони дають окремий податковий кредит: {fmtEUR(DEDUCTION_RULES.depCreditPerChild)}
                  {" "}за дитину (базова ставка Art. 78-A CIRS для дітей старше 3 років;
                  вищі ставки для молодших дітей тут не моделюються).
                </p>
              </div>
            </div>

            <Separator />

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-border/50 p-4">
                <h3 className="font-semibold text-foreground">Іпотека</h3>
                <p className="mt-2">
                  {fmtPercent(DEDUCTION_RULES.mortgage.rate)} від відсотків,
                  максимум {fmtEUR(DEDUCTION_RULES.mortgage.cap)}.
                </p>
              </div>
              <div className="rounded-lg border border-border/50 p-4">
                <h3 className="font-semibold text-foreground">Медицина</h3>
                <p className="mt-2">
                  {fmtPercent(DEDUCTION_RULES.health.rate)} від витрат,
                  максимум {fmtEUR(DEDUCTION_RULES.health.cap)}.
                </p>
              </div>
              <div className="rounded-lg border border-border/50 p-4">
                <h3 className="font-semibold text-foreground">Освіта</h3>
                <p className="mt-2">
                  {fmtPercent(DEDUCTION_RULES.education.rate)} від витрат,
                  максимум {fmtEUR(DEDUCTION_RULES.education.cap)}.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>NHR, Segurança Social і solidarity surcharge</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-6 text-muted-foreground">
            <p>
              NHR/IFICI рахується окремо від прогресивного IRS: `irsNHR = taxableBase * 0.20`.
              Стара програма NHR закрита для нових заявників з 2024 року (реєстрація
              завершилась 31.03.2025); її замінила IFICI — та сама ставка 20%, але
              лише для кваліфікованих фахівців у визначених секторах, які не були
              резидентами Португалії останні 5 років, на 10 років без продовження.
              Застосовується і до Категорії A (найм), і до Категорії B (ФОП).
            </p>
            <p>
              Segurança Social для ФОП у коді: `0` для першого року активності, далі
              `min(grossAnnual * ssShare, cap) * 0.214`, де `ssShare` — 70% для послуг
              або 20% для товарів (Decreto-Lei 2/2018), НЕ IRS-коефіцієнт Art. 31.
              База обмежена стелею 12×IAS і має мінімум €20/міс. Офіційне перше
              enquadramento прив&apos;язане до перших 12 місяців після початку
              активності, а не до календарного року — калькулятор наближує це як
              `activityYear === 1`.
            </p>
            <p>
              Solidarity surcharge застосовується до taxable income понад
              {fmtEUR(80000)}: 2.5% до {fmtEUR(250000)} і 5% на суму понад
              {fmtEUR(250000)}.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Вихідні значення</CardTitle>
            <CardDescription>
              Поля, які engine повертає для правого блоку калькулятора.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {outputRows.map(([name, description]) => (
                <div key={name} className="rounded-lg border border-border/50 bg-muted/20 p-4">
                  <code className="text-xs text-primary">{name}</code>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Що не впливає на податки</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
            <p>
              Перемикач USD не змінює розрахунки. Він тільки додає приблизний
              доларовий еквівалент поруч із EUR-сумами.
            </p>
            <p>
              Темна/світла тема, UI-сторінка і SEO-текст не входять у tax engine.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Офіційні джерела</CardTitle>
            <CardDescription>
              Джерела для ручної перевірки ставок і правил. Калькулятор не
              синхронізує їх автоматично.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {sources.map((source) => (
                <li key={source.href}>
                  <a
                    href={source.href}
                    className="text-primary hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {source.label}
                  </a>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
