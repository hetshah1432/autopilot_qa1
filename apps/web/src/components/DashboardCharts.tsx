'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

const STROKE = "#8b7cff"
const STROKE_SOFT = "#22d3ee"

interface DashboardChartsProps {
  data: Array<{ name: string; uniqueName: string; score: number }>
}

export function DashboardCharts({ data }: DashboardChartsProps) {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <defs>
            <linearGradient id="score-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={STROKE} stopOpacity={0.35} />
              <stop offset="50%" stopColor={STROKE_SOFT} stopOpacity={0.12} />
              <stop offset="95%" stopColor={STROKE} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="uniqueName"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#8b8ba3", fontSize: 10 }}
            dy={16}
            interval="preserveStartEnd"
            minTickGap={30}
            tickFormatter={(val) => val.split(" - ")[0] || val}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#8b8ba3", fontSize: 10 }}
            domain={[0, 100]}
            width={30}
          />
          <Tooltip
            labelFormatter={(label) => label}
            contentStyle={{
              backgroundColor: "rgba(20, 20, 31, 0.95)",
              borderRadius: "14px",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 16px 40px -12px rgba(0,0,0,0.6), 0 0 24px -8px rgba(139,124,255,0.35)",
              backdropFilter: "blur(12px)",
            }}
            itemStyle={{ color: STROKE, fontWeight: "bold" }}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke={STROKE}
            strokeWidth={3}
            dot={{ fill: STROKE_SOFT, strokeWidth: 2, stroke: STROKE, r: 4 }}
            activeDot={{ r: 8, stroke: STROKE_SOFT, strokeWidth: 2, fill: STROKE }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
