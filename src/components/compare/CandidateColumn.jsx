import ScoreGauge from '../charts/ScoreGauge'
import { DIMENSIONS, OUTCOME_LABEL, fmtPrice, fmtSigned, fmtPct } from './compareUtils'
import styles from './CandidateColumn.module.css'

function verdict(score) {
  if (score >= 70) return { label: 'Strong', cls: styles.vStrong }
  if (score >= 50) return { label: 'Consider', cls: styles.vConsider }
  return { label: 'Pass', cls: styles.vPass }
}

export default function CandidateColumn({ data, rank, recommended, decided, onDecide, onDetails }) {
  const { comp, score, sub, fv, pred, out, off, ask, gap, gapPct } = data
  const v = verdict(score)
  const gapPositive = gap != null && gap > 0   // ask above fair = premium

  return (
    <div className={`${styles.card} ${decided ? styles.cardDecided : ''} ${recommended ? styles.cardRec : ''}`}>
      {recommended && <div className={styles.recRibbon}>Recommended</div>}

      <div className={styles.head}>
        <span className={styles.rank}>#{rank}</span>
        <div className={styles.titleWrap}>
          <button className={styles.addr} onClick={onDetails} title="Open detail">{comp.address}</button>
          {comp.town && <span className={styles.town}>{comp.town}</span>}
        </div>
        <span className={styles.statusChip}>Active</span>
      </div>

      {/* Composite score */}
      <div className={styles.scoreRow}>
        <ScoreGauge score={score} size={84} label="Composite" />
        <div className={styles.scoreMeta}>
          <span className={`${styles.verdict} ${v.cls}`}>{v.label}</span>
          <span className={styles.scoreLbl}>weighted score</span>
        </div>
      </div>

      {/* Pricing decision metrics */}
      <div className={styles.metrics}>
        <div className={styles.metric}>
          <span className={styles.mLbl}>Ask</span>
          <span className={styles.mVal}>{fmtPrice(ask)}</span>
        </div>
        <div className={styles.metric}>
          <span className={styles.mLbl}>Fair value</span>
          <span className={styles.mVal}>{fv ? fmtPrice(fv.fairValue) : '—'}</span>
        </div>
        <div className={styles.metric}>
          <span className={styles.mLbl}>Ask vs fair</span>
          <span className={`${styles.mVal} ${gap == null ? '' : gapPositive ? styles.bad : styles.good}`}>
            {gap == null ? '—' : `${fmtSigned(gap)} (${fmtPct(gapPct)})`}
          </span>
        </div>
        <div className={styles.metric}>
          <span className={styles.mLbl}>Offer range</span>
          <span className={styles.mVal}>{off ? `${fmtPrice(off.lo)} – ${fmtPrice(off.hi)}` : '—'}</span>
        </div>
        <div className={styles.metric}>
          <span className={styles.mLbl}>Pred. close</span>
          <span className={styles.mVal}>
            {pred ? fmtPrice(pred.predicted) : '—'}
            {pred && <span className={pred.vsAsk < 0 ? styles.subDown : styles.subUp}> {fmtSigned(pred.vsAsk)} vs ask</span>}
          </span>
        </div>
      </div>

      {/* Likely outcome */}
      {out && (
        <div className={`${styles.outcome} ${styles['out_' + out.outcome]}`}>
          <span className={styles.outLabel}>{OUTCOME_LABEL[out.outcome]}</span>
          <span className={styles.outCnf}>{out.confidence} confidence</span>
        </div>
      )}

      {/* Dimension mini-bars */}
      <div className={styles.dims}>
        {DIMENSIONS.map(d => {
          const val = sub[d.key] ?? 0
          return (
            <div key={d.key} className={styles.dimRow} title={d.hint}>
              <span className={styles.dimLbl}>{d.label}</span>
              <div className={styles.dimTrack}>
                <div className={styles.dimFill} style={{ width: `${(val / 3) * 100}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      <div className={styles.actions}>
        <button className={`${styles.decideBtn} ${decided ? styles.decideOn : ''}`} onClick={onDecide}>
          {decided ? '★ Top choice' : '☆ Mark top choice'}
        </button>
        <button className={styles.detailsBtn} onClick={onDetails}>Details</button>
      </div>
    </div>
  )
}
