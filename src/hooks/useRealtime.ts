import React, { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useRealtimeSubscriptions = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    console.info('✝️ Jesus Christ is Lord - Initializing realtime subscriptions');

    const channel = supabase
      .channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'enrollments' }, () => {
        queryClient.invalidateQueries({ queryKey: ['enrollments'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_conversations' }, () => {
        queryClient.invalidateQueries({ queryKey: ['ai-conversations'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'learning_patterns' }, () => {
        queryClient.invalidateQueries({ queryKey: ['learning-pattern'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prayer_journal' }, () => {
        queryClient.invalidateQueries({ queryKey: ['prayers'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'intervention_alerts' }, () => {
        queryClient.invalidateQueries({ queryKey: ['intervention-alerts'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => {
        queryClient.invalidateQueries({ queryKey: ['student-profile'] });
        queryClient.invalidateQueries({ queryKey: ['pending-applications'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, () => {
        queryClient.invalidateQueries({ queryKey: ['submissions'] });
        queryClient.invalidateQueries({ queryKey: ['grading-queue'] });
        queryClient.invalidateQueries({ queryKey: ['gradebook'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'grades' }, () => {
        queryClient.invalidateQueries({ queryKey: ['grades'] });
        queryClient.invalidateQueries({ queryKey: ['gradebook'] });
        queryClient.invalidateQueries({ queryKey: ['grading-queue'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments' }, () => {
        queryClient.invalidateQueries({ queryKey: ['assignments'] });
        queryClient.invalidateQueries({ queryKey: ['gradebook'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};
