import { useState, useEffect } from 'react'
import { loadModelSettings, saveModelSettings, MODEL_DEFAULTS } from '../lib/modelSettings'
import {
  fetchCalibrationSummary,
  fetchAllPoolDatasets,
  gridSearch,
} from '../lib/calibration'
import { supabase } from '../lib/supabase'
import Header from '../components/Header'
import styles from './ModelSettings.module.css'

function Slider({ label, min, max, step = 1, value, onChange, display, hint }) {
  return (
    <div className={styles.sliderGroup}>
      <div className={styles.sliderHead}>
        <span className={styles.sliderLabel}>{label}</span>
        <span className={styles.sliderVal}>{display}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(+e.target.value)} />
      {hint && <div className={styles.hint}>{hint}</div>}
    </div>
  )
}

function NumInput({ label, value, onChange, prefix, suffix, min, max, step = 1, hint }) {
  return (
    <div className={styles.fieldGroup}>
      <div className={styles.fieldHead}>
        <span className={styles.sliderLabel}>{label}</span>
        {hint && <span className={styles.fieldHint}>{hint}</span>}
      </div>
      <div className={styles.inputWrap}>
        {prefix && <span className={styles.inputAdorn}>{prefix}</span>}
        <input
          className={styles.numInput}
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(+e.target.value)}
        />
        {suffix && <span className={styles.inputAdorn}>{suffix}</span>}
      </div>
    </div>
  )
}

