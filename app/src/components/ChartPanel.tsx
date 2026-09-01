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

interface Props {
  id: string
  config: ChartConfig
  data: Record<string, unknown>[]
}

export function ChartPanel({ id, config, data }: Props) {
  if (!data.length) return null

  const commonProps = {
    data,
    margin: { top: 8, right: 16, left: 0, bottom: 4 },
  }

  const axisProps = {
    style: { fontSize: 11 },
  }

  let chart: React.ReactNode

  if (config.type === 'donut') {
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
            <Cell key={index} fill={config.series[index % config.series.length]?.color ?? '#4C59A8'} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    )
  } else if (config.type === 'line') {
    chart = (
      <LineChart {...commonProps}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey={config.xKey} {...axisProps} />
        <YAxis {...axisProps} />
        <Tooltip />
        <Legend />
        {config.series.map((s) => (
          <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} dot={false} strokeWidth={2} />
        ))}
      </LineChart>
    )
  } else if (config.type === 'stackedBar') {
    chart = (
      <BarChart {...commonProps}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey={config.xKey} {...axisProps} />
        <YAxis {...axisProps} />
        <Tooltip />
        <Legend />
        {config.series.map((s) => (
          <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} stackId="a" />
        ))}
      </BarChart>
    )
  } else {
    // default: grouped bar
    chart = (
      <BarChart {...commonProps}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey={config.xKey} {...axisProps} />
        <YAxis {...axisProps} />
        <Tooltip />
        <Legend />
        {config.series.map((s) => (
          <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[3, 3, 0, 0]} />
        ))}
      </BarChart>
    )
  }

  return (
    <div id={id} className="bg-white border border-gray-200 rounded-xl p-4 my-4 shadow-sm">
      <ResponsiveContainer width="100%" height={280}>
        {chart as React.ReactElement}
      </ResponsiveContainer>
    </div>
  )
}
