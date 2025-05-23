"use client"

import ChatClient from "@/components/chat/chat-client"
import { AlertTriangle, Flame, Lock, Shield, ChevronDown, ChevronUp } from "lucide-react"
import { useState } from "react"
import { ChatProvider } from "@/contexts/chat-context"

export default function ChatPage() {
  return (
    <div className="h-screen flex flex-col">
      <ChatProvider>
        <ChatClient key="chat-client" />
      </ChatProvider>

      <div className="container mx-auto px-2 pb-4">
        <PrivacyNotice />
      </div>
    </div>
  )
}

function PrivacyNotice() {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="mt-2 bg-destructive/5 border border-destructive/20 rounded-lg max-w-6xl mx-auto overflow-hidden transition-all duration-300 shadow-sm hover:shadow">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 flex items-center justify-between text-left"
      >
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mr-3" />
          <h3 className="font-semibold text-destructive">Privacy Notice</h3>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 pt-0 animate-in slide-in-from-top duration-300">
          <ul className="space-y-2 text-sm pl-8">
            <li className="flex items-start">
              <Flame className="h-4 w-4 text-destructive shrink-0 mt-0.5 mr-2" />
              <span>
                All conversations exist only in memory and will be permanently deleted when you close the chat.
              </span>
            </li>
            <li className="flex items-start">
              <Lock className="h-4 w-4 text-destructive shrink-0 mt-0.5 mr-2" />
              <span>Nothing is saved to a database; this is purely a connection between sockets.</span>
            </li>
            <li className="flex items-start">
              <Shield className="h-4 w-4 text-destructive shrink-0 mt-0.5 mr-2" />
              <span>
                All messages and conversations are permanently deleted from the server after a user disconnects.
              </span>
            </li>
          </ul>
          <p className="text-xs text-muted-foreground mt-3 italic pl-8">
            Use this application at your own responsibility.
          </p>
        </div>
      )}
    </div>
  )
}

