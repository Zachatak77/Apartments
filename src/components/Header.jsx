import styles from './Header.module.css'

export default function Header({ title, subtitle, eyebrow, stats = [] }) {
  return (
    <header className={styles.hdr}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <div className={styles.titleBlock}>
            {eyebrow && <div className={styles.eyebrow}>{eyebrow}</div>}
            <h1 className={styles.title} dangerouslySetInnerHTML={{ __html: title }} />
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
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
