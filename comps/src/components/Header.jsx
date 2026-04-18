import ThemeToggle from './ThemeToggle'
import styles from './Header.module.css'

export default function Header({ title, subtitle, eyebrow, stats = [], theme, onToggleTheme, onBack, backLabel }) {
  return (
    <header className={styles.hdr}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <div className={styles.titleBlock}>
            {onBack && (
              <button className={styles.back} onClick={onBack}>
                ← {backLabel || 'Back'}
              </button>
            )}
            {eyebrow && <div className={styles.eyebrow}>{eyebrow}</div>}
            <h1 className={styles.title} dangerouslySetInnerHTML={{ __html: title }} />
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
        {stats.length > 0 && (
          <div className={`${styles.stats} no-scrollbar`}>
            {stats.map((s, i) => (
              <div key={i} className={styles.statPill}>
                <span className={styles.statVal} dangerouslySetInnerHTML={{ __html: s.value }} />
                <span className={styles.statLbl}>{s.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </header>
  )
}
