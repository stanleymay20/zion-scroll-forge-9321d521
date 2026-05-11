/**
 * Send/Receive ScrollCoin Interface
 * Handles peer-to-peer transfers and receiving ScrollCoin
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Copy, 
  CheckCircle, 
  Loader2,
  AlertCircle,
  QrCode
} from 'lucide-react';
import { toast } from 'sonner';
import { ScrollCoinWallet } from '@/types/scrollcoin';

interface SendReceiveInterfaceProps {
  wallet: ScrollCoinWallet;
  onTransactionComplete: () => void;
}

const SendReceiveInterface: React.FC<SendReceiveInterfaceProps> = ({ 
  wallet, 
  onTransactionComplete 
}) => {
  // Send state
  const [recipientId, setRecipientId] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);

  // Receive state
  const [copied, setCopied] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendSuccess(false);
    setSendError('ScrollGold transfers are not active yet. Peer-to-peer transfers will be enabled once the secure transfer service is live.');
    toast.info('ScrollGold transfers are not active yet', {
      description: 'Peer-to-peer transfers will be enabled in an upcoming release.',
    });
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(wallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generateQRCode = () => {
    toast.info('Use the copy button to share your address', {
      description: 'Visual QR rendering is being finalized for the next release.',
    });
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="send" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="send" className="flex items-center gap-2">
            <ArrowUpRight className="h-4 w-4" />
            Send ScrollCoin
          </TabsTrigger>
          <TabsTrigger value="receive" className="flex items-center gap-2">
            <ArrowDownRight className="h-4 w-4" />
            Receive ScrollCoin
          </TabsTrigger>
        </TabsList>

        {/* Send Tab */}
        <TabsContent value="send">
          <Card>
            <CardHeader>
              <CardTitle>Send ScrollCoin</CardTitle>
              <CardDescription>
                Transfer ScrollCoin to another user
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSend} className="space-y-4">
                {/* Current Balance */}
                <Alert>
                  <AlertDescription>
                    <div className="flex items-center justify-between">
                      <span>Available Balance:</span>
                      <span className="font-bold text-primary">{wallet.balance.toFixed(2)} SC</span>
                    </div>
                  </AlertDescription>
                </Alert>

                {/* Recipient */}
                <div className="space-y-2">
                  <Label htmlFor="recipient">Recipient User ID *</Label>
                  <Input
                    id="recipient"
                    placeholder="Enter recipient's user ID"
                    value={recipientId}
                    onChange={(e) => setRecipientId(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the user ID of the person you want to send ScrollCoin to
                  </p>
                </div>

                {/* Amount */}
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (SC) *</Label>
                  <div className="relative">
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={wallet.balance}
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={() => setAmount(wallet.balance.toString())}
                    >
                      Max
                    </Button>
                  </div>
                  {amount && (
                    <p className="text-xs text-muted-foreground">
                      ≈ ${(parseFloat(amount) * 0.1).toFixed(2)} USD
                    </p>
                  )}
                </div>

                {/* Reason */}
                <div className="space-y-2">
                  <Label htmlFor="reason">Reason (Optional)</Label>
                  <Textarea
                    id="reason"
                    placeholder="Add a note about this transfer..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Error Message */}
                {sendError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{sendError}</AlertDescription>
                  </Alert>
                )}

                {/* Success Message */}
                {sendSuccess && (
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      Transfer successful! The transaction is being processed.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Submit Button */}
                <Button type="submit" className="w-full" disabled={sending}>
                  {sending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <ArrowUpRight className="h-4 w-4 mr-2" />
                      Send ScrollCoin
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Receive Tab */}
        <TabsContent value="receive">
          <Card>
            <CardHeader>
              <CardTitle>Receive ScrollCoin</CardTitle>
              <CardDescription>
                Share your wallet address to receive ScrollCoin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Wallet Address */}
              <div className="space-y-2">
                <Label>Your Wallet Address</Label>
                <div className="flex gap-2">
                  <Input
                    value={wallet.address}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    onClick={copyAddress}
                    className="shrink-0"
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Share this address with others to receive ScrollCoin
                </p>
              </div>

              {/* QR Code */}
              <div className="space-y-2">
                <Label>QR Code</Label>
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <div className="inline-flex items-center justify-center w-48 h-48 bg-muted rounded-lg mb-4">
                    <QrCode className="h-24 w-24 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    QR code for easy scanning
                  </p>
                  <Button variant="outline" onClick={generateQRCode} disabled title="Launching with the next release">
                    Generate QR Code
                  </Button>
                </div>
              </div>

              {/* Instructions */}
              <Alert>
                <AlertDescription>
                  <h4 className="font-semibold mb-2">How to receive ScrollCoin:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Share your wallet address with the sender</li>
                    <li>Wait for them to initiate the transfer</li>
                    <li>You'll receive a notification when the transfer is complete</li>
                    <li>The ScrollCoin will appear in your balance</li>
                  </ol>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SendReceiveInterface;
