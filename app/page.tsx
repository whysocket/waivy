import type React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Flame, Lock, Shield, Users, Zap, Clock } from "lucide-react"

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex flex-col items-center justify-center text-center space-y-4 py-12">
        <div className="relative">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tighter">Ephemeral</h1>
          <Badge variant="destructive" className="absolute -top-2 -right-12 animate-pulse">
            <Flame className="h-3 w-3 mr-1" />
            Burn after close
          </Badge>
        </div>
        <p className="text-xl text-muted-foreground max-w-[600px] mx-auto">
          Secure, private conversations that vanish without a trace when you close the chat.
        </p>
        <div className="flex gap-4 mt-6">
          <Button asChild size="lg">
            <Link href="/chat">
              Start Chatting
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-12">
        <FeatureCard
          icon={<Flame className="h-12 w-12 text-destructive" />}
          title="Burn After Close"
          description="All messages are permanently deleted when the conversation ends. Nothing is stored on servers."
          animationClass="hover:scale-105 hover:shadow-md"
        />
        <FeatureCard
          icon={<Lock className="h-12 w-12 text-primary" />}
          title="End-to-End Privacy"
          description="Direct socket connections between users with no permanent storage or logging."
          animationClass="hover:scale-105 hover:shadow-md"
        />
        <FeatureCard
          icon={<Zap className="h-12 w-12 text-amber-500" />}
          title="Real-Time Chat"
          description="Instant messaging with typing indicators and read receipts for a seamless experience."
          animationClass="hover:scale-105 hover:shadow-md"
        />
      </div>

      <section className="py-16" id="how-it-works" aria-labelledby="how-it-works-heading">
        <h2 id="how-it-works-heading" className="text-3xl font-bold text-center mb-2">
          How It Works
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-md mx-auto">
          Four simple steps to truly private conversations that leave no trace.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-6xl mx-auto px-4">
          <div className="group relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-pink-600 to-purple-600 rounded-lg blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative bg-card rounded-lg p-6 h-full flex flex-col items-center text-center transform transition-all duration-300 group-hover:scale-[1.02] group-hover:-translate-y-1">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors duration-300">
                <span className="text-2xl font-bold text-primary">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Choose a Username</h3>
              <p className="text-muted-foreground">
                Pick any alias you want! No email, no password, no tracking. Be whoever you want to be.
              </p>
              <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <Shield className="h-6 w-6 text-primary mx-auto" />
              </div>
            </div>
          </div>

          <div className="group relative mt-8 md:mt-12">
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative bg-card rounded-lg p-6 h-full flex flex-col items-center text-center transform transition-all duration-300 group-hover:scale-[1.02] group-hover:-translate-y-1">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors duration-300">
                <span className="text-2xl font-bold text-primary">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Find Someone</h3>
              <p className="text-muted-foreground">
                Connect with anyone online. No friend requests, no waiting. Just instant connections.
              </p>
              <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <Users className="h-6 w-6 text-primary mx-auto" />
              </div>
            </div>
          </div>

          <div className="group relative mt-4 md:mt-0">
            <div className="absolute -inset-1 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative bg-card rounded-lg p-6 h-full flex flex-col items-center text-center transform transition-all duration-300 group-hover:scale-[1.02] group-hover:-translate-y-1">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors duration-300">
                <span className="text-2xl font-bold text-primary">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Chat Securely</h3>
              <p className="text-muted-foreground">
                {`Exchange messages that exist only in your browser's memory. Not even we can read them!`}
              </p>
              <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <Lock className="h-6 w-6 text-primary mx-auto" />
              </div>
            </div>
          </div>

          <div className="group relative mt-8 md:mt-16">
            <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-orange-600 rounded-lg blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative bg-card rounded-lg p-6 h-full flex flex-col items-center text-center transform transition-all duration-300 group-hover:scale-[1.02] group-hover:-translate-y-1">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4 group-hover:bg-destructive/20 transition-colors duration-300">
                <span className="text-2xl font-bold text-destructive">4</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">{`Poof! It's Gone`}</h3>
              <p className="text-muted-foreground">
                Close the tab and everything vanishes forever. Like your conversation never happened.
              </p>
              <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <Flame className="h-6 w-6 text-destructive mx-auto animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 text-center">
          <div className="inline-flex items-center justify-center p-1 bg-card rounded-full border shadow-sm hover:shadow-md transition-shadow duration-300">
            <Button asChild size="lg" className="rounded-full px-8 gap-2 group">
              <Link href="/chat">
                Start Chatting
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground max-w-md mx-auto">
            No account needed. No data stored. Just pure, private communication.
          </p>
        </div>
      </section>

      <div className="border-t pt-8 mt-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-muted-foreground text-sm">
            Ephemeral Chat — Conversations that disappear without a trace.
          </p>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              No History
            </Badge>
            <Badge variant="outline" className="text-xs">
              <Shield className="h-3 w-3 mr-1" />
              No Storage
            </Badge>
            <Badge variant="outline" className="text-xs">
              <Lock className="h-3 w-3 mr-1" />
              No Tracking
            </Badge>
          </div>
        </div>
      </div>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
  animationClass,
}: {
  icon: React.ReactNode
  title: string
  description: string
  animationClass: string
}) {
  return (
    <Card className={`transition-all duration-300 ${animationClass}`}>
      <CardHeader>
        <div className="flex justify-center mb-4">{icon}</div>
        <CardTitle className="text-xl text-center">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-center text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}