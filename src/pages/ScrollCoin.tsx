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
import { toast } from "sonner";

const walletStats = [
  { label: "Current Balance", value: "1,247", change: "+89 this week", icon: Coins },
  { label: "Total Earned", value: "3,456", change: "+156 this month", icon: TrendingUp },
  { label: "Total Spent", value: "2,209", change: "234 this month", icon: ShoppingCart },
  { label: "Current Rank", value: "#127", change: "↑ 15 positions", icon: Trophy },
];

const recentTransactions = [
  {
    type: "earned",
    amount: "+50",
    description: "Completed Course: Prophetic Intelligence Module 3",
    time: "2 hours ago",
    icon: Trophy
  },
  {
    type: "earned", 
    amount: "+25",
    description: "Daily Prayer Consistency Bonus",
    time: "1 day ago",
    icon: Star
  },
  {
    type: "spent",
    amount: "-100",
    description: "Purchased: Advanced AI Tutor Session",
    time: "2 days ago",
    icon: ShoppingCart
  },
  {
    type: "earned",
    amount: "+75",
    description: "Community Discussion Participation",
    time: "3 days ago",
    icon: Gift
  },
  {
    type: "sent",
    amount: "-30",
    description: "Sent to study group member for collaboration",
    time: "5 days ago",
    icon: Send
  }
];

const earningOpportunities = [
  {
    title: "Complete Daily Devotions",
    reward: "10-25 ScrollCoins",
    description: "Read scripture and submit reflection",
    difficulty: "Easy",
    timeEstimate: "15 min",
    icon: Star
  },
  {
    title: "Attend Live AI Tutor Session", 
    reward: "50-100 ScrollCoins",
    description: "Participate in interactive learning",
    difficulty: "Medium",
    timeEstimate: "60 min",
    icon: Zap
  },
  {
    title: "Submit Prayer Request",
    reward: "20 ScrollCoins",
    description: "Share prayer needs with community",
    difficulty: "Easy", 
    timeEstimate: "5 min",
    icon: Gift
  },
  {
    title: "Complete Course Assessment",
    reward: "100-200 ScrollCoins",
    description: "Excel in faculty examinations",
    difficulty: "Hard",
    timeEstimate: "90 min",
    icon: Trophy
  }
];

const spendingOptions = [
  {
    category: "Premium Features",
    items: [
      { name: "Extended AI Tutor Sessions", price: "100 ScrollCoins", description: "60 min premium tutoring" },
      { name: "XR Classroom Access", price: "150 ScrollCoins", description: "Virtual reality learning experiences" },
      { name: "Priority Prayer Support", price: "50 ScrollCoins", description: "Fast-track prayer requests" }
    ]
  },
  {
    category: "ScrollBadges & Recognition",
    items: [
      { name: "Custom Profile Badge", price: "200 ScrollCoins", description: "Personalized achievement display" },
      { name: "Faculty Honor Roll", price: "500 ScrollCoins", description: "Featured student recognition" },
      { name: "Mentorship Program Access", price: "300 ScrollCoins", description: "Connect with senior scholars" }
    ]
  },
  {
    category: "Real-World Benefits",
    items: [
      { name: "Course Certification", price: "250 ScrollCoins", description: "Blockchain-verified credentials" },
      { name: "Career Placement Service", price: "400 ScrollCoins", description: "Job matching and placement" },
      { name: "Scholarship Application", price: "100 ScrollCoins", description: "Apply for financial aid" }
    ]
  }
];

const scrollCoinFeatures = [
  {
    title: "Blockchain Verified",
    description: "Every transaction recorded on the blockchain for transparency and security",
    icon: Zap
  },
  {
    title: "Real Economic Value",
    description: "ScrollCoins have genuine monetary worth and can be converted to real-world benefits",
    icon: TrendingUp
  },
  {
    title: "Kingdom Purpose",
    description: "Earnings support global ministry and kingdom advancement initiatives",
    icon: Star
  },
  {
    title: "Peer-to-Peer Transfer",
    description: "Send ScrollCoins to fellow students for collaboration and support",
    icon: Send
  }
];

export default function ScrollCoin() {
  return (
    <PageTemplate
      title="ScrollCoin Wallet"
      description="Revolutionary blockchain-based economy for kingdom education"
      actions={
        <div className="flex space-x-2">
          <Button variant="outline" disabled title="Peer-to-peer transfers launch with the next release">
            <Send className="h-4 w-4 mr-2" />
            Send ScrollCoins
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
                    {stat.value}
                  </>
                ) : (
                  stat.value
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
              <CardDescription>Your ScrollCoin activity history</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentTransactions.map((transaction, index) => (
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
              <Button variant="outline" className="w-full mt-4" onClick={() => toast.info("This action is launching with the next release.")}>
                <Clock className="h-4 w-4 mr-2" />
                View Full Transaction History
              </Button>
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
                <span>ScrollCoin Balance</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-4xl font-bold text-primary">1,247</div>
              <p className="text-sm text-muted-foreground mt-2">
                Equivalent to $623.50 USD
              </p>
              <div className="mt-4 space-y-2">
                <Button className="w-full" onClick={() => toast.info("This action is launching with the next release.")}>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Earn More ScrollCoins
                </Button>
                <Button variant="outline" className="w-full" onClick={() => toast.info("This action is launching with the next release.")}>
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
              <CardDescription>Earn bonus ScrollCoins</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Daily Devotions</span>
                  <span>5/7 days</span>
                </div>
                <Progress value={71} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">+50 bonus ScrollCoins</p>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Course Progress</span>
                  <span>3/5 modules</span>
                </div>
                <Progress value={60} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">+100 bonus ScrollCoins</p>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Community Participation</span>
                  <span>8/10 interactions</span>
                </div>
                <Progress value={80} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">+75 bonus ScrollCoins</p>
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
                  <Badge variant="secondary">#127</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">This Month</span>
                  <Badge variant="outline">↑ 15 positions</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Top 10%</span>
                  <Badge>Achiever</Badge>
                </div>
              </div>
              <Link to="/leaderboards">
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
        <h2 className="text-2xl font-semibold mb-4">Ways to Earn ScrollCoins</h2>
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

      {/* ScrollCoin Features */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
        <CardHeader>
          <CardTitle>ScrollCoin: Revolutionary Kingdom Economy</CardTitle>
          <CardDescription>
            The world's first Christ-centered, blockchain-verified educational currency
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {scrollCoinFeatures.map((feature, index) => (
              <div key={index} className="text-center space-y-2">
                <feature.icon className="h-8 w-8 mx-auto text-primary" />
                <h4 className="font-semibold">{feature.title}</h4>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 text-center">
            <p className="text-lg font-serif italic text-primary">
              "Every ScrollCoin earned advances the kingdom of God on earth"
            </p>
          </div>
        </CardContent>
      </Card>
    </PageTemplate>
  );
}