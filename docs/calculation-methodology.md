# Методологія розрахунків Portugal Tax Calculator

Цей документ описує, як працює калькулятор у поточній версії коду. Джерелом істини для числових значень у застосунку є `src/lib/brackets.ts`, `src/lib/taxEngine.ts` і `src/lib/employeeEngine.ts`.

Список конкретних розбіжностей з чинним законодавством, знайдених і виправлених 2026-08-13, — у `docs/compliance-audit-2026.md`.

Калькулятор має два незалежні режими (перемикач "Тип контракту"):

- **B2B / ФОП** — Категорія B, `regime simplificado`, `calcAll` (`taxEngine.ts`);
- **Найм** — Категорія A, `contrato de trabalho`, `calcEmployeeAll` (`employeeEngine.ts`).

Розділи 1–10 описують режим B2B. Розділ 11 описує режим найму.

## 1. Вхідний дохід

Користувач може ввести дохід як gross на рік або gross на місяць. Для B2B engine приводить це до річного gross множенням на 12 (12 виплат/рік). Для режиму найму множник — 14 (12 місяців + subsídio de férias + subsídio de Natal, Código do Trabalho):

```text
B2B:  annual gross = monthly gross * 12
Найм: annual gross = monthly gross * 14
```

Якщо користувач вводить бажаний net (у режимі B2B), калькулятор запускає зворотний розрахунок у `findRequiredGross`: бінарним пошуком підбирається gross, який дає потрібний net після IRS, Segurança Social і solidarity surcharge.

## 2. Оподатковувана база

Для freelancer-режиму калькулятор застосовує коефіцієнт активності:

```text
taxableBase = grossAnnual * coefficient
```

За замовчуванням для професійних послуг використовується `0.75`. Інші коефіцієнти задаються у `ACTIVITY_COEFFICIENTS`.

Офіційний орієнтир: Portal das Finanças, Código do IRS, режим simplificado / coeficientes, зокрема Artigo 31.º. Див. також офіційні матеріали AT щодо CIRS: https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/Pages/default.aspx

## 3. Знижка для перших років активності

Калькулятор застосовує зменшення бази для IRS за податковими періодами активності. Для фізичних осіб у Португалії податковий період зазвичай збігається з календарним роком:

```text
1-й податковий період активності: taxableBase * 0.50
2-й податковий період активності: taxableBase * 0.75
3-й податковий період і далі: taxableBase
```

Це реалізовано в `applyNewActivityDiscount`.

## 4. IRS

Freelancer IRS рахується прогресивно за шкалою з `TAX_BRACKETS`:

```text
irs = sum(taxable amount inside each bracket * bracket rate)
```

Поточні bracket-значення в коді (2026, OE2026 — Lei n.º 73-A/2025, DR 30/12/2025):

| From | To | Rate |
| --- | --- | --- |
| 0 | 8 342 | 12.5% |
| 8 343 | 12 587 | 15.7% |
| 12 588 | 17 838 | 21.2% |
| 17 839 | 23 089 | 24.1% |
| 23 090 | 29 397 | 31.1% |
| 29 398 | 43 091 | 34.9% |
| 43 092 | 46 567 | 43.1% |
| 46 568 | 86 634 | 44.6% |
| 86 635 | ∞ | 48% |

Пороги проіндексовані на +3.51% відносно 2025 року, ставки 2–5 класів знижені на 0.3 в.п. (парламентська домовленість у бюджеті 2026). Джерело: Lei n.º 73-A/2025 (Diário da República, 30.12.2025); перевірено по двох незалежних вторинних джерелах.

Офіційний орієнтир для актуальних ставок: Portal das Finanças, Código do IRS, Artigo 68.º: https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/irs/ra/pages/irsra72-1207.aspx

Важливо: офіційні пороги можуть змінюватися щороку. Якщо рік калькулятора змінюється, потрібно оновити `TAX_BRACKETS`.

## 5. NHR / IFICI

