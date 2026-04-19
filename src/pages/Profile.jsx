import { useState } from 'react'
import { loadMortgagePrefs, saveMortgagePrefs } from '../lib/mortgage'
import Header from '../components/Header'
import styles from './Profile.module.css'

function Slider({ label, min, max, step, value, onChange, display }) {
  return (
    <div className={styles.sliderGroup}>
      <div className={styles.sliderHead}>
        <span className={styles.sliderLabel}>{label}</span>
        <span className={styles.sliderVal}>{display}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(+e.target.value)} />
    </div>
  )
}

export default function Profile({ user }) {
  const [prefs, setPrefs] = useState(loadMortgagePrefs)
  const [saved, setSaved] = useState(false)

  function update(key, val) {
    setPrefs(p => ({ ...p, [key]: val }))
    setSaved(false)
  }

  function save() {
    saveMortgagePrefs(prefs)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div>
      <Header
        title="Profile"
        eyebrow={user.email}
      />
      <div className={styles.page}>
        <div className="sl">Financing defaults</div>
        <h2 className={styles.pageTitle}>Mortgage Preferences</h2>
        <p className={styles.sub}>
          Set your baseline financing assumptions. These populate the Scenario tab&apos;s mortgage
          sensitivity panel by default — you can override them per session without affecting
          these saved preferences.
        </p>

        <div className={styles.card}>
          <div className={styles.cardTitle}>Financing Parameters</div>

          <Slider
            label="Interest Rate"
            min={3} max={10} step={0.125}
            value={prefs.rate}
            onChange={v => update('rate', v)}
            display={`${prefs.rate.toFixed(3)}%`}
          />

          <Slider
            label="Down Payment"
            min={5} max={50} step={5}
            value={prefs.downPct}
            onChange={v => update('downPct', v)}
            display={`${prefs.downPct}%`}
          />

          <div className={styles.fieldGroup}>
            <div className={styles.fieldHead}>
              <span className={styles.sliderLabel}>Loan Term</span>
              <span className={styles.sliderVal}>{prefs.term}yr</span>
            </div>
            <div className={styles.termBtns}>
              {[10, 15, 20, 30].map(t => (
                <button
                  key={t}
                  className={`${styles.termBtn} ${prefs.term === t ? styles.termActive : ''}`}
                  onClick={() => update('term', t)}
                >
                  {t}yr
                </button>
              ))}
            </div>
          </div>

          <div className={styles.divider} />

          <div className={styles.sectionLabel}>Tax Parameters</div>

          <Slider
            label="Marginal Tax Rate"
            min={10} max={50} step={1}
            value={prefs.taxRate ?? 32}
            onChange={v => update('taxRate', v)}
            display={`${prefs.taxRate ?? 32}%`}
          />
          <p className={styles.taxHint}>
            Combined federal + state marginal rate. Used to compute after-tax carrying costs
            in the Cost Comparison tab. Mortgage interest deduction applies to the first
            $750K of loan principal (TCJA 2017).
          </p>

          <div className={styles.actions}>
            <button
              className={`${styles.saveBtn} ${saved ? styles.saveDone : ''}`}
              onClick={save}
            >
              {saved ? 'Saved ✓' : 'Save Preferences'}
            </button>
            {saved && (
              <span className={styles.savedNote}>
                Saved — Scenario and Cost Comparison tabs will use these on next visit.
              </span>
            )}
          </div>
        </div>

        <div className={styles.hint}>
          <div className={styles.hintTitle}>How this is used</div>
          <p>The <strong>Scenario tab</strong> reads rate, down payment, and term as defaults
          (overridable per session). The <strong>Cost Comparison tab</strong> uses all four
          parameters — including marginal tax rate — to compute after-tax monthly carrying
          costs for every property in the pool.</p>
        </div>
      </div>
    </div>
  )
}
