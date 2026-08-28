import { supabase } from '@/integrations/supabase/client';
import { underChrist } from '@/lib/lordship';

export interface DashboardData {
  user_id: string;
  email: string | null;
  courses_enrolled: number;
  avg_progress: number;
  prayers_answered: number;
  total_prayers: number;
}

export const getDashboard = underChrist(async (userId: string) => {
  const { data, error } = await supabase
    .from('v_user_dashboard')
    .select('user_id,email,courses_enrolled,avg_progress,prayers_answered,total_prayers')
    .eq('user_id', userId)
    .single();

  if (error) throw error;
  return data as DashboardData;
});
