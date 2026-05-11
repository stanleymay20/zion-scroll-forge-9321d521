import { PageTemplate } from "@/components/layout/PageTemplate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Coins, TrendingUp, Send, ShoppingCart, Trophy, 
  Clock, Star, Gift, Zap, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { Link } from "react-router-dom";
import { useWallet } from "@/hooks/useScrollGold";
import { toast } from "sonner";

console.info('✝️ ScrollGold Economy — Christ governs the kingdom economy');

const earningOpportunities = [
  {
    title: "Complete Daily Devotions",
    reward: "10-25 ScrollGold",
    description: "Read scripture and submit reflection",
    difficulty: "Easy",
    timeEstimate: "15 min",
    icon: Star
  },
  {
    title: "Attend Live AI Tutor Session", 
    reward: "50-100 ScrollGold",
    description: "Participate in interactive learning",
    difficulty: "Medium",
    timeEstimate: "60 min",
    icon: Zap
  },
  {
    title: "Submit Prayer Request",
    reward: "20 ScrollGold",
    description: "Share prayer needs with community",
    difficulty: "Easy", 
    timeEstimate: "5 min",
    icon: Gift
  },
  {
    title: "Complete Course Assessment",
    reward: "100-200 ScrollGold",
    description: "Excel in faculty examinations",
    difficulty: "Hard",
    timeEstimate: "90 min",
    icon: Trophy
  }
];

const scrollGoldFeatures = [
  {
    title: "Blockchain Verified",
    description: "Every transaction recorded on the blockchain for transparency and security",
    icon: Zap
  },
  {
    title: "Real Economic Value",
    description: "ScrollGold has genuine monetary worth and can be converted to real-world benefits",
    icon: TrendingUp
  },
  {
    title: "Kingdom Purpose",
    description: "Earnings support global ministry and kingdom advancement initiatives",
    icon: Star
  },
  {
    title: "Peer-to-Peer Transfer",
    description: "Send ScrollGold to fellow students for collaboration and support",
    icon: Send
  }
];

