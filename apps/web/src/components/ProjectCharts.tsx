"use client"

import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  ResponsiveContainer 
} from "recharts"

interface ProjectChartsProps {
  data: Array<{
    subject: string;
    A: number;
    fullMark: number;
  }>
}

export function ProjectCharts({ data }: ProjectChartsProps) {
  if (!data || data.length === 0) return null;

  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid stroke="rgba(255,255,255,0.08)" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#8b8ba3', fontSize: 12, fontWeight: 500 }} />
          <Radar name="Scoring" dataKey="A" stroke="#8b7cff" fill="#8b7cff" fillOpacity={0.45} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
