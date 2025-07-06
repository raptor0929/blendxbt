import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Bot,
  Zap,
  Shield,
  Target,
  TrendingUp,
  Users,
  CheckCircle,
  ArrowRight,
  Cpu,
  Database,
  Coins,
  BarChart3,
  Sparkles,
} from "lucide-react"
import Image from "next/image"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 animate-pulse" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)]" />

      {/* Hero Section */}
      <section className="relative px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl text-center">
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-purple-400 blur-xl opacity-50 animate-pulse" />
              <Image
                src="/images/ai-character-bottle.png"
                alt="blendxbt AI Character"
                width={120}
                height={120}
                className="relative rounded-full border-2 border-blue-400/50 shadow-2xl"
              />
            </div>
          </div>

          <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
              Revolutionizing
            </span>
            <br />
            <span className="text-white">Liquidity Incentives</span>
            <br />
            <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">with AI</span>
          </h1>

          <p className="mx-auto mb-8 max-w-2xl text-xl text-gray-300 sm:text-2xl">
            <span className="font-semibold text-blue-400">blendxbt</span> – A Hackathon Project for{" "}
            <span className="font-semibold text-purple-400">blend.capital 2025</span>
          </p>

          <Button
            size="lg"
            className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold px-8 py-4 text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            asChild
          >
            <a href="https://t.me/your_telegram_username" target="_blank" rel="noopener noreferrer">
              Start on Telegram <ArrowRight className="ml-2 h-5 w-5" />
            </a>
          </Button>
        </div>
      </section>

      {/* Problem Section */}
      <section className="relative px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold sm:text-4xl lg:text-5xl mb-4">
              <span className="bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                The Problem
              </span>
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Target,
                title: "Manual Complexity",
                description: "Incentives in liquidity pools are manual and complex",
              },
              {
                icon: Bot,
                title: "No Automation",
                description: "No automation for daily rewards distribution",
              },
              {
                icon: TrendingUp,
                title: "Limited Scalability",
                description: "Limited scalability for multiple pools",
              },
              {
                icon: Users,
                title: "Inefficient Claims",
                description: "Users face inefficient claiming processes",
              },
            ].map((problem, index) => (
              <Card
                key={index}
                className="bg-gray-800/50 border-gray-700 backdrop-blur-sm hover:bg-gray-800/70 transition-all duration-300 group"
              >
                <CardContent className="p-6 text-center">
                  <div className="mb-4 flex justify-center">
                    <div className="rounded-full bg-gradient-to-r from-red-500/20 to-orange-500/20 p-3 group-hover:from-red-500/30 group-hover:to-orange-500/30 transition-all duration-300">
                      <problem.icon className="h-8 w-8 text-red-400" />
                    </div>
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-white">{problem.title}</h3>
                  <p className="text-gray-400">{problem.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="relative px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold sm:text-4xl lg:text-5xl mb-6">
                <span className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                  Our Solution – blendxbt
                </span>
              </h2>
              <p className="text-xl text-gray-300 leading-relaxed">
                AI agent that automates incentive campaigns, tracks events in real time, calculates and distributes
                rewards via smart contracts. Our intelligent system eliminates manual processes and ensures transparent,
                efficient reward distribution across multiple liquidity pools.
              </p>
            </div>

            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-green-500/20 to-blue-500/20 blur-2xl animate-pulse" />
                <Image
                  src="/images/ai-hacker-bottle.png"
                  alt="AI Hacker with Glowing Background"
                  width={300}
                  height={300}
                  className="relative rounded-2xl shadow-2xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold sm:text-4xl lg:text-5xl mb-4">
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                How It Works
              </span>
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                step: "01",
                icon: Database,
                title: "Monitor On-Chain Events",
                description: "Track deposits and withdrawals across all connected liquidity pools in real-time",
              },
              {
                step: "02",
                icon: BarChart3,
                title: "Daily Reward Calculation",
                description: "AI algorithms calculate optimal reward distributions based on user participation",
              },
              {
                step: "03",
                icon: Shield,
                title: "Smart Contract Storage",
                description: "Secure storage and automated claiming through battle-tested smart contracts",
              },
            ].map((step, index) => (
              <Card
                key={index}
                className="bg-gray-800/50 border-gray-700 backdrop-blur-sm hover:bg-gray-800/70 transition-all duration-300 group relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500" />
                <CardContent className="p-8 text-center">
                  <div className="mb-6 flex justify-center">
                    <div className="rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 p-4 group-hover:from-blue-500/30 group-hover:to-purple-500/30 transition-all duration-300">
                      <step.icon className="h-10 w-10 text-blue-400" />
                    </div>
                  </div>
                  <div className="mb-4 text-sm font-bold text-purple-400">{step.step}</div>
                  <h3 className="mb-4 text-xl font-semibold text-white">{step.title}</h3>
                  <p className="text-gray-400">{step.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Technical Details Section */}
      <section className="relative px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold sm:text-4xl lg:text-5xl mb-4">
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Technical Architecture
              </span>
            </h2>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm hover:bg-gray-800/70 transition-all duration-300">
              <CardContent className="p-8">
                <div className="mb-6 flex items-center">
                  <div className="rounded-full bg-gradient-to-r from-blue-500/20 to-cyan-500/20 p-3 mr-4">
                    <Cpu className="h-8 w-8 text-blue-400" />
                  </div>
                  <h3 className="text-2xl font-semibold text-white">Backend System</h3>
                </div>
                <ul className="space-y-4 text-gray-300">
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                    <span>Tracks deposit/withdrawal events across multiple chains</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                    <span>Real-time updates of total deposits and user balances</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                    <span>Automated daily reward calculations and smart contract integration</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm hover:bg-gray-800/70 transition-all duration-300">
              <CardContent className="p-8">
                <div className="mb-6 flex items-center">
                  <div className="rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 p-3 mr-4">
                    <Shield className="h-8 w-8 text-purple-400" />
                  </div>
                  <h3 className="text-2xl font-semibold text-white">Smart Contract</h3>
                </div>
                <ul className="space-y-4 text-gray-300">
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                    <span>Multi-pool support with isolated reward calculations</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                    <span>Gas-optimized claim functions for user rewards</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                    <span>Scalable architecture for high transaction volumes</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="relative px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold sm:text-4xl lg:text-5xl mb-4">
              <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                Key Benefits
              </span>
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Zap,
                title: "Full Automation",
                description: "Complete automation of incentive campaigns and reward distribution",
                gradient: "from-yellow-400 to-orange-400",
              },
              {
                icon: Shield,
                title: "Transparent Rewards",
                description: "Blockchain-verified transparent rewards via smart contracts",
                gradient: "from-blue-400 to-cyan-400",
              },
              {
                icon: Coins,
                title: "Multi-Pool Support",
                description: "Seamless support for multiple liquidity pools simultaneously",
                gradient: "from-green-400 to-emerald-400",
              },
              {
                icon: Sparkles,
                title: "User-Friendly",
                description: "Intuitive claiming experience with minimal gas costs",
                gradient: "from-purple-400 to-pink-400",
              },
            ].map((benefit, index) => (
              <Card
                key={index}
                className="bg-gray-800/50 border-gray-700 backdrop-blur-sm hover:bg-gray-800/70 transition-all duration-300 group relative overflow-hidden"
              >
                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${benefit.gradient}`} />
                <CardContent className="p-6 text-center">
                  <div className="mb-4 flex justify-center">
                    <div
                      className={`rounded-full bg-gradient-to-r ${benefit.gradient.replace("to-", "to-").replace("from-", "from-").replace("400", "500/20")} p-3 group-hover:${benefit.gradient.replace("to-", "to-").replace("from-", "from-").replace("400", "500/30")} transition-all duration-300`}
                    >
                      <benefit.icon className={`h-8 w-8 text-${benefit.gradient.split("-")[1]}-400`} />
                    </div>
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-white">{benefit.title}</h3>
                  <p className="text-gray-400">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="relative px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="rounded-3xl bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 p-12 backdrop-blur-sm border border-gray-700">
            <h2 className="text-3xl font-bold sm:text-4xl lg:text-5xl mb-6">
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Join the Incentive Revolution
              </span>
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              We're looking for feedback, collaborators, and support! Be part of the future of automated DeFi
              incentives.
            </p>
            <Button
              size="lg"
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold px-12 py-6 text-xl rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              asChild
            >
              <a href="https://t.me/your_telegram_username" target="_blank" rel="noopener noreferrer">
                Start on Telegram <ArrowRight className="ml-3 h-6 w-6" />
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative px-4 py-12 sm:px-6 lg:px-8 border-t border-gray-800">
        <div className="mx-auto max-w-7xl text-center">
          <p className="text-gray-400">© 2025 blendxbt - A Hackathon Project for blend.capital</p>
        </div>
      </footer>
    </div>
  )
}
