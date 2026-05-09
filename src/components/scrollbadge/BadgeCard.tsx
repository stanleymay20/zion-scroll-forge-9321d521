/**
 * Badge Card Component
 * "By the Spirit of Excellence, we display individual credentials"
 * 
 * Component for displaying a single badge in grid or list view
 */

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, Calendar, TrendingUp, Lock, Eye, ExternalLink } from 'lucide-react';
import { ScrollBadge, BadgeCredentialType } from '@/types/scrollbadge';
import { format } from 'date-fns';

interface BadgeCardProps {
  badge: ScrollBadge;
  viewMode: 'grid' | 'list';
  onClick: () => void;
  isOwnProfile?: boolean;
}

export const BadgeCard: React.FC<BadgeCardProps> = ({
  badge,
  viewMode,
  onClick,
  isOwnProfile = false
}) => {
  const getCredentialTypeLabel = (type: BadgeCredentialType): string => {
    const labels: Record<BadgeCredentialType, string> = {
      [BadgeCredentialType.COURSE_COMPLETION]: 'Course Completion',
      [BadgeCredentialType.SKILL_MASTERY]: 'Skill Mastery',
      [BadgeCredentialType.DEGREE_COMPLETION]: 'Degree',
      [BadgeCredentialType.CERTIFICATE]: 'Certificate',
      [BadgeCredentialType.SPECIALIZATION]: 'Specialization',
      [BadgeCredentialType.ACHIEVEMENT]: 'Achievement'
    };
    return labels[type] || type;
  };

  const getCredentialTypeColor = (type: BadgeCredentialType): string => {
    const colors: Record<BadgeCredentialType, string> = {
      [BadgeCredentialType.COURSE_COMPLETION]: 'bg-blue-500',
      [BadgeCredentialType.SKILL_MASTERY]: 'bg-purple-500',
      [BadgeCredentialType.DEGREE_COMPLETION]: 'bg-yellow-500',
      [BadgeCredentialType.CERTIFICATE]: 'bg-green-500',
      [BadgeCredentialType.SPECIALIZATION]: 'bg-indigo-500',
      [BadgeCredentialType.ACHIEVEMENT]: 'bg-orange-500'
    };
    return colors[type] || 'bg-gray-500';
  };

  const getGradeColor = (grade: number): string => {
    if (grade >= 90) return 'text-green-600';
    if (grade >= 80) return 'text-blue-600';
    if (grade >= 70) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const getBadgeImage = (): string => {
    // Use IPFS/CDN-backed metadataUri when available; otherwise fall back
    // to a local placeholder. No legacy /api badge image route exists.
    return badge.metadataUri || '/placeholder.svg';
  };

  if (viewMode === 'list') {
    return (
      <Card
        className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
        onClick={onClick}
      >
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            {/* Badge Image */}
            <div className={`w-24 h-24 rounded-lg ${getCredentialTypeColor(badge.credentialType)} flex items-center justify-center flex-shrink-0`}>
              <Award className="h-12 w-12 text-white" />
            </div>

            {/* Badge Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold truncate">{badge.courseName}</h3>
                  <p className="text-sm text-muted-foreground">
                    {getCredentialTypeLabel(badge.credentialType)}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!badge.isPublic && isOwnProfile && (
                    <Badge variant="secondary" className="gap-1">
                      <Lock className="h-3 w-3" />
                      Private
                    </Badge>
                  )}
                  {badge.isRevoked && (
                    <Badge variant="destructive">Revoked</Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(badge.completionDate), 'MMM d, yyyy')}
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  <span className={`font-semibold ${getGradeColor(badge.grade)}`}>
                    {badge.grade}%
                  </span>
                </div>
                {badge.blockchainTxHash && (
                  <div className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    <span className="text-xs">Verified on Blockchain</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Grid view
  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 overflow-hidden"
      onClick={onClick}
    >
      {/* Badge Image */}
      <div className={`h-48 ${getCredentialTypeColor(badge.credentialType)} flex items-center justify-center relative`}>
        <Award className="h-24 w-24 text-white" />
        
        {/* Badges */}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          {!badge.isPublic && isOwnProfile && (
            <Badge variant="secondary" className="gap-1 bg-white/90">
              <Lock className="h-3 w-3" />
              Private
            </Badge>
          )}
          {badge.isRevoked && (
            <Badge variant="destructive" className="bg-red-500">
              Revoked
            </Badge>
          )}
        </div>

        {/* Grade Badge */}
        <div className="absolute bottom-3 right-3">
          <div className={`bg-white rounded-full px-3 py-1 font-bold ${getGradeColor(badge.grade)}`}>
            {badge.grade}%
          </div>
        </div>
      </div>

      <CardHeader className="pb-3">
        <div className="space-y-2">
          <Badge variant="outline" className="w-fit">
            {getCredentialTypeLabel(badge.credentialType)}
          </Badge>
          <h3 className="font-bold text-lg line-clamp-2 min-h-[3.5rem]">
            {badge.courseName}
          </h3>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{format(new Date(badge.completionDate), 'MMM d, yyyy')}</span>
          </div>
          {badge.blockchainTxHash && (
            <div className="flex items-center gap-2 text-green-600">
              <ExternalLink className="h-4 w-4" />
              <span className="text-xs font-medium">Blockchain Verified</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
