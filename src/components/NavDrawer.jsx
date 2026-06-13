import { POOL_TABS } from '../lib/tabs'
import styles from './NavDrawer.module.css'

const APP_NAV = [
  { id: 'dashboard',     label: 'Dashboard'      },
  { id: 'properties',    label: 'Properties'     },
  { id: 'modelSettings', label: 'Model Settings' },
  { id: 'profile',       label: 'Profile'        },
]

export default function NavDrawer({ open, onClose, view, pool, activeTab, onTabChange, onOpenCompare, onNavigate, user, onSignOut }) {
  return (
    <>
      <div
        className={`${styles.overlay} ${open ? styles.overlayVisible : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={`${styles.drawer} ${open ? styles.open : ''}`} aria-modal="true" role="dialog">
        <div className={styles.head}>
          <span className={styles.appName}>Comp Analysis</span>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close menu">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
              <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className={styles.body}>
          {view === 'pool' && pool && (
            <section className={styles.section}>
              <div className={styles.sectionLabel}>
                <svg viewBox="0 0 10 10" fill="currentColor" width="6" height="6" className={styles.sectionDot}>
                  <circle cx="5" cy="5" r="5" />
                </svg>
                {pool.name}
              </div>
              <button
                className={`${styles.item} ${styles.compareItem} ${view === 'compare' ? styles.active : ''}`}
                onClick={() => { onOpenCompare?.(); onClose() }}
              >
                ⚖ Compare &amp; Decide
                {view === 'compare' && (
                  <svg viewBox="0 0 8 8" fill="currentColor" width="5" height="5" className={styles.activeDot}>
                    <circle cx="4" cy="4" r="4" />
                  </svg>
                )}
              </button>
              {POOL_TABS.map(tab => (
                <button
                  key={tab.id}
                  className={`${styles.item} ${activeTab === tab.id ? styles.active : ''}`}
                  onClick={() => { onTabChange(tab.id); onClose() }}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <svg viewBox="0 0 8 8" fill="currentColor" width="5" height="5" className={styles.activeDot}>
                      <circle cx="4" cy="4" r="4" />
                    </svg>
                  )}
                </button>
              ))}
            </section>
          )}

          <section className={styles.section}>
            <div className={styles.sectionLabel}>Navigate</div>
            {APP_NAV.map(({ id, label }) => (
              <button
                key={id}
                className={`${styles.item} ${view === id ? styles.active : ''}`}
                onClick={() => onNavigate(id)}
              >
                {label}
                {view === id && (
                  <svg viewBox="0 0 8 8" fill="currentColor" width="5" height="5" className={styles.activeDot}>
                    <circle cx="4" cy="4" r="4" />
                  </svg>
                )}
              </button>
            ))}
          </section>
        </div>

        <div className={styles.footer}>
          {user?.email && <span className={styles.email}>{user.email}</span>}
          <button className={styles.signOut} onClick={onSignOut}>Sign out</button>
        </div>
      </aside>
    </>
  )
}
