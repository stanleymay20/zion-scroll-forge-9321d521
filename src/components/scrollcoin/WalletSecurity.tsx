/**
 * Wallet Security Component
 * Manages wallet security settings and transaction verification
 */

import React, { useState, useEffect } from 'react';
import { legacyApiCall } from "@/lib/legacyApi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  Lock, 
  Bell, 
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { WalletSecuritySettings } from '@/types/scrollcoin';

interface WalletSecurityProps {
  walletAddress: string;
}

const WalletSecurity: React.FC<WalletSecurityProps> = ({ walletAddress }) => {
  const [settings, setSettings] = useState<WalletSecuritySettings>({
    dailyTransferLimit: 1000,
    maxTransactionAmount: 500,
    isWhitelisted: false,
    isBlacklisted: false,
    twoFactorEnabled: false,
    notificationsEnabled: true
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Transaction verification
  const [txHash, setTxHash] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);

  useEffect(() => {
    loadSecuritySettings();
  }, []);

  const loadSecuritySettings = async () => {
    try {
      setLoading(true);
      // In production, fetch from API
      // const response = await legacyApiCall('/api/scrollcoin/wallet/security');
      // const data = await response.json();
      // setSettings(data.data);
    } catch (error) {
      console.error('Error loading security settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSecuritySettings = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      // In production, save to API
      // const response = await legacyApiCall('/api/scrollcoin/wallet/security', {
      //   method: 'PUT',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${localStorage.getItem('token')}`
      //   },
      //   body: JSON.stringify(settings)
      // });

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const verifyTransaction = async () => {
    if (!txHash) {
      setError('Please enter a transaction hash');
      return;
    }

    try {
      setVerifying(true);
      setError(null);
      setVerificationResult(null);

      const response = await legacyApiCall('/api/scrollcoin/blockchain/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ txHash })
      });

      if (!response.ok) {
        throw new Error('Verification failed');
      }

      const data = await response.json();
      setVerificationResult(data.data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const openBlockchainExplorer = () => {
    const explorerUrl = `https://etherscan.io/address/${walletAddress}`;
    window.open(explorerUrl, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Settings
          </CardTitle>
          <CardDescription>
            Manage your wallet security and transaction limits
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Transaction Limits */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Transaction Limits
            </h3>
            
            <div className="space-y-2">
              <Label htmlFor="dailyLimit">Daily Transfer Limit (SC)</Label>
              <Input
                id="dailyLimit"
                type="number"
                value={settings.dailyTransferLimit}
                onChange={(e) => setSettings({
                  ...settings,
                  dailyTransferLimit: parseFloat(e.target.value)
                })}
              />
              <p className="text-xs text-muted-foreground">
                Maximum amount you can transfer per day
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxTransaction">Maximum Transaction Amount (SC)</Label>
              <Input
                id="maxTransaction"
                type="number"
                value={settings.maxTransactionAmount}
                onChange={(e) => setSettings({
                  ...settings,
                  maxTransactionAmount: parseFloat(e.target.value)
                })}
              />
              <p className="text-xs text-muted-foreground">
                Maximum amount per single transaction
              </p>
            </div>
          </div>

          {/* Security Features */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Security Features
            </h3>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Two-Factor Authentication</Label>
                <p className="text-xs text-muted-foreground">
                  Require 2FA for all transactions
                </p>
              </div>
              <Switch
                checked={settings.twoFactorEnabled}
                onCheckedChange={(checked) => setSettings({
                  ...settings,
                  twoFactorEnabled: checked
                })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Transaction Notifications</Label>
                <p className="text-xs text-muted-foreground">
                  Get notified of all wallet activity
                </p>
              </div>
              <Switch
                checked={settings.notificationsEnabled}
                onCheckedChange={(checked) => setSettings({
                  ...settings,
                  notificationsEnabled: checked
                })}
              />
            </div>
          </div>

          {/* Wallet Status */}
          <div className="space-y-4">
            <h3 className="font-semibold">Wallet Status</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Whitelist Status</p>
                <p className="font-semibold">
                  {settings.isWhitelisted ? (
                    <span className="text-green-600">Whitelisted</span>
                  ) : (
                    <span className="text-muted-foreground">Not Whitelisted</span>
                  )}
                </p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Blacklist Status</p>
                <p className="font-semibold">
                  {settings.isBlacklisted ? (
                    <span className="text-red-600">Blacklisted</span>
                  ) : (
                    <span className="text-green-600">Clear</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Security settings saved successfully
              </AlertDescription>
            </Alert>
          )}

          {/* Save Button */}
          <Button 
            onClick={saveSecuritySettings} 
            disabled={saving}
            className="w-full"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Security Settings'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Transaction Verification */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction Verification</CardTitle>
          <CardDescription>
            Verify transactions on the blockchain
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="txHash">Transaction Hash</Label>
            <div className="flex gap-2">
              <Input
                id="txHash"
                placeholder="0x..."
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                className="font-mono text-sm"
              />
              <Button 
                onClick={verifyTransaction}
                disabled={verifying}
              >
                {verifying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Verify'
                )}
              </Button>
            </div>
          </div>

          {verificationResult && (
            <Alert className={verificationResult.isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold">
                    {verificationResult.isValid ? (
                      <span className="text-green-800">✓ Transaction Verified</span>
                    ) : (
                      <span className="text-red-800">✗ Verification Failed</span>
                    )}
                  </p>
                  {verificationResult.blockchainData && (
                    <div className="text-sm space-y-1">
                      <p>Block: {verificationResult.blockchainData.blockNumber}</p>
                      <p>Status: {verificationResult.blockchainData.status}</p>
                      <p>Timestamp: {new Date(verificationResult.blockchainData.timestamp).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Button 
            variant="outline" 
            className="w-full"
            onClick={openBlockchainExplorer}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View on Blockchain Explorer
          </Button>
        </CardContent>
      </Card>

      {/* Security Tips */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Security Best Practices
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Enable two-factor authentication for all transactions</li>
            <li>• Set reasonable daily and transaction limits</li>
            <li>• Never share your wallet private keys with anyone</li>
            <li>• Verify all transactions on the blockchain</li>
            <li>• Keep your account credentials secure</li>
            <li>• Report suspicious activity immediately</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default WalletSecurity;
