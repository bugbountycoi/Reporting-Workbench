import type { SummaryCard } from '../reports/types'

const TREND_ICON = {
  up: '↑',
  down: '↓',
  neutral: '',
}

const TREND_COLOR = {
  up: 'text-brand-green',
  down: 'text-brand-red',
  neutral: 'text-brand-gray-mid',
}

interface Props {
  cards: SummaryCard[]
}

export function SummaryCards({ cards }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
      {cards.map((card, i) => (
        <div key={i} className="bg-white border border-brand-gray-light rounded-xl p-4 shadow-sm">
          <div className="text-xs font-bold text-brand-gray-dark mb-1 uppercase tracking-widest font-body">{card.label}</div>
          <div className="flex items-end gap-1.5">
            <span className="text-2xl font-heading font-semibold text-brand-navy">{card.value}</span>
            {card.trend && card.trend !== 'neutral' && (
              <span className={`text-sm font-semibold mb-0.5 ${TREND_COLOR[card.trend]}`}>
                {TREND_ICON[card.trend]}
              </span>
            )}
          </div>
          {card.subValue && <div className="text-xs text-brand-gray-mid mt-0.5">{card.subValue}</div>}
        </div>
      ))}
    </div>
  )
}