export default function ScrollGold() {
  const { data: walletData, isLoading } = useWallet();

  const wallet = walletData?.wallet;
  const transactions = walletData?.transactions || [];
  const balance = wallet?.balance || 0;

  const walletStats = [
    { label: "Current Balance", value: balance.toLocaleString(), change: "Live balance", icon: Coins },
    { label: "Total Earned", value: "—", change: "From all activities", icon: TrendingUp },
    { label: "Total Spent", value: "—", change: "On courses & resources", icon: ShoppingCart },
    { label: "Current Rank", value: "—", change: "Community ranking", icon: Trophy },
  ];

  const recentTransactions = transactions.slice(0, 5).map((tx: any) => ({
    type: tx.type === 'earned' ? 'earned' : tx.type === 'spent' ? 'spent' : 'sent',
    amount: tx.type === 'earned' ? `+${tx.amount}` : `-${tx.amount}`,
    description: tx.description || 'Transaction',
    time: new Date(tx.created_at).toLocaleDateString(),
    icon: tx.type === 'earned' ? Trophy : ShoppingCart
  }));

  return (
    <PageTemplate
      title="ScrollGold Wallet"
      description="Revolutionary blockchain-based economy for kingdom education"
      actions={
        <div className="flex space-x-2">
          <Button variant="outline" disabled title="Peer-to-peer transfers launch with the next release">
            <Send className="h-4 w-4 mr-2" />
            Send ScrollGold
          </Button>
          <Button disabled title="Marketplace launches with the next release">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Visit Marketplace
          </Button>
        </div>
      }
    >
      {/* Wallet Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {walletStats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center">
                {stat.label === "Current Balance" || stat.label === "Total Earned" || stat.label === "Total Spent" ? (
                  <>
                    <Coins className="h-5 w-5 mr-2 text-primary" />
                    {isLoading ? '...' : stat.value}
                  </>
                ) : (
                  isLoading ? '...' : stat.value
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {stat.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Your ScrollGold activity history</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : recentTransactions.length > 0 ? (
                <div className="space-y-4">
                  {recentTransactions.map((transaction: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-full ${
                          transaction.type === 'earned' ? 'bg-green-100 text-green-600' :
                          transaction.type === 'spent' ? 'bg-red-100 text-red-600' :
                          'bg-blue-100 text-blue-600'
                        }`}>
                          {transaction.type === 'earned' ? (
                            <ArrowUpRight className="h-4 w-4" />
                          ) : transaction.type === 'spent' ? (
                            <ArrowDownRight className="h-4 w-4" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{transaction.description}</p>
                          <p className="text-sm text-muted-foreground">{transaction.time}</p>
                        </div>
                      </div>
                      <div className={`font-bold ${
                        transaction.type === 'earned' ? 'text-green-600' :
                        transaction.type === 'spent' ? 'text-red-600' :
                        'text-blue-600'
                      }`}>
                        {transaction.amount}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No transactions yet. Start earning ScrollGold!
                </div>
              )}
              <Link to="/scrollgold-wallet">
                <Button variant="outline" className="w-full mt-4">
                  <Clock className="h-4 w-4 mr-2" />
                  View Full Transaction History
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions Sidebar */}
        <div className="space-y-6">
          {/* Current Balance Display */}
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center space-x-2">
                <Coins className="h-6 w-6 text-primary" />
                <span>ScrollGold Balance</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-4xl font-bold text-primary">
                {isLoading ? '...' : balance.toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Kingdom economy tokens
              </p>
              <div className="mt-4 space-y-2">
                <Link to="/courses">
                  <Button className="w-full">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Earn More ScrollGold
                  </Button>
                </Link>
                <Button variant="outline" className="w-full" disabled>
                  <Send className="h-4 w-4 mr-2" />
                  Send to Friend
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Weekly Goals */}
          <Card>
            <CardHeader>
              <CardTitle>Weekly Goals</CardTitle>
              <CardDescription>Earn bonus ScrollGold</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Daily Devotions</span>
                  <span>0/7 days</span>
                </div>
                <Progress value={0} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">+50 bonus ScrollGold</p>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Course Progress</span>
                  <span>0/5 modules</span>
                </div>
                <Progress value={0} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">+100 bonus ScrollGold</p>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Community Participation</span>
                  <span>0/10 interactions</span>
                </div>
                <Progress value={0} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">+75 bonus ScrollGold</p>
              </div>
            </CardContent>
          </Card>

          {/* Leaderboard Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Community Ranking</CardTitle>
              <CardDescription>Your position among peers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Your Rank</span>
                  <Badge variant="secondary">—</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">This Month</span>
                  <Badge variant="outline">Keep learning!</Badge>
                </div>
              </div>
              <Link to="/scrollgold-leaderboard">
                <Button variant="outline" size="sm" className="w-full mt-4">
                  <Trophy className="h-4 w-4 mr-2" />
                  View Full Leaderboard
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Earning Opportunities */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Ways to Earn ScrollGold</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {earningOpportunities.map((opportunity, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <opportunity.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{opportunity.title}</CardTitle>
                      <CardDescription>{opportunity.description}</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Badge variant={opportunity.difficulty === 'Easy' ? 'secondary' : 
                                   opportunity.difficulty === 'Medium' ? 'outline' : 'default'}>
                      {opportunity.difficulty}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{opportunity.timeEstimate}</span>
                  </div>
                  <div className="text-lg font-bold text-primary">{opportunity.reward}</div>
                </div>
                <Button className="w-full" onClick={() => toast.info("This action is launching with the next release.")}>
                  Start Earning
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* ScrollGold Features */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
        <CardHeader>
          <CardTitle>ScrollGold: Revolutionary Kingdom Economy</CardTitle>
          <CardDescription>
            The world's first Christ-centered, blockchain-verified educational currency
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {scrollGoldFeatures.map((feature, index) => (
              <div key={index} className="text-center space-y-2">
                <feature.icon className="h-8 w-8 mx-auto text-primary" />
                <h4 className="font-semibold">{feature.title}</h4>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 text-center">
            <p className="text-lg font-serif italic text-primary">
              "Every ScrollGold earned advances the kingdom of God on earth"
            </p>
          </div>
        </CardContent>
      </Card>
    </PageTemplate>
  );
}

// Backwards compatibility export
export { default as ScrollCoin } from './ScrollGold';
