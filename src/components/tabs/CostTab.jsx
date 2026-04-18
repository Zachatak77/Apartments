import { useMemo } from 'react'
import { loadMortgagePrefs, calcMonthlyPayment, MORTGAGE_DEDUCTION_CAP } from '../../lib/mortgage'
import { useSortable } from '../../hooks/useSortable.jsx'
import styles from './CostTab.module.css'

const INS_RATE = 0.005  // estimated 0.5% of price annually

function computeRow(comp, prefs) {
  const price = comp.sold_price ?? comp.last_list_price ?? comp.original_list_price
  if (!price) return null

  const { rate, downPct, term, taxRate = 32 } = prefs
  const downAmt = Math.round(price * downPct / 100)
  const loanAmt = price - downAmt

  // Monthly costs
  const monthlyPI  = calcMonthlyPayment(loanAmt, rate, term)
  const monthlyTax = comp.taxes ? comp.taxes / 12 : 0
  const monthlyIns = price * INS_RATE / 12
  const monthlyDrag = monthlyPI + monthlyTax + monthlyIns

  // Tax deductions — year-1 interest approximation
  // Mortgage interest: only on first $750K of loan (TCJA 2017)
  const deductibleLoan       = Math.min(loanAmt, MORTGAGE_DEDUCTION_CAP)
  const annualIntActual      = loanAmt * (rate / 100)          // what you actually pay
  const annualIntDeductible  = deductibleLoan * (rate / 100)   // what you can deduct
  const annualIntLost        = annualIntActual - annualIntDeductible
  const isCapped             = loanAmt > MORTGAGE_DEDUCTION_CAP

  // Property tax: 100% deductible
  const annualTaxDeductible = comp.taxes ?? 0

  const totalDeductions = annualIntDeductible + annualTaxDeductible
  const taxSavingsAnnual = totalDeductions * (taxRate / 100)
  const taxSavingsMonthly = taxSavingsAnnual / 12

  // After-tax
  const annualDrag     = monthlyDrag * 12
  const annualAfterTax = annualDrag - taxSavingsAnnual
  const monthlyAfterTax = annualAfterTax / 12

  return {
    ...comp,
    _price:               price,
    _downAmt:             downAmt,
    _loanAmt:             loanAmt,
    _monthlyPI:           monthlyPI,
    _monthlyTax:          monthlyTax,
    _monthlyIns:          monthlyIns,
    _monthlyDrag:         monthlyDrag,
    _annualIntDeductible: annualIntDeductible,
    _annualIntLost:       annualIntLost,
    _annualTaxDeductible: annualTaxDeductible,
    _totalDeductions:     totalDeductions,
    _taxSavingsAnnual:    taxSavingsAnnual,
    _taxSavingsMonthly:   taxSavingsMonthly,
    _annualAfterTax:      annualAfterTax,
    _monthlyAfterTax:     monthlyAfterTax,
    _isCapped:            isCapped,
    _hasTaxData:          !!comp.taxes,
  }
}

const K = v => `$${Math.round(v / 1000)}K`
const Mo = v => `$${Math.round(v).toLocaleString()}`

