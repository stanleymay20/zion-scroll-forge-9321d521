/**
 * Sprint D3.2 — consumes pre-aggregated rows from
 * kpi-service · faculty_ai_tutor_usage, shape:
 *   { week: string, session_count: number, total_messages: number, ... }
 * No client-side bucketing.
 */
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, parseISO } from 'date-fns';

export interface AITutorUsageRow {
  week: string;
  session_count: number;
  total_messages: number;
  avg_satisfaction: number;
  satisfaction_response_count: number;
}

interface Props {
  rows: AITutorUsageRow[];
}

export const AITutorUsageChart = ({ rows }: Props) => {
  const data = [...rows].reverse().map((r) => ({
    label: r.week ? format(parseISO(r.week), 'MMM dd') : '—',
    sessions: r.session_count,
    messages: r.total_messages,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Area type="monotone" dataKey="sessions" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" />
        <Area type="monotone" dataKey="messages" stackId="2" stroke="hsl(var(--accent))" fill="hsl(var(--accent))" />
      </AreaChart>
    </ResponsiveContainer>
  );
};