Стара програма NHR (Non-Habitual Resident) **закрита для нових заявників з 2024 року** — реєстрація завершилась 31.03.2025. Її замінює **IFICI** ("NHR 2.0", Incentivo Fiscal à Investigação Científica e Inovação): та сама фіксована ставка 20%, але тільки для кваліфікованих фахівців (наука, технології, охорона здоров'я, зелена енергетика, R&D, вища освіта) які не були податковими резидентами Португалії останні 5 років. Діє 10 років без продовження і застосовується як до Категорії A (найм), так і до Категорії B (ФОП).

Калькулятор рахує flat rate однаково для обох кваліфікацій (без перевірки профпридатності — це поза межами калькулятора):

```text
irsNHR = taxableBase * 0.20
```

Офіційний орієнтир: Portal das Finanças, Código do IRS, Artigo 72.º: https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/ra/Pages/irs72ra_202310.aspx

## 6. Segurança Social (ФОП)

Калькулятор рахує Segurança Social для trabalhadores independentes так:

```text
1-й рік активності: 0
2-й рік і далі: min(grossAnnual * ssShare, 12×IAS) * 0.214, мінімум €20 × 12
```

де `ssShare` — **окремий коефіцієнт від IRS Art. 31 coefficient**: 70% для доходу від послуг або 20% для доходу від продажу товарів (Decreto-Lei 2/2018). Раніше калькулятор помилково використовував IRS-коефіцієнт (наприклад, 0.75 для IT) як SS-базу — це виправлено, див. `docs/compliance-audit-2026.md`, п. 1. Стеля `12×IAS` — це МІСЯЧНА стеля relevant-income бази (річна стеля похідна: `12×IAS×12`); раніше в коді помилково застосовувалась як річна, що завищувало ефект обмеження на скромних доходах (п. 7 звіту).

Важливо: для Segurança Social перше звільнення не є календарним роком у прямому сенсі. Для першого enquadramento воно прив'язане до перших 12 місяців після початку активності; калькулятор наближує це як `activityYear === 1`.

Офіційний орієнтир: Segurança Social, trabalhadores independentes: https://www.seg-social.pt/trabalhadores-independentes

## 7. Додатковий solidarity surcharge

Калькулятор застосовує:

```text
80 000 - 250 000: 2.5% на суму понад 80 000
250 000+: 2.5% на 170 000 + 5% на суму понад 250 000
```

Офіційний орієнтир: Portal das Finanças, Código do IRS, Artigo 68.º-A: https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/irs/Pages/irs68a.aspx

## 8. Податкові відрахування і сімейний стан

Раніше калькулятор мав власну неофіційну формулу "family quotient" (married: 2.0 + 0.15/дитину; single parent: 1.0 + 0.34 + 0.20/дитину), яка не відповідала жодному положенню CIRS. Виправлено на реальну модель (див. `docs/compliance-audit-2026.md`, п. 3):

**Quociente conjugal (Art. 69.º CIRS).** Тільки для married при спільному оподаткуванні:

```text
married: irs = calcIRS(taxableBase / 2) * 2
single / single_parent: irs = calcIRS(taxableBase)
```

Діти на цей дільник **не впливають**.

**Податковий кредит за утриманця (Art. 78.º-A CIRS).** Застосовується до суми IRS (не до бази), однаково для всіх сімейних станів:

```text
children = numChildren * 600
```

Це базова ставка (для дітей старше 3 років). Реальна шкала також передбачає підвищений кредит €726 для дітей до 3 років і бонус +€900 для 2-ї+ дитини віком до 6 років — калькулятор не збирає вік дітей, тому ці підвищені ставки не моделюються.

**Інші відрахування:**

```text
mortgage = min(mortgageInterest * 15%, 296)   # Art. 78-E CIRS
health = min(healthExpenses * 15%, 1000)      # Art. 78-C CIRS
education = min(educationExpenses * 30%, 800) # Art. 78-D CIRS
```

Ці значення знаходяться в `DEDUCTION_RULES` (`brackets.ts`).

## 9. Net і effective rate

Після IRS, solidarity surcharge і Segurança Social:

```text
netFreelancer = grossAnnual - irsFreelancer - solidarityFL - socialSecurity
netNHR = grossAnnual - irsNHR - solidarityNHR - socialSecurity
effectiveRate = annualTaxes / grossAnnual
```

Якщо NHR увімкнений і дає більший net, калькулятор показує NHR як кращий режим. Інакше показує freelancer.

## 10. Порівняння моменту відкриття діяльності

Реалізовано в `src/lib/openingTiming.ts` (`calcOpeningTiming`). Ставка `SS_RATE` (21.4%) винесена в `brackets.ts` як спільна константа для `calcSocialSecurity` і цього розрахунку.

Виходить з того, що звільнення від Segurança Social — це rolling-вікно на 12 місяців від дати відкриття, а не календарний рік (див. розділ 6). Тому відкриття в будь-якому місяці дає ті самі 12 звільнених місяців — просто зсунуті в часі. Порівнюються два сценарії за однаковий проміжок часу (від поточного місяця до грудня наступного року):

```text
Сценарій "зараз" (відкрити в місяці M поточного року Y):
  gapNow = дохід за контрактом за (M - currentMonth) місяців
  netThisYear = calcAll(grossAnnual * (13-M)/12, activityYear=1) — SS=0, весь час у межах вікна
  nextYearSS = grossAnnual * coefficient * SS_RATE * (13-M)/12 — SS-вікно закінчується в місяці M-1
  netNextYear = grossAnnual - totalTax(activityYear=2) - nextYearSS
  total = gapNow + netThisYear + netNextYear

Сценарій "почекати" (відкрити в січні року Y+1):
  gapWait = дохід за контрактом за (13 - currentMonth) місяців
  netNextYearFull = calcAll(grossAnnual, activityYear=1) — повністю звільнений рік
  total = gapWait + netNextYearFull

difference = total("зараз") - total("почекати")
```

Якщо `|difference|` менше `EQUAL_THRESHOLD_EUR` (500€), різниця вважається несуттєвою. IRS-компонента року Y+1 рахується через `activityYear: 2` (75% бази — 2-й календарний рік активності), а SS для цього року рахується вручну пропорційно до кількості місяців поза вікном звільнення, оскільки `calcAll` прив'язує SS суто до `activityYear`, а не до фактичної кількості звільнених місяців у змішаному році.

Спрощення: відрахування (`deductions`) для часткового року Y застосовуються без пропорціювання лімітів.

## 11. Категорія A — найм за трудовим договором

Реалізовано в `src/lib/employeeEngine.ts` (`calcEmployeeAll`). Використовує той самий annual-effective-rate підхід, що й `calcAll`: рахує один річний ефективний IRS від річної оподатковуваної бази, а не місячні офіційні tabelas de retenção na fonte АТ (які мають окремі таблиці для married/single, кількості утриманців, континент/острови тощо). Це навмисне спрощення — місяць-у-місяць утримана сума з зарплати відрізнятиметься від значень калькулятора, але річний net після acerto de contas (перерахунку за IRS-декларацією) з ним збігається.

**Внески Segurança Social (TSU, DL 89/2013, regime geral):**

```text
ssEmployee = grossAnnual * 0.11   # утримується роботодавцем з gross
employerTSU = grossAnnual * 0.2375  # платить роботодавець ПОНАД gross, не з net працівника
```

`employerTSU` — інформаційне значення для порівняння з B2B, не впливає на net.

**Оподатковувана база:**

```text
taxableIncome = max(0, grossAnnual + mealAllowanceTaxable - ssEmployee - specificDeduction)
specificDeduction = 8.54 * IAS  # Art. 25.º CIRS, ≈ €4 587 (2026, IAS = €537.13)
```

На відміну від B2B, тут немає IRS-коефіцієнта (Art. 31) — практично весь gross є оподатковуваним, за винятком фіксованого `specificDeduction`, який не потребує підтвердження реальних витрат.

**Субсидія на харчування:** звільнена від IRS і TSU до €10.46/день (картка) або €6.15/день (готівка); різниця понад ліміт додається до `taxableIncome` як звичайна зарплата. Кількість робочих днів на рік — наближено як `WORKING_DAYS_PER_YEAR = 220` константа (реальне число залежить від свят/відпустки конкретного року і не збирається калькулятором).

**IRS і solidarity surcharge:** ті самі функції `applyMarriedSplit`, `calcDependentTaxCredit`, `calcSolidaritySurcharge`, що й для B2B, застосовані до `taxableIncome` замість `taxableBaseReduced`. IFICI (якщо увімкнений) — той самий flat 20%. `applyMarriedSplit` також застосовує mínimo de existência (Art. 70.º CIRS, €12 880 у 2026) — повне звільнення від IRS при таксованому доході на цьому рівні чи нижче; тому дохід на рівні мінімальної зарплати (€920×14) дає IRS = 0.

**Джерела:** CIRS Art. 25.º (dedução específica), Código do Trabalho (subsídio de férias/Natal, DL 7/2009 та зміни), Decreto-Lei 89/2013 (regime contributivo, TSU).
