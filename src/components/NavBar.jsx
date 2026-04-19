import ThemeToggle from './ThemeToggle'
import styles from './NavBar.module.css'

export default function NavBar({ onMenuOpen, onBack, backLabel, theme, onToggleTheme }) {
  return (
    <div className={styles.bar}>
      {onBack ? (
        <button className={styles.back} onClick={onBack}>
          <svg className={styles.backArrow} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M10 13L5 8l5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {backLabel || 'Back'}
        </button>
      ) : (
        <button className={styles.hamburger} onClick={onMenuOpen} aria-label="Open menu">
          <span className={styles.line} />
          <span className={styles.line} />
          <span className={styles.line} />
        </button>
      )}
      <ThemeToggle theme={theme} onToggle={onToggleTheme} />
    </div>
  )
}