export default function ModelSettings({ user }) {
  const [s, setS]     = useState(loadModelSettings)
  const [saved, setSaved] = useState(false)

  const [calibSummary, setCalibSummary] = useState(null)
  const [calibRunning, setCalibRunning] = useState(false)
  const [calibResult,  setCalibResult]  = useState(null)

  useEffect(() => {
    fetchCalibrationSummary(supabase, user.id).then(setCalibSummary)
  }, [user.id])

  async function runCalibration() {
    setCalibRunning(true)
    setCalibResult(null)
    const datasets = await fetchAllPoolDatasets(supabase, user.id)
    await new Promise(r => setTimeout(r, 0))
    const result = gridSearch(datasets, s)
    setCalibResult(result)
    setCalibRunning(false)
  }

  function applyCalibration() {
    const { candidate } = calibResult.best
    const updated = {
      ...s,
      predFvWeight:    candidate.predFvWeight,
      taxCapMultiple:  candidate.taxCapMultiple,
      predDomDiscount: candidate.predDomDiscount,
    }
    setS(updated)
    saveModelSettings(updated)
    setCalibResult(null)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function update(key, val) {
    setS(p => ({ ...p, [key]: val }))
    setSaved(false)
  }

  function save() {
    saveModelSettings(s)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function reset() {
    setS({ ...MODEL_DEFAULTS })
    saveModelSettings({ ...MODEL_DEFAULTS })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const weightTotal = s.wPsf + s.wTax + s.wSqft + s.wLot + s.wAge + s.wMarket + (s.wMonthly ?? 0)
  const weightOk    = weightTotal === 100

  return (
    <div>
      <Header
        title="Model Settings"
        eyebrow={user.email}
      />
      <div className={styles.page}>
        <div className="sl">Scoring & analysis</div>
        <h2 className={styles.pageTitle}>Model Configuration</h2>
        <p className={styles.sub}>
          Override the weights and thresholds that drive scores, verdicts, flags, and carrying-cost estimates.
          Changes take effect immediately on your next pool view.
        </p>

        {/* Scoring weights */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>
            Scoring Weights
            <span className={`${styles.weightTotal} ${weightOk ? styles.weightOk : styles.weightBad}`}>
              Total: {weightTotal}
            </span>
          </div>
          <p className={styles.cardSub}>
            Controls how much each attribute contributes to the composite score (0–100).
            Weights should sum to 100.
          </p>

          <Slider label="$/SF"           min={0} max={60} value={s.wPsf}    onChange={v => update('wPsf', v)}    display={`${s.wPsf}%`}    hint="Price per square foot — lower is better" />
          <Slider label="Annual Taxes"   min={0} max={60} value={s.wTax}    onChange={v => update('wTax', v)}    display={`${s.wTax}%`}    hint="Annual property tax burden" />
          <Slider label="Interior Size"  min={0} max={40} value={s.wSqft}   onChange={v => update('wSqft', v)}   display={`${s.wSqft}%`}   hint="Interior square footage — larger is better" />
          <Slider label="Lot Size"       min={0} max={40} value={s.wLot}    onChange={v => update('wLot', v)}    display={`${s.wLot}%`}    hint="Lot square footage — larger is better" />
          <Slider label="Year Built"     min={0} max={40} value={s.wAge}    onChange={v => update('wAge', v)}    display={`${s.wAge}%`}    hint="Construction vintage — newer is better" />
          <Slider label="Market Signal"  min={0} max={40} value={s.wMarket}  onChange={v => update('wMarket', v)}  display={`${s.wMarket}%`}          hint="DOM and over-ask signal — used in Heatmap & detail modal" />
          <Slider label="Monthly Cost"   min={0} max={40} value={s.wMonthly ?? 0} onChange={v => update('wMonthly', v)} display={`${s.wMonthly ?? 0}%`} hint="Est. P&I + tax + insurance — lower monthly is better" />

          {!weightOk && (
            <div className={styles.weightWarn}>
              Weights sum to {weightTotal} — adjust to 100 for accurate scoring.
              {weightTotal !== 100 && <button className={styles.autoBtn} onClick={() => {
                const diff = 100 - weightTotal
                update('wPsf', s.wPsf + diff)
              }}>Auto-adjust $/SF</button>}
            </div>
          )}
        </div>

        {/* Verdict thresholds */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>Verdict Thresholds</div>
          <p className={styles.cardSub}>
            Score cutoffs for the Strong Buy / Consider / Pass verdict in the Scenario tab.
          </p>

          <Slider label="Strong Buy — minimum score" min={50} max={95} value={s.strongBuyScore} onChange={v => update('strongBuyScore', v)} display={`${s.strongBuyScore}/100`} />
          <Slider label="Consider — minimum score"   min={20} max={80} value={s.considerScore}  onChange={v => update('considerScore', v)}  display={`${s.considerScore}/100`}
            hint={`Score ${s.considerScore}–${s.strongBuyScore - 1} = Consider · Below ${s.considerScore} = Pass`}
          />
        </div>

        {/* Flag thresholds */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>Flag Thresholds</div>
          <p className={styles.cardSub}>
            Trigger points for positive and negative signals surfaced in Scenario flags.
          </p>

          <div className={styles.fieldGrid}>
            <NumInput label="$/SF Buy Zone ceiling"   value={s.psfBuyZone}     onChange={v => update('psfBuyZone', v)}     prefix="$" suffix="/SF" min={200} max={800} hint="Below = buy signal" />
            <NumInput label="$/SF Concern floor"      value={s.psfAbove}       onChange={v => update('psfAbove', v)}       prefix="$" suffix="/SF" min={200} max={900} hint="Above = concern" />
            <NumInput label="High tax threshold"      value={s.taxHighThresh}  onChange={v => update('taxHighThresh', v)}  prefix="$" suffix="/yr" min={5000} max={100000} step={1000} hint="Annual tax above = high carry" />
            <NumInput label="DOM leverage threshold"  value={s.domLeverage}    onChange={v => update('domLeverage', v)}    suffix="days" min={5} max={180} hint="DOM above = negotiating leverage" />
            <NumInput label="Large cut threshold"     value={s.largeCutThresh} onChange={v => update('largeCutThresh', v)} prefix="$" min={25000} max={500000} step={5000} hint="Price cut above = motivated seller" />
          </div>
        </div>

        {/* Carrying cost assumptions */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>Carrying Cost Assumptions</div>
          <p className={styles.cardSub}>
            Used in the Cost Comparison tab and Scenario tab cash-needed calculation.
          </p>

          <Slider label="Insurance Rate"    min={0.1} max={2.0} step={0.1} value={s.insuranceRate}  onChange={v => update('insuranceRate', v)}  display={`${s.insuranceRate.toFixed(1)}% of price/yr`} hint="Annual homeowner's insurance as % of purchase price" />
          <Slider label="Closing Cost Est." min={0.5} max={5.0} step={0.25} value={s.closingCostPct} onChange={v => update('closingCostPct', v)} display={`${s.closingCostPct.toFixed(2)}%`}             hint="Title, transfer tax, attorney, lender fees" />
        </div>

        {/* Predicted Close */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>Predicted Close</div>
          <p className={styles.cardSub}>
            Controls how the predicted closing price is calculated from fair value and observed sale-to-list ratios.
            Higher fair value weight anchors the prediction to intrinsic value; lower weight follows the market ask.
          </p>

          <Slider
            label="Fair Value Anchor Weight"
            min={30} max={80} step={5}
            value={s.predFvWeight ?? 55}
            onChange={v => update('predFvWeight', v)}
            display={`${s.predFvWeight ?? 55}%`}
            hint="Base weight of fair value in the blended prediction. Higher = fair value dominates; lower = market ask anchors the result."
          />

          <Slider
            label="Stale Listing Discount (60+ DOM)"
            min={0} max={15} step={0.5}
            value={s.predDomDiscount ?? 6}
            onChange={v => update('predDomDiscount', v)}
            display={`${(s.predDomDiscount ?? 6).toFixed(1)}%`}
            hint={`Extra discount applied to predicted close when DOM > 60. Scales to ${((s.predDomDiscount ?? 6) * 0.667).toFixed(1)}% for 30–60 DOM and ${((s.predDomDiscount ?? 6) * 0.333).toFixed(1)}% for 14–30 DOM.`}
          />

          <Slider
            label="Price Cut Penalty"
            min={0} max={5} step={0.5}
            value={s.predCutDiscount ?? 1.5}
            onChange={v => update('predCutDiscount', v)}
            display={`${(s.predCutDiscount ?? 1.5).toFixed(1)}%`}
            hint="Additional haircut to predicted close when the seller has already reduced the listing price."
          />
        </div>

        {/* Likely Outcome Classifier */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>Likely Outcome Classifier</div>
          <p className={styles.cardSub}>
            Calibrates the five-signal pessimism model that predicts whether a listing goes
            over ask, near ask, under ask, cuts price, or remains active.
          </p>

          <Slider
            label="Fresh Listing Threshold"
            min={3} max={14} step={1}
            value={s.outcomeHotDom ?? 7}
            onChange={v => update('outcomeHotDom', v)}
            display={`${s.outcomeHotDom ?? 7} days`}
            hint={`Listings with DOM below ${s.outcomeHotDom ?? 7} get a bullish signal. DOM up to ${(s.outcomeHotDom ?? 7) * 2} days is treated as neutral.`}
          />

          <Slider
            label="Market Stall Threshold"
            min={15} max={60} step={5}
            value={s.outcomeStallDom ?? 30}
            onChange={v => update('outcomeStallDom', v)}
            display={`${s.outcomeStallDom ?? 30} days`}
            hint="DOM above this triggers a bearish signal. Above 60 days adds maximum pessimism toward price cut or remain active."
          />

          <Slider
            label="Overpriced Ask Threshold"
            min={2} max={15} step={1}
            value={s.outcomeOverpricedPct ?? 5}
            onChange={v => update('outcomeOverpricedPct', v)}
            display={`${s.outcomeOverpricedPct ?? 5}%`}
            hint={`Ask more than ${s.outcomeOverpricedPct ?? 5}% above fair value shifts outcome toward under ask. ${(s.outcomeOverpricedPct ?? 5) + 7}%+ above fair value triggers price cut / remain active signals.`}
          />
        </div>

        {/* Calibration */}
        <div className={styles.calibCard}>
          <div className={styles.cardTitle}>Auto-Calibrate from Your Data</div>
          <p className={styles.cardSub}>
            Runs leave-one-out cross-validation across all your closed comps to find the
            Fair Value Weight, Tax Cap Multiple, and Stale DOM Discount that minimize
            prediction error. Requires at least one pool with 4+ closed sales.
          </p>

          {calibSummary && (
            <div className={styles.calibSummary}>
              {calibSummary.qualifyingPools === 0
                ? `No qualifying pools yet — add at least 4 closed comps to a pool to enable calibration.`
                : `${calibSummary.totalClosed} closed comp${calibSummary.totalClosed !== 1 ? 's' : ''} across ${calibSummary.qualifyingPools} qualifying pool${calibSummary.qualifyingPools !== 1 ? 's' : ''}`
              }
            </div>
          )}

          {!calibRunning && !calibResult && (
            <button
              className={styles.calibBtn}
              onClick={runCalibration}
              disabled={!calibSummary || calibSummary.qualifyingPools === 0}
            >
              Calibrate Model
            </button>
          )}

          {calibRunning && (
            <div className={styles.calibProgress}>
              <span className={styles.calibSpinner} />
              Evaluating 384 parameter combinations…
            </div>
          )}

          {calibResult && (() => {
            const { best, currentResult } = calibResult
            const improved = best && best.result.mape < (currentResult?.mape ?? Infinity)
            const mapeImprovement = currentResult && best
              ? (currentResult.mape - best.result.mape).toFixed(2)
              : null

            return (
              <div className={styles.calibResults}>
                <div className={styles.calibMapeRow}>
                  <span className={styles.calibMapeLabel}>Current</span>
                  <span className={styles.calibMapeVal}>
                    {currentResult ? `${currentResult.mape.toFixed(1)}% avg error · $${currentResult.mae.toLocaleString()} MAE` : '—'}
                  </span>
                </div>
                {improved && (
                  <div className={`${styles.calibMapeRow} ${styles.calibMapeImproved}`}>
                    <span className={styles.calibMapeLabel}>Calibrated</span>
                    <span className={styles.calibMapeVal}>
                      {best.result.mape.toFixed(1)}% avg error · ${best.result.mae.toLocaleString()} MAE
                      {mapeImprovement > 0 && <span className={styles.calibDelta}>↓{mapeImprovement} pp</span>}
                    </span>
                  </div>
                )}

                {improved ? (
                  <>
                    <div className={styles.calibParamTable}>
                      {[
                        ['Fair Value Weight',   `${s.predFvWeight ?? 55}%`,            `${best.candidate.predFvWeight}%`],
                        ['Tax Cap Multiple',    `${s.taxCapMultiple ?? 11}×`,           `${best.candidate.taxCapMultiple}×`],
                        ['Stale DOM Discount',  `${(s.predDomDiscount ?? 6).toFixed(1)}%`, `${best.candidate.predDomDiscount.toFixed(1)}%`],
                      ].map(([label, before, after]) => (
                        <div key={label} className={styles.calibParamRow}>
                          <span className={styles.calibParamLabel}>{label}</span>
                          <span className={styles.calibParamBefore}>{before}</span>
                          <span className={styles.calibParamArrow}>→</span>
                          <span className={styles.calibParamAfter}>{after}</span>
                        </div>
                      ))}
                    </div>
                    <div className={styles.calibActions}>
                      <button className={styles.calibApplyBtn} onClick={applyCalibration}>
                        Apply Calibrated Settings
                      </button>
                      <button className={styles.calibDismissBtn} onClick={() => setCalibResult(null)}>
                        Dismiss
                      </button>
                    </div>
                  </>
                ) : (
                  <div className={styles.calibNoGain}>
                    Current settings are already well-calibrated — no improvement found.
                    <button className={styles.calibDismissBtn} onClick={() => setCalibResult(null)}>
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            )
          })()}
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <button className={`${styles.saveBtn} ${saved ? styles.saveDone : ''}`} onClick={save}>
            {saved ? 'Saved ✓' : 'Save Settings'}
          </button>
          <button className={styles.resetBtn} onClick={reset}>
            Reset to Defaults
          </button>
          {saved && <span className={styles.savedNote}>Settings saved — active on next pool view.</span>}
        </div>
      </div>
    </div>
  )
}
