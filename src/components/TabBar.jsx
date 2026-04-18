import { useRef } from 'react'
import styles from './TabBar.module.css'

export default function TabBar({ tabs, active, onChange }) {
  const barRef = useRef(null)

  const handleClick = (id, el) => {
    onChange(id)
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }

  return (
    <nav className={`${styles.bar} no-scrollbar`} ref={barRef}>
      {tabs.map(({ id, label }) => (
        <button
          key={id}
          className={`${styles.tab} ${active === id ? styles.active : ''}`}
          onClick={e => handleClick(id, e.currentTarget)}
        >
          {label}
        </button>
      ))}
    </nav>
  )
}
