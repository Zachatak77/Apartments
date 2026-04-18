import styles from './ThemeToggle.module.css'

export default function ThemeToggle({ theme, onToggle }) {
  return (
    <button className={styles.toggle} onClick={onToggle} aria-label="Toggle light/dark mode">
      <span className={styles.label}>{theme === 'light' ? 'Light' : 'Dark'}</span>
      <div className={styles.pip} data-dark={theme === 'dark'} />
    </button>
  )
}
