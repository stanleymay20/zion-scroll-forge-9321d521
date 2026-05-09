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
      const response = await legacyApiCall('/api/community/trending?limit=10', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to load trending topics');

      const data = await response.json();
      setTopics(data.topics);
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