export default function CostTab({ comps }) {
  const prefs = useMemo(() => loadMortgagePrefs(), [])

  const rows = useMemo(() =>
    comps.map(c => computeRow(c, prefs)).filter(Boolean),
  [comps, prefs])

  const { sorted, handleSort, SortIcon } = useSortable(rows, '_monthlyAfterTax', 'asc')

  const hasCapped  = sorted.some(r => r._isCapped)
  const hasMissing = sorted.some(r => !r._hasTaxData)

  const Th = ({ colKey, label, title }) => (
    <th
      className={styles.thSortable}
      title={title}
      onClick={() => handleSort(colKey)}
    >
      {label}<SortIcon colKey={colKey} />
    </th>
  )

  const ThL = ({ colKey, label }) => (
    <th
      className={`${styles.thSortable} ${styles.thLeft}`}
      onClick={() => handleSort(colKey)}
    >
      {label}<SortIcon colKey={colKey} />
    </th>
  )

  // Summary stats
  const validRows = sorted.filter(r => r._hasTaxData)
  const avgMonthlyAfterTax = validRows.length
    ? Math.round(validRows.reduce((s, r) => s + r._monthlyAfterTax, 0) / validRows.length)
    : null
  const lowestRow = validRows.length
    ? validRows.reduce((lo, r) => r._monthlyAfterTax < lo._monthlyAfterTax ? r : lo)
    : null

  return (
    <div>
      <div className="sl">Carrying costs</div>
      <h2 className={styles.title}>All-In Cost Comparison</h2>
      <p className={styles.sub}>
        Monthly and annual carrying costs for every property in the pool at your financing
        profile, net of federal deductions. Sort any column.
      </p>

      {/* Assumption bar */}
      <div className={styles.assumBar}>
        <div className={styles.assumItem}>
          <span className={styles.assumLbl}>Rate</span>
          <span className={styles.assumVal}>{prefs.rate.toFixed(3)}%</span>
        </div>
        <div className={styles.assumDivider} />
        <div className={styles.assumItem}>
          <span className={styles.assumLbl}>Down</span>
          <span className={styles.assumVal}>{prefs.downPct}%</span>
        </div>
        <div className={styles.assumDivider} />
        <div className={styles.assumItem}>
          <span className={styles.assumLbl}>Term</span>
          <span className={styles.assumVal}>{prefs.term}yr</span>
        </div>
        <div className={styles.assumDivider} />
        <div className={styles.assumItem}>
          <span className={styles.assumLbl}>Marginal Rate</span>
          <span className={styles.assumVal}>{prefs.taxRate ?? 32}%</span>
        </div>
        <div className={styles.assumDivider} />
        <div className={styles.assumItem}>
          <span className={styles.assumLbl}>Int. Deduction Cap</span>
          <span className={styles.assumVal}>$750K</span>
        </div>
      </div>

      {/* Summary cards */}
      {lowestRow && (
        <div className={styles.summaryRow}>
          <div className={styles.summaryCard}>
            <div className={styles.summaryLbl}>Lowest After-Tax /mo</div>
            <div className={styles.summaryVal}>{Mo(lowestRow._monthlyAfterTax)}</div>
            <div className={styles.summaryAddr}>{lowestRow.address}</div>
          </div>
          {avgMonthlyAfterTax && (
            <div className={styles.summaryCard}>
              <div className={styles.summaryLbl}>Pool Average /mo</div>
              <div className={styles.summaryVal}>{Mo(avgMonthlyAfterTax)}</div>
              <div className={styles.summaryAddr}>{validRows.length} properties with tax data</div>
            </div>
          )}
          {lowestRow && avgMonthlyAfterTax && (
            <div className={styles.summaryCard}>
              <div className={styles.summaryLbl}>Best vs. Average</div>
              <div className={`${styles.summaryVal} ${styles.savingsGreen}`}>
                {Mo(avgMonthlyAfterTax - lowestRow._monthlyAfterTax)}/mo
              </div>
              <div className={styles.summaryAddr}>
                {K((avgMonthlyAfterTax - lowestRow._monthlyAfterTax) * 12)}/yr cheaper
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main table */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <ThL colKey="address"             label="Property" />
              <Th  colKey="_price"              label="Price"                   title="List or sold price" />
              <Th  colKey="_monthlyPI"          label="P&amp;I /mo"             title="Monthly principal + interest" />
              <Th  colKey="_monthlyTax"         label="Tax /mo"                 title="Annual property tax ÷ 12" />
              <Th  colKey="_monthlyIns"         label="Ins. /mo"                title="Estimated insurance (0.5% of price annually)" />
              <Th  colKey="_monthlyDrag"        label="Total /mo"               title="Total monthly cash outlay (P&I + tax + insurance)" />
              <Th  colKey="_annualIntDeductible" label="Int. Deduction /yr"     title="Deductible mortgage interest (capped at $750K loan)" />
              <Th  colKey="_annualTaxDeductible" label="Tax Deduction /yr"      title="Annual property tax (100% deductible)" />
              <Th  colKey="_taxSavingsAnnual"   label="Tax Savings /yr"         title="Total deductions × marginal tax rate" />
              <Th  colKey="_monthlyAfterTax"    label="After-Tax /mo"           title="(Annual drag − tax savings) ÷ 12" />
            </tr>
          </thead>
          <tbody>
            {sorted.map(r => {
              const noTax = !r._hasTaxData
              return (
                <tr key={r.id} className={r._isCapped ? styles.rowCapped : ''}>
                  <td className={styles.addrCell}>
                    <span className={styles.addr}>{r.address}</span>
                    {r.town && <span className={styles.town}>{r.town}</span>}
                    <div className={styles.tags}>
                      {r._isCapped && (
                        <span className={styles.capTag} title={`Loan $${Math.round(r._loanAmt / 1000)}K — interest on $${Math.round(r._annualIntLost / 1000)}K/yr non-deductible`}>
                          750K cap
                        </span>
                      )}
                      {r.is_closed && <span className={styles.closedTag}>sold</span>}
                    </div>
                  </td>
                  <td className={styles.num}>{K(r._price)}</td>
                  <td className={styles.num}>{Mo(r._monthlyPI)}</td>
                  <td className={styles.num}>
                    {noTax
                      ? <span className={styles.noData}>—</span>
                      : Mo(r._monthlyTax)
                    }
                  </td>
                  <td className={`${styles.num} ${styles.dimNum}`}>{Mo(r._monthlyIns)}</td>
                  <td className={`${styles.num} ${styles.dragCol}`}>
                    {noTax ? <span className={styles.noData}>—</span> : Mo(r._monthlyDrag)}
                  </td>
                  <td className={styles.num}>
                    {r._isCapped ? (
                      <div>
                        <div>{K(r._annualIntDeductible)}</div>
                        <div className={styles.capLost}>−{K(r._annualIntLost)} lost</div>
                      </div>
                    ) : K(r._annualIntDeductible)}
                  </td>
                  <td className={styles.num}>
                    {noTax ? <span className={styles.noData}>—</span> : K(r._annualTaxDeductible)}
                  </td>
                  <td className={`${styles.num} ${styles.savingsCol}`}>
                    {noTax ? <span className={styles.noData}>—</span> : K(r._taxSavingsAnnual)}
                  </td>
                  <td className={`${styles.num} ${styles.netCol}`}>
                    {noTax
                      ? <span className={styles.noData}>—</span>
                      : <strong>{Mo(r._monthlyAfterTax)}/mo</strong>
                    }
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footnotes */}
      <div className={styles.footnotes}>
        <div className={styles.footnote}>
          Insurance estimated at 0.5% of list price annually. Actual premiums vary.
        </div>
        <div className={styles.footnote}>
          Mortgage interest deductible on first $750K of loan principal (TCJA 2017).
          Interest on the excess is paid but not deductible.
        </div>
        <div className={styles.footnote}>
          Property tax deducted in full. Deductions assume you itemize vs. taking the standard deduction.
        </div>
        <div className={styles.footnote}>
          Interest deduction uses a year-1 approximation (balance × rate). Actual deductible
          interest decreases slightly each year as principal is repaid.
        </div>
        {hasMissing && (
          <div className={`${styles.footnote} ${styles.footnoteMissing}`}>
            Some properties are missing annual tax data — after-tax costs cannot be computed for those rows.
            Add taxes in the property editor.
          </div>
        )}
      </div>
    </div>
  )
}
