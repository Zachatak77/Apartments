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

export default function Profile({ user, theme, onToggleTheme, onBack }) {
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
        theme={theme}
        onToggleTheme={onToggleTheme}
        onBack={onBack}
        backLabel="Dashboard"
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

          <div className={styles.actions}>
            <button
              className={`${styles.saveBtn} ${saved ? styles.saveDone : ''}`}
              onClick={save}
            >
              {saved ? 'Saved ✓' : 'Save Preferences'}
            </button>
            {saved && (
              <span className={styles.savedNote}>
                Preferences saved — Scenario tab will use these on next visit.
              </span>
            )}
          </div>
        </div>

        <div className={styles.hint}>
          <div className={styles.hintTitle}>How this is used</div>
          <p>The <strong>Scenario tab</strong> reads these defaults to populate the Mortgage
          Sensitivity panel. For any active session you can drag the rate/down sliders in the
          Scenario tab to explore &ldquo;what if&rdquo; scenarios — those overrides are not saved
          here.</p>
        </div>
      </div>
    </div>
  )
}
