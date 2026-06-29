/**
 * Sprint D3.2 — consumes pre-aggregated rows from
 * kpi-service · faculty_enrollment_trends, shape:
 *   { week: string (ISO date), enrollment_count: number, active_course_count: number }
 * No client-side bucketing or business logic.
 */
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, parseISO } from 'date-fns';

export interface EnrollmentTrendRow {
  week: string;
  enrollment_count: number;
  active_course_count: number;
}

interface Props {
  rows: EnrollmentTrendRow[];
}

export const EnrollmentTrendsChart = ({ rows }: Props) => {
  // Display-only mapping: format the week label. Server already sorted
  // by week desc; reverse for chronological x-axis.
  const data = [...rows].reverse().map((r) => ({
    label: r.week ? format(parseISO(r.week), 'MMM dd') : '—',
    enrollments: r.enrollment_count,
    courses: r.active_course_count,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="enrollments" stroke="hsl(var(--primary))" strokeWidth={2} name="Enrollments" />
        <Line type="monotone" dataKey="courses" stroke="hsl(var(--accent))" strokeWidth={2} name="Active courses" />
      </LineChart>
    </ResponsiveContainer>
  );
};
