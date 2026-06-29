/**
 * Sprint D3.2 — consumes pre-aggregated single-row metric from
 * kpi-service · faculty_performance, shape:
 *   { score_0_20: number, score_21_40: number, score_41_60: number,
 *     score_61_80: number, score_81_100: number, ... }
 * No client-side score binning.
 */
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export interface PerformanceRow {
  submission_count: number;
  graded_count: number;
  avg_score: number;
  score_0_20: number;
  score_21_40: number;
  score_41_60: number;
  score_61_80: number;
  score_81_100: number;
}

interface Props {
  row: PerformanceRow | null;
}

export const StudentPerformanceChart = ({ row }: Props) => {
  const data = [
    { range: '0-20',   count: row?.score_0_20   ?? 0 },
    { range: '21-40',  count: row?.score_21_40  ?? 0 },
    { range: '41-60',  count: row?.score_41_60  ?? 0 },
    { range: '61-80',  count: row?.score_61_80  ?? 0 },
    { range: '81-100', count: row?.score_81_100 ?? 0 },
  ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="range" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="count" fill="hsl(var(--primary))" name="Submissions" />
      </BarChart>
    </ResponsiveContainer>
  );
};
