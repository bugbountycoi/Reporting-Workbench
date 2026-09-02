import { useState, useEffect } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import type { ChartConfig } from '../reports/types'
import { resolveColor, BC } from '../themes/brandColors'
import { useTheme } from '../themes/ThemeProvider'

interface Props {
  id: string
  config: ChartConfig
  data: Record<string, unknown>[]
}

const TYPE_LABELS: Record<string, string> = {
  bar: 'Bar',
  stackedBar: 'Stacked',
  line: 'Line',
}

export function ChartPanel({ id, config, data }: Props) {
  const { activeTheme } = useTheme()
  const [activeType, setActiveType] = useState<ChartConfig['type']>(config.type)

  useEffect(() => {
    setActiveType(config.type)
  }, [config.type])

  if (!data.length) return null

  const allowedTypes: Array<'bar' | 'stackedBar' | 'line'> =
    config.allowedChartTypes ?? ['bar', 'stackedBar', 'line']

  const tooManySeriesForLine = config.series.length > 5

  const commonProps = {
    data,
    margin: { top: 8, right: 16, left: 0, bottom: 4 },
  }

  const axisProps = { style: { fontSize: 11 } }
  const gridStroke = resolveColor(BC.grayLight)

  let chart: React.ReactNode

  if (activeType === 'donut') {
    chart = (
      <PieChart>
        <Pie
          data={data}
          dataKey={config.series[0]?.key ?? 'value'}
          nameKey={config.xKey}
          innerRadius="55%"
          outerRadius="80%"
          paddingAngle={2}
        >
          {data.map((_, index) => (
            <Cell key={index} fill={resolveColor(config.series[index % config.series.length]?.color ?? BC.blue)} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    )
  } else if (activeType === 'line') {
    chart = (
      <LineChart {...commonProps}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
        <XAxis dataKey={config.xKey} {...axisProps} />
        <YAxis {...axisProps} />
        <Tooltip />
        <Legend />
        {config.series.map((s) => (
          <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={resolveColor(s.color)} dot={false} strokeWidth={2} />
        ))}
      </LineChart>
    )
  } else if (activeType === 'stackedBar') {
    chart = (
      <BarChart {...commonProps}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
        <XAxis dataKey={config.xKey} {...axisProps} />
        <YAxis {...axisProps} />
        <Tooltip />
        <Legend />
        {config.series.map((s) => (
          <Bar key={s.key} dataKey={s.key} name={s.label} fill={resolveColor(s.color)} stackId="a" />
        ))}
      </BarChart>
    )
  } else {
    chart = (
      <BarChart {...commonProps}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
        <XAxis dataKey={config.xKey} {...axisProps} />
        <YAxis {...axisProps} />
        <Tooltip />
        <Legend />
        {config.series.map((s) => (
          <Bar key={s.key} dataKey={s.key} name={s.label} fill={resolveColor(s.color)} radius={[3, 3, 0, 0]} />
        ))}
      </BarChart>
    )
  }

  return (
    <div id={id} className="bg-white border border-gray-200 rounded-xl p-4 my-4 shadow-sm">
      {allowedTypes.length > 1 && (
        <div className="flex justify-end gap-1 mb-2">
          {allowedTypes.map((t) => {
            const isLineDisabled = t === 'line' && tooManySeriesForLine
            return (
              <button
                key={t}
                onClick={() => setActiveType(t)}
                disabled={isLineDisabled}
                title={isLineDisabled ? 'Too many series for a line chart' : undefined}
                className={`px-2.5 py-0.5 text-xs rounded border font-medium transition-colors ${
                  activeType === t
                    ? 'bg-brand-navy text-white border-brand-navy'
                    : isLineDisabled
                    ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                    : 'border-gray-300 text-gray-500 hover:border-brand-blue hover:text-brand-blue'
                }`}
              >
                {TYPE_LABELS[t]}
              </button>
            )
          })}
        </div>
      )}
      {/* key={activeTheme.id} forces chart remount on theme switch so resolveColor() picks up new CSS var values */}
      <ResponsiveContainer key={activeTheme.id} width="100%" height={280}>
        {chart as React.ReactElement}
      </ResponsiveContainer>
    </div>
  )
}
