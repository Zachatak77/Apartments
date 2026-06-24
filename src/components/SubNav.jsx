import styles from './SubNav.module.css'

// Lightweight segmented control for switching between views inside a single
// pool tab (Comps / Explore / Offers sub-views).
export default function SubNav({ tabs, active, onChange }) {
  return (
    <div className={styles.bar} role="tablist">
      {tabs.map(t => (
        <button
          key={t.id}
          role="tab"
          aria-selected={active === t.id}
          className={`${styles.btn} ${active === t.id ? styles.active : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
