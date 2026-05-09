/**
 * Badge Detail Modal Component
 * "By the Spirit of Excellence, we reveal credential details"
 * 
 * Modal for displaying detailed badge information with metadata
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import {
  Award,
  Calendar,
  TrendingUp,
  Share2,
  Download,
  Eye,
  EyeOff,
  ExternalLink,
  CheckCircle,
  XCircle,
  Copy,
  Shield
} from 'lucide-react';
import { ScrollBadge, BadgeCredentialType } from '@/types/scrollbadge';
import { format } from 'date-fns';
import { BadgeSharing } from './BadgeSharing';
import { BadgeVerification } from './BadgeVerification';
import { toast } from 'sonner';
import { buildPublicBadgeUrl } from '@/lib/scrollbadge';

interface BadgeDetailModalProps {
  badge: ScrollBadge;
  isOpen: boolean;
  onClose: () => void;
  isOwnProfile?: boolean;
  onBadgeUpdated?: () => void;
}

export const BadgeDetailModal: React.FC<BadgeDetailModalProps> = ({
  badge,
  isOpen,
  onClose,
  isOwnProfile = false,
  onBadgeUpdated
}) => {
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

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

  const handleToggleVisibility = async () => {
    await navigator.clipboard.writeText(buildPublicBadgeUrl(badge.userId));
    toast.success('Public badge link copied to clipboard');
  };

  const handleCopyTokenId = () => {
    navigator.clipboard.writeText(badge.tokenId.toString());
    toast.success('Token ID copied to clipboard');
  };

  const handleCopyTxHash = () => {
    if (badge.blockchainTxHash) {
      navigator.clipboard.writeText(badge.blockchainTxHash);
      toast.success('Transaction hash copied to clipboard');
    }
  };

  const handleDownloadBadge = async () => {
    try {
      // In production, this would download the badge image from IPFS
      toast.info('Badge download feature coming soon');
    } catch (error) {
      console.error('Error downloading badge:', error);
      toast.error('Failed to download badge');
    }
  };

  const getBlockchainExplorerUrl = (): string => {
    // This would be the actual blockchain explorer URL
    return `https://etherscan.io/tx/${badge.blockchainTxHash}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Award className="h-6 w-6 text-primary" />
            Badge Details
          </DialogTitle>
          <DialogDescription>
            View detailed information about this credential
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Badge Preview */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Badge Image */}
                <div className={`w-full md:w-48 h-48 rounded-lg ${getCredentialTypeColor(badge.credentialType)} flex items-center justify-center flex-shrink-0`}>
                  <Award className="h-24 w-24 text-white" />
                </div>

                {/* Badge Info */}
                <div className="flex-1 space-y-4">
                  <div>
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <h3 className="text-2xl font-bold">{badge.courseName}</h3>
                        <p className="text-muted-foreground">{badge.studentName}</p>
                      </div>
                      <div className="flex flex-col gap-2">
                        {badge.isRevoked ? (
                          <Badge variant="destructive" className="gap-1">
                            <XCircle className="h-3 w-3" />
                            Revoked
                          </Badge>
                        ) : (
                          <Badge variant="default" className="gap-1 bg-green-600">
                            <CheckCircle className="h-3 w-3" />
                            Valid
                          </Badge>
                        )}
                        <Badge variant="outline">
                          {getCredentialTypeLabel(badge.credentialType)}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Completion Date</p>
                      <p className="font-semibold flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(badge.completionDate), 'MMMM d, yyyy')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Grade</p>
                      <p className="font-semibold flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        {badge.grade}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Token ID</p>
                      <p className="font-mono text-sm flex items-center gap-2">
                        #{badge.tokenId}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCopyTokenId}
                          className="h-6 w-6 p-0"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Visibility</p>
                      <p className="font-semibold flex items-center gap-2">
                        {badge.isPublic ? (
                          <>
                            <Eye className="h-4 w-4" />
                            Public
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-4 w-4" />
                            Private
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {isOwnProfile && !badge.isRevoked && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleToggleVisibility}
                        disabled={isUpdatingVisibility || !badge.isPublic}
                      >
                        <Share2 className="h-4 w-4 mr-2" />
                        {badge.isPublic ? 'Copy Share Link' : 'Sharing Unavailable'}
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleDownloadBadge} disabled title="Launching with the next release">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="verification">Verification</TabsTrigger>
              {isOwnProfile && <TabsTrigger value="sharing">Sharing</TabsTrigger>}
            </TabsList>

            <TabsContent value="details" className="space-y-4">
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Blockchain Information</h4>
                    <div className="space-y-2 text-sm">
                      {badge.blockchainTxHash ? (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Transaction Hash:</span>
                            <div className="flex items-center gap-2">
                              <code className="text-xs bg-muted px-2 py-1 rounded">
                                {badge.blockchainTxHash.substring(0, 10)}...
                                {badge.blockchainTxHash.substring(badge.blockchainTxHash.length - 8)}
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCopyTxHash}
                                className="h-6 w-6 p-0"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Block Number:</span>
                            <span className="font-mono">{badge.blockNumber}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Owner Address:</span>
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {badge.ownerAddress.substring(0, 6)}...
                              {badge.ownerAddress.substring(badge.ownerAddress.length - 4)}
                            </code>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-2"
                            onClick={() => window.open(getBlockchainExplorerUrl(), '_blank')}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View on Blockchain Explorer
                          </Button>
                        </>
                      ) : (
                        <p className="text-muted-foreground">
                          Blockchain verification pending...
                        </p>
                      )}
                    </div>
                  </div>

                  {badge.ipfsHash && (
                    <div>
                      <h4 className="font-semibold mb-2">IPFS Storage</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">IPFS Hash:</span>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {badge.ipfsHash.substring(0, 10)}...
                          </code>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Metadata URI:</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(badge.metadataUri, '_blank')}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {badge.isRevoked && (
                    <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
                      <h4 className="font-semibold text-destructive mb-2">Revocation Information</h4>
                      <div className="space-y-1 text-sm">
                        <p><strong>Reason:</strong> {badge.revokedReason}</p>
                        <p><strong>Revoked At:</strong> {format(new Date(badge.revokedAt!), 'MMMM d, yyyy')}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="verification">
              <BadgeVerification badge={badge} />
            </TabsContent>

            {isOwnProfile && (
              <TabsContent value="sharing">
                <BadgeSharing badge={badge} />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
