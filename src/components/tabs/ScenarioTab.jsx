import { useState, useMemo } from 'react'
import { poolStats, MED_PSF, CEIL_PSF, buildPricingContext } from '../../lib/scoring'
import { loadMortgagePrefs, calcMonthlyPayment } from '../../lib/mortgage'
import { loadModelSettings } from '../../lib/modelSettings'
import styles from './ScenarioTab.module.css'

function Slider({ label, min, max, step = 1, value, onChange, display }) {
  return (
    <div className={styles.sliderGroup}>
      <div className={styles.sliderHead}>
        <span className={styles.sliderName}>{label}</span>
        <span className={styles.sliderVal}>{display}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(+e.target.value)} />
    </div>
  )
}

export default function ScenarioTab({ comps }) {
  const stats    = poolStats(comps)
  const pricing  = buildPricingContext(comps)
  const medPsf   = pricing?.mean  ?? stats.medianPsf ?? MED_PSF
  const ceilPsf  = pricing?.ceil  ?? CEIL_PSF

  const [price, setPrice]  = useState(1700000)
  const [sqft,  setSqft]   = useState(4000)
  const [lot,   setLot]    = useState(30000)
  const [tax,   setTax]    = useState(25000)
  const [yr,    setYr]     = useState(1985)
  const [dom,   setDom]    = useState(14)
  const [cut,   setCut]    = useState(0)
  const [reno,  setReno]   = useState(100000)

  const [mortPrefs]           = useState(loadMortgagePrefs)
  const [rate, setRate]       = useState(mortPrefs.rate)
  const [downPct, setDownPct] = useState(mortPrefs.downPct)
  const [term, setTerm]       = useState(mortPrefs.term)
  const ms = useMemo(() => loadModelSettings(), [])

  const out = useMemo(() => {
    const psf    = price / sqft
    const allin  = (price + reno) / sqft
    const taxMo  = tax / 12
    const delta  = ((psf - medPsf) / medPsf) * 100

    const ps = psf < 340 ? 3 : psf < 400 ? 2.5 : psf < 450 ? 2 : psf < 510 ? 1.5 : 1
    const ts = tax < 19000 ? 3 : tax < 23000 ? 2.8 : tax < 27000 ? 2 : tax < 31000 ? 1.5 : 1
    const ss = sqft > 4600 ? 3 : sqft > 4100 ? 2.5 : sqft > 3700 ? 2 : sqft > 3300 ? 1.5 : 1
    const ls = lot > 40000 ? 3 : lot > 33000 ? 2.5 : lot > 25000 ? 2 : lot > 18000 ? 1.5 : 1
    const as = yr >= 2010 ? 3 : yr >= 2000 ? 2.8 : yr >= 1990 ? 2.2 : yr >= 1975 ? 1.8 : 1.5
    const score = Math.round(
      ((ps * ms.wPsf + ts * ms.wTax + ss * ms.wSqft + ls * ms.wLot + as * ms.wAge) / 100 / 3) * 100
    )

    let lo, hi
    if (dom > 60)      { lo = .84; hi = .89 }
    else if (dom > 40) { lo = .87; hi = .92 }
    else if (dom > 20) { lo = .92; hi = .96 }
    else if (dom > 10) { lo = .95; hi = .98 }
    else               { lo = .97; hi = 1.02 }
    if (cut > ms.largeCutThresh) { lo *= .97; hi *= .97 }

    const flags = []
    if (psf < ms.psfBuyZone)          flags.push('$/SF in buy zone')
    if (psf > ms.psfAbove)            flags.push('$/SF above threshold')
    if (allin > ceilPsf)              flags.push(`all-in exceeds $${ceilPsf} ceiling`)
    if (tax > ms.taxHighThresh)       flags.push('high tax carry')
    if (dom > ms.domLeverage)         flags.push(`${dom} DOM = leverage`)
    if (lot < 20000)                  flags.push('sub-20K lot risk')
    if (cut > ms.largeCutThresh)      flags.push('large cut = motivated seller')

    const verdict = score >= ms.strongBuyScore && allin < ceilPsf ? 'Strong Buy'
      : score >= ms.considerScore && allin < ceilPsf ? 'Consider' : 'Pass'

    // Mortgage calculations
    const downAmt    = Math.round(price * downPct / 100)
    const loanAmt    = price - downAmt
    const closing    = Math.round(price * ms.closingCostPct / 100)
    const cashNeeded = downAmt + reno + closing
    const monthlyPmt = calcMonthlyPayment(loanAmt, rate, term)
    const loRate     = Math.max(1, rate - 1)
    const hiRate     = rate + 1
    const loPayment  = calcMonthlyPayment(loanAmt, loRate, term)
    const hiPayment  = calcMonthlyPayment(loanAmt, hiRate, term)

    return {
      psf, allin, taxMo, delta, score,
      lo: price * lo, hi: price * hi,
      flags, verdict,
      downAmt, loanAmt, closing, cashNeeded,
      monthlyPmt, loRate, hiRate, loPayment, hiPayment,
    }
  }, [price, sqft, lot, tax, yr, dom, cut, reno, medPsf, rate, downPct, term])

  const verdictCls = out.verdict === 'Strong Buy' ? styles.verdictBuy : out.verdict === 'Consider' ? styles.verdictWatch : styles.verdictAvoid

  return (
    <div>
      <div className="sl">Interactive model</div>
      <h2 className={styles.title}>Scenario Engine</h2>
      <p className={styles.sub}>Adjust each lever to model any new listing. Outputs update in real time relative to your comp pool.</p>

      <div className={styles.layout}>
        <div className={styles.inputs}>
          <div className={styles.panelTitle}>Property Parameters</div>
          <Slider label="List Price"          min={500000}  max={4000000} step={25000}  value={price} onChange={setPrice} display={`$${Math.round(price/1000)}K`} />
          <Slider label="Square Feet"         min={1000}    max={8000}    step={50}     value={sqft}  onChange={setSqft}  display={`${sqft.toLocaleString()} SF`} />
          <Slider label="Lot Size"            min={5000}    max={80000}   step={500}    value={lot}   onChange={setLot}   display={`${Math.round(lot/1000)}K SF`} />
          <Slider label="Annual Taxes"        min={5000}    max={50000}   step={500}    value={tax}   onChange={setTax}   display={`$${tax.toLocaleString()}`} />
          <Slider label="Year Built"          min={1920}    max={2025}    step={1}      value={yr}    onChange={setYr}    display={yr} />
          <Slider label="Days on Market"      min={0}       max={180}     step={1}      value={dom}   onChange={setDom}   display={`${dom}d`} />
          <Slider label="Price Cut from Orig" min={0}       max={600000}  step={10000}  value={cut}   onChange={setCut}   display={cut ? `−$${Math.round(cut/1000)}K` : 'None'} />
          <Slider label="Renovation Budget"   min={0}       max={1000000} step={25000}  value={reno}  onChange={setReno}  display={`$${Math.round(reno/1000)}K`} />

          <div className={styles.sectionDivider}>Mortgage Parameters</div>
          <Slider label="Interest Rate" min={3} max={10} step={0.125} value={rate}    onChange={setRate}    display={`${rate.toFixed(3)}%`} />
          <Slider label="Down Payment"  min={5} max={50} step={5}     value={downPct} onChange={setDownPct} display={`${downPct}%`} />
          <div className={styles.sliderGroup}>
            <div className={styles.sliderHead}>
              <span className={styles.sliderName}>Loan Term</span>
              <span className={styles.sliderVal}>{term}yr</span>
            </div>
            <div className={styles.termBtns}>
              {[10, 15, 20, 30].map(t => (
                <button
                  key={t}
                  className={`${styles.termBtn} ${term === t ? styles.termActive : ''}`}
                  onClick={() => setTerm(t)}
                >
                  {t}yr
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.outputs}>
          <div className={styles.panelTitle}>Analysis Output</div>
          <div className={styles.outGrid}>
            <OutBox label="Price/SF"    val={`$${Math.round(out.psf)}`}   cls={out.psf < 390 ? styles.ok : out.psf < 460 ? styles.warn : styles.bad} />
            <OutBox label="vs Median"   val={`${out.delta >= 0 ? '+' : ''}${Math.round(out.delta)}%`} cls={out.delta < -5 ? styles.ok : out.delta < 10 ? styles.warn : styles.bad} />
            <OutBox label="All-In /SF"  val={`$${Math.round(out.allin)}`} cls={out.allin < 420 ? styles.ok : out.allin < ceilPsf ? styles.warn : styles.bad} />
            <OutBox label="Tax/Month"   val={`$${Math.round(out.taxMo / 100) * 100}/mo`} cls={tax < 22000 ? styles.ok : tax < 28000 ? styles.warn : styles.bad} />
            <OutBox label="Price Cut"   val={cut > 200000 ? 'Strong signal' : cut > 75000 ? 'Moderate' : cut > 0 ? 'Minimal' : 'No cut'} cls={cut > 200000 ? styles.ok : cut > 0 ? styles.warn : styles.bad} />
            <OutBox label="Score"       val={`${out.score}/100`} cls={out.score >= 70 ? styles.ok : out.score >= 50 ? styles.warn : styles.bad} />
            <OutBox label="Indicated Offer Range" val={`$${Math.round(out.lo/1000)}K – $${Math.round(out.hi/1000)}K`} full cls={styles.ok} />
          </div>

          <div className={styles.verdictBlock}>
            <div className={`${styles.verdict} ${verdictCls}`}>{out.verdict}</div>
            <div className={styles.verdictReason}>
              {out.flags.length ? out.flags.join('  ·  ') : 'No flags on this configuration.'}
            </div>
          </div>

          <div className={styles.mortPanel}>
            <div className={styles.mortTitle}>Mortgage Sensitivity</div>
            <div className={styles.mortPayment}>
              <span className={styles.mortPmt}>${out.monthlyPmt.toLocaleString()}/mo</span>
              <span className={styles.mortSub}>{rate.toFixed(3)}% · {term}yr · {downPct}% down</span>
            </div>
            <div className={styles.mortRow}>
              <span className={styles.mortLbl}>Down Payment</span>
              <span className={styles.mortVal}>${Math.round(out.downAmt / 1000)}K</span>
            </div>
            <div className={styles.mortRow}>
              <span className={styles.mortLbl}>Loan Amount</span>
              <span className={styles.mortVal}>${Math.round(out.loanAmt / 1000)}K</span>
            </div>
            <div className={styles.mortDivider} />
            <div className={styles.mortRateTable}>
              <div className={`${styles.mortRateRow} ${styles.mortRateLo}`}>
                <span>{out.loRate.toFixed(2)}%</span>
                <span>${out.loPayment.toLocaleString()}/mo</span>
              </div>
              <div className={`${styles.mortRateRow} ${styles.mortRateCur}`}>
                <span>{rate.toFixed(3)}%</span>
                <span>
                  ${out.monthlyPmt.toLocaleString()}/mo
                  <span className={styles.mortRateTag}>current</span>
                </span>
              </div>
              <div className={`${styles.mortRateRow} ${styles.mortRateHi}`}>
                <span>{out.hiRate.toFixed(2)}%</span>
                <span>${out.hiPayment.toLocaleString()}/mo</span>
              </div>
            </div>
            <div className={styles.mortDivider} />
            <div className={styles.mortCash}>
              <span className={styles.mortLbl}>Total Cash Needed</span>
              <span className={styles.mortCashVal}>${Math.round(out.cashNeeded / 1000)}K</span>
            </div>
            <div className={styles.mortCashBreak}>
              ${Math.round(out.downAmt / 1000)}K down
              {reno > 0 ? ` · $${Math.round(reno / 1000)}K reno` : ''}
              {' '}· ${Math.round(out.closing / 1000)}K closing (est. {ms.closingCostPct}%)
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function OutBox({ label, val, cls, full }) {
  return (
    <div className={`${styles.outBox} ${full ? styles.full : ''}`}>
      <div className={styles.outLabel}>{label}</div>
      <div className={`${styles.outVal} ${cls}`}>{val}</div>
    </div>
  )
}
