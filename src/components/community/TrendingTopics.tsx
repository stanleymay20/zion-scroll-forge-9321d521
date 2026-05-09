/**
 * Trending Topics Component
 * Display trending hashtags
 */

import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { TrendingTopic } from '@/types/community';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Loader2 } from 'lucide-react';

interface TrendingTopicsProps {
  onHashtagClick: (hashtag: string) => void;
}

export const TrendingTopics: React.FC<TrendingTopicsProps> = ({ onHashtagClick }) => {
  const [topics, setTopics] = useState<TrendingTopic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrendingTopics();
  }, []);

  const loadTrendingTopics = async () => {
    try {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('community_posts')
        .select('id, content, tags, created_at')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;

      const counts = new Map<string, number>();
      const HASHTAG_RE = /#([\p{L}\p{N}_]+)/gu;
      (data ?? []).forEach((row: any) => {
        const fromTags: string[] = Array.isArray(row.tags) ? row.tags.filter(Boolean) : [];
        const fromContent = String(row.content ?? '').match(HASHTAG_RE)?.map(t => t.slice(1)) ?? [];
        [...fromTags, ...fromContent].forEach(raw => {
          const tag = String(raw).replace(/^#/, '').toLowerCase();
          if (!tag) return;
          counts.set(tag, (counts.get(tag) ?? 0) + 1);
        });
      });

      const sorted: TrendingTopic[] = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([hashtag, postCount], i) => ({
          id: `trend-${i}-${hashtag}`,
          hashtag,
          postCount,
        } as unknown as TrendingTopic));

      setTopics(sorted);
    } catch (error) {
      console.error('Error loading trending topics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
      </div>
    );
  }

  if (topics.length === 0) {
    return (
      <p className="text-sm text-gray-500">No trending topics yet</p>
    );
  }

  return (
    <div className="space-y-3">
      {topics.map((topic, index) => (
        <div
          key={topic.id}
          onClick={() => onHashtagClick(topic.hashtag)}
          className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold text-sm">
              {index + 1}
            </div>
            <div>
              <div className="font-semibold text-gray-900">#{topic.hashtag}</div>
              <div className="text-xs text-gray-500">{topic.postCount} posts</div>
            </div>
          </div>
          <TrendingUp className="w-4 h-4 text-blue-600" />
        </div>
      ))}
    </div>
  );
};
