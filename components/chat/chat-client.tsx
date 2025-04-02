"use client"

import type React from "react"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useTheme } from "next-themes"
import Link from "next/link"
import {
  CheckCircle,
  Send,
  User,
  Users,
  MessageSquare,
  AlertCircle,
  Archive,
  Flame,
  Search,
  ArrowLeft,
  MoreVertical,
  Smile,
  Paperclip,
  Mic,
  Moon,
  Sun,
  X,
} from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { useChatContext } from "@/contexts/chat-context"
import { useChatActions } from "@/hooks/use-chat-actions"

// Utility functions
function getInitials(name: string) {
  return name.substring(0, 2).toUpperCase()
}

function getAvatarColor(name: string) {
  const colors = [
    "bg-rose-500",
    "bg-pink-500",
    "bg-fuchsia-500",
    "bg-purple-500",
    "bg-violet-500",
    "bg-indigo-500",
    "bg-sky-500",
    "bg-cyan-500",
    "bg-teal-500",
    "bg-emerald-500",
    "bg-green-500",
    "bg-lime-500",
    "bg-yellow-500",
    "bg-amber-500",
    "bg-orange-500",
    "bg-red-500",
  ]

  // Simple hash function to get consistent color for a username
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }

  return colors[Math.abs(hash) % colors.length]
}

export default function ChatClient() {
  const { state, dispatch } = useChatContext()
  const {
    handleUsernameSubmit,
    handleSendMessage,
    handleTyping,
    handleStoppedTyping,
    debouncedStoppedTyping,
    handleConversationSelect,
    handleArchivedConversationSelect,
    handleCreateConversation,
    markMessagesAsRead,
    scrollToBottom,
  } = useChatActions()

  const { theme, setTheme } = useTheme()
  const messageContainerRef = useRef<HTMLDivElement>(null)
  const messageRefs = useRef<Map<string, HTMLElement>>(new Map())

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (state.showUsernameInput) {
        handleUsernameSubmit()
      } else {
        handleSendMessage()
      }
    }
  }

  // Filter conversations based on search query
  const filteredConversations = state.conversations.filter((conv) => {
    const otherParticipants = conv.participants.filter((p) => p !== state.username).join(", ")
    return otherParticipants.toLowerCase().includes(state.searchQuery.toLowerCase())
  })

  const filteredUsers = state.activeUsers.filter(
    (user) => user.username !== state.username && user.username.toLowerCase().includes(state.searchQuery.toLowerCase()),
  )

  const filteredArchivedConversations = state.archivedConversations.filter((conv) => {
    const otherParticipants = conv.participants.filter((p) => p !== state.username).join(", ")
    return otherParticipants.toLowerCase().includes(state.searchQuery.toLowerCase())
  })

  // Set up intersection observer for read receipts
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const msgId = entry.target.getAttribute("data-message-id")
            if (msgId && !state.readMessageIds.has(msgId)) {
              markMessagesAsRead()
            }
          }
        })
      },
      {
        root: messageContainerRef.current,
        threshold: 0.1,
      },
    )

    messageRefs.current.forEach((ref) => {
      if (ref) {
        observer.observe(ref)
      }
    })

    return () => {
      observer.disconnect()
    }
  }, [state.messages, markMessagesAsRead, state.readMessageIds])

  // Mark messages as read when conversation is opened
  useEffect(() => {
    if (state.currentConversationId && state.messages.length > 0) {
      markMessagesAsRead()
    }
  }, [state.currentConversationId, state.messages.length, markMessagesAsRead])

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom()
  }, [state.messages, scrollToBottom])

  if (state.showUsernameInput) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-primary/5 to-destructive/5">
        <div className="w-full max-w-md mx-auto p-6 bg-card rounded-xl shadow-lg border border-muted/30">
          <div className="text-center mb-6">
            <div className="relative mb-4 inline-block">
              <div className="absolute -inset-1 bg-gradient-to-r from-red-500 to-orange-500 rounded-full blur opacity-30 animate-pulse"></div>
              <Flame className="relative h-16 w-16 text-destructive animate-bounce-slow mx-auto" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-red-500 to-orange-500 text-transparent bg-clip-text">
              Ephemeral Chat
            </h1>
            <p className="text-muted-foreground mt-2">Secure, private conversations that vanish without a trace</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-2 bg-muted/30 rounded-lg p-3">
              <User className="text-muted-foreground" />
              <Input
                type="text"
                placeholder="Enter your username..."
                value={state.username}
                onChange={(e) => dispatch({ type: "SET_USERNAME", payload: e.target.value })}
                onKeyDown={handleKeyPress}
                className="flex-1 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/70"
              />
            </div>
            {state.usernameError && (
              <div className="text-destructive text-sm mt-2 animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="h-4 w-4 inline mr-1" />
                {state.usernameError}
              </div>
            )}

            <Button
              onClick={handleUsernameSubmit}
              disabled={!state.username.trim()}
              className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 transition-all duration-300"
            >
              {state.isConnected ? "Join Chat" : state.username.trim() ? "Connect & Join" : "Join Chat"}
            </Button>
          </div>

          <div className="mt-6 text-center">
            <div className="flex justify-center space-x-2">
              <ThemeToggle />
              <Link href="/">
                <Button variant="outline" size="sm">
                  Return to Home
                </Button>
              </Link>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              No account needed. No data stored. Just pure, private communication.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // WhatsApp-style layout
  return (
    <div className="flex flex-col h-screen bg-muted/20">
      {/* Mobile view */}
      <div className="md:hidden flex flex-col h-full">
        {!state.showMobileChat ? (
          // Mobile chat list view
          <div className="flex flex-col h-full">
            <div className="bg-primary/10 p-3 flex items-center justify-between">
              <div className="flex items-center">
                <Link href="/" className="mr-2">
                  <Flame className="h-6 w-6 text-destructive" />
                </Link>
                <h1 className="text-lg font-semibold">Ephemeral</h1>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                  {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </Button>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="p-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search chats or users..."
                  value={state.searchQuery}
                  onChange={(e) => dispatch({ type: "SET_SEARCH_QUERY", payload: e.target.value })}
                  className="pl-9 bg-muted/50"
                />
                {state.searchQuery && (
                  <button
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    onClick={() => dispatch({ type: "SET_SEARCH_QUERY", payload: "" })}
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}
              </div>
            </div>

            <div className="border-b border-border">
              <nav className="flex w-full">
                {[
                  {
                    id: "conversations",
                    label: "Chats",
                    icon: <MessageSquare className="h-4 w-4" />,
                    count: Object.values(state.unreadCounts).reduce((a, b) => a + b, 0),
                    variant: "destructive",
                  },
                  {
                    id: "archived",
                    label: "Archived",
                    icon: <Archive className="h-4 w-4" />,
                    count: state.archivedConversations.length,
                    variant: "secondary",
                  },
                  {
                    id: "users",
                    label: "Users",
                    icon: <Users className="h-4 w-4" />,
                    count: state.activeUsers.filter((user) => user.username !== state.username).length,
                    variant: "secondary",
                  },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => dispatch({ type: "SET_ACTIVE_TAB", payload: tab.id })}
                    className={`flex-1 flex flex-col items-center justify-center py-2 relative transition-colors duration-200 ${
                      state.activeTab === tab.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-center">
                      {tab.icon}
                      {tab.count > 0 && (
                        <Badge
                          variant={tab.variant as "destructive" | "secondary"}
                          className="ml-1 h-4 w-4 flex items-center justify-center p-0 text-[10px]"
                        >
                          {tab.count}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs mt-1">{tab.label}</span>
                    {state.activeTab === tab.id && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary transition-transform duration-200 ease-out" />
                    )}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-hidden">
              {state.activeTab === "conversations" && (
                <ScrollArea className="h-full">
                  {filteredConversations.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="mx-auto h-8 w-8 mb-2 opacity-50" />
                      <p>No conversations yet</p>
                      <p className="text-sm">Start a chat with someone from the Users tab</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-border">
                      {filteredConversations.map((conv) => {
                        const leftUsersInConversation = state.leftUsers[conv.conversationId] || []
                        const otherParticipants = conv.participants.filter((p) => p !== state.username)
                        const conversationTitle = otherParticipants.join(", ")
                        const isUserLeft = leftUsersInConversation.length > 0
                        const isSelected = state.currentConversationId === conv.conversationId

                        return (
                          <li
                            key={conv.conversationId}
                            onClick={() => handleConversationSelect(conv.conversationId)}
                            className={`p-3 cursor-pointer hover:bg-muted flex items-center ${isSelected ? "bg-muted" : ""}`}
                          >
                            <Avatar className="h-12 w-12 mr-3">
                              <AvatarFallback className={getAvatarColor(conversationTitle)}>
                                {getInitials(conversationTitle)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span
                                  className={`font-medium truncate ${isUserLeft ? "text-muted-foreground italic" : ""}`}
                                >
                                  {conversationTitle}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(conv.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground truncate">
                                  {state.typingUser === conversationTitle ? (
                                    <span className="text-primary animate-pulse flex items-center">
                                      <span>typing</span>
                                      <span className="inline-flex">
                                        <span className="animate-bounce mx-0.5">.</span>
                                        <span className="animate-bounce animation-delay-200 mx-0.5">.</span>
                                        <span className="animate-bounce animation-delay-400 mx-0.5">.</span>
                                      </span>
                                    </span>
                                  ) : (
                                    "Tap to view conversation"
                                  )}
                                </span>
                                {state.unreadCounts[conv.conversationId] > 0 && (
                                  <Badge
                                    variant="destructive"
                                    className="ml-1 h-6 w-6 flex items-center justify-center p-0 rounded-full animate-pulse"
                                  >
                                    {state.unreadCounts[conv.conversationId]}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </ScrollArea>
              )}

              {state.activeTab === "archived" && (
                <ScrollArea className="h-full">
                  {filteredArchivedConversations.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Archive className="mx-auto h-8 w-8 mb-2 opacity-50" />
                      <p>No archived chats</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-border">
                      {filteredArchivedConversations.map((conv) => {
                        const otherParticipants = conv.participants.filter((p) => p !== state.username)
                        const conversationTitle = otherParticipants.join(", ")
                        const isSelected = state.selectedArchivedConversation === conv.conversationId

                        return (
                          <li
                            key={conv.conversationId}
                            onClick={() => handleArchivedConversationSelect(conv.conversationId)}
                            className={`p-3 cursor-pointer hover:bg-muted flex items-center ${isSelected ? "bg-muted" : ""}`}
                          >
                            <Avatar className="h-12 w-12 mr-3">
                              <AvatarFallback className={`${getAvatarColor(conversationTitle)} opacity-50`}>
                                {getInitials(conversationTitle)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="font-medium truncate text-muted-foreground italic">
                                  {conversationTitle}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(conv.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="flex items-center">
                                <Badge variant="outline" className="text-xs">
                                  Archived
                                </Badge>
                              </div>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </ScrollArea>
              )}

              {state.activeTab === "users" && (
                <ScrollArea className="h-full">
                  {filteredUsers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="mx-auto h-8 w-8 mb-2 opacity-50" />
                      <p>No active users</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-border">
                      {filteredUsers.map((user) => (
                        <li
                          key={user.username}
                          onClick={() => handleCreateConversation(user.username)}
                          className="p-3 cursor-pointer hover:bg-muted flex items-center"
                        >
                          <Avatar className="h-12 w-12 mr-3">
                            <AvatarFallback className={getAvatarColor(user.username)}>
                              {getInitials(user.username)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="font-medium">{user.username}</div>
                            <div className="text-xs text-muted-foreground">
                              {user.connectionIds.length} device{user.connectionIds.length !== 1 ? "s" : ""}
                            </div>
                          </div>
                          <Button size="sm" variant="ghost" className="ml-2">
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </ScrollArea>
              )}
            </div>
          </div>
        ) : (
          // Mobile chat view
          <div className="flex flex-col h-full">
            {state.currentConversationId && (
              <>
                <div className="bg-primary/10 p-3 flex items-center">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="mr-1" 
                    onClick={() => dispatch({ type: "SET_SHOW_MOBILE_CHAT", payload: false })}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>

                  {state.conversations.map((conv) => {
                    if (conv.conversationId === state.currentConversationId) {
                      const otherParticipants = conv.participants.filter((p) => p !== state.username)
                      const conversationTitle = otherParticipants.join(", ")
                      return (
                        <div key={conv.conversationId} className="flex items-center flex-1">
                          <Avatar className="h-8 w-8 mr-2">
                            <AvatarFallback className={getAvatarColor(conversationTitle)}>
                              {getInitials(conversationTitle)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="overflow-hidden">
                            <h2 className="text-base font-medium truncate">{conversationTitle}</h2>
                            {state.typingUser === conversationTitle ? (
                              <p className="text-xs text-primary animate-pulse truncate flex items-center">
                                <span>{state.typingUser} is typing</span>
                                <span className="ml-1 inline-flex">
                                  <span className="animate-bounce mx-0.5">.</span>
                                  <span className="animate-bounce animation-delay-200 mx-0.5">.</span>
                                  <span className="animate-bounce animation-delay-400 mx-0.5">.</span>
                                </span>
                              </p>
                            ) : null}
                          </div>
                        </div>
                      )
                    }
                    return null
                  })}

                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </div>

                <div className="flex-1 overflow-hidden bg-gradient-to-b from-muted/30 to-background">
                  <ScrollArea className="h-full p-3" ref={messageContainerRef}>
                    {state.messages.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-center p-4">
                        <div className="text-muted-foreground">
                          <MessageSquare className="mx-auto h-12 w-12 mb-4 opacity-30" />
                          <p className="text-lg font-medium">No messages yet</p>
                          <p className="text-sm">Start the conversation by sending a message below</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {state.messages.map((msg, index) => {
                          const isFirstInGroup =
                            index === 0 || state.messages[index - 1].senderUsername !== msg.senderUsername

                          return (
                            <div
                              key={index}
                              className={`flex ${msg.isOwnMessage ? "justify-end" : "justify-start"}`}
                              ref={(el) => {
                                if (el) {
                                  messageRefs.current.set(msg.messageId, el)
                                }
                              }}
                              data-message-id={msg.messageId}
                            >
                              <div
                                className={cn(
                                  "px-3 py-2 max-w-[80%] break-words",
                                  msg.isOwnMessage
                                    ? "bg-primary text-primary-foreground rounded-tl-lg rounded-bl-lg rounded-tr-lg"
                                    : "bg-muted rounded-tr-lg rounded-br-lg rounded-bl-lg",
                                  isFirstInGroup && !msg.isOwnMessage && "rounded-tl-none",
                                  isFirstInGroup && msg.isOwnMessage && "rounded-tr-none",
                                )}
                              >
                                {isFirstInGroup && !msg.isOwnMessage && (
                                  <div className="text-xs font-medium mb-1 text-muted-foreground">
                                    {msg.senderUsername}
                                  </div>
                                )}
                                <div>{msg.content}</div>
                                <div className="text-xs mt-1 text-right flex justify-end items-center gap-1">
                                  {new Date(msg.timestamp).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                  {msg.isOwnMessage && msg.readBy.length > 0 && (
                                    <CheckCircle className="h-3 w-3 text-green-500" />
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </div>

                <div className="p-2 bg-card border-t">
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="icon" className="text-muted-foreground">
                      <Smile className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-muted-foreground">
                      <Paperclip className="h-5 w-5" />
                    </Button>
                    <Input
                      type="text"
                      placeholder="Type a message..."
                      value={state.message}
                      onChange={(e) => {
                        dispatch({ type: "SET_MESSAGE", payload: e.target.value })
                        if (e.target.value.trim()) {
                          handleTyping()
                          debouncedStoppedTyping()
                        } else {
                          handleStoppedTyping()
                        }
                      }}
                      onBlur={handleStoppedTyping}
                      onKeyDown={handleKeyPress}
                      className="flex-1 bg-muted/50"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!state.isConnected || !state.message.trim()}
                      size="icon"
                      className="bg-primary text-primary-foreground rounded-full h-10 w-10"
                    >
                      {state.message.trim() ? <Send className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                    </Button>
                  </div>
                </div>
              </>
            )}

            {!state.currentConversationId && !state.selectedArchivedConversation && (
              <div className="h-full flex items-center justify-center text-center p-8 bg-gradient-to-b from-muted/30 to-background">
                <div className="max-w-md">
                  <div className="relative mb-8">
                    <div className="absolute -inset-1 bg-gradient-to-r from-red-500 to-orange-500 rounded-full blur opacity-30 animate-pulse"></div>
                  </div>
                  <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-red-500 to-orange-500 text-transparent bg-clip-text">
                    Welcome to Ephemeral Chat
                  </h3>
                  <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
                    Your messages disappear forever when you leave. Start a conversation from the sidebar or find
                    someone new.
                  </p>
                  <Button
                    onClick={() => dispatch({ type: "SET_ACTIVE_TAB", payload: "users" })}
                    className="mx-auto bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 transition-all duration-300 shadow-md hover:shadow-lg"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Find Someone to Chat With
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Desktop view */}
      <div className="hidden md:flex h-full">
        {/* Sidebar */}
        <div className="w-1/3 border-r border-border flex flex-col">
          <div className="bg-primary/10 p-3 flex items-center justify-between">
            <div className="flex items-center">
              <Link href="/" className="mr-2">
                <Flame className="h-6 w-6 text-destructive" />
              </Link>
              <h1 className="text-lg font-semibold">Ephemeral</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="p-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search chats or users..."
                value={state.searchQuery}
                onChange={(e) => dispatch({ type: "SET_SEARCH_QUERY", payload: e.target.value })}
                className="pl-9 bg-muted/50"
              />
              {state.searchQuery && (
                <button
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  onClick={() => dispatch({ type: "SET_SEARCH_QUERY", payload: "" })}
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>

          <div className="border-b border-border">
            <nav className="flex w-full">
              {[
                {
                  id: "conversations",
                  label: "Chats",
                  icon: <MessageSquare className="h-4 w-4" />,
                  count: Object.values(state.unreadCounts).reduce((a, b) => a + b, 0),
                  variant: "destructive",
                },
                {
                  id: "archived",
                  label: "Archived",
                  icon: <Archive className="h-4 w-4" />,
                  count: state.archivedConversations.length,
                  variant: "secondary",
                },
                {
                  id: "users",
                  label: "Users",
                  icon: <Users className="h-4 w-4" />,
                  count: state.activeUsers.filter((user) => user.username !== state.username).length,
                  variant: "secondary",
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => dispatch({ type: "SET_ACTIVE_TAB", payload: tab.id })}
                  className={`flex-1 flex flex-col items-center justify-center py-2 relative transition-colors duration-200 ${
                    state.activeTab === tab.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center justify-center">
                    {tab.icon}
                    {tab.count > 0 && (
                      <Badge
                        variant={tab.variant as "destructive" | "secondary"}
                        className="ml-1 h-4 w-4 flex items-center justify-center p-0 text-[10px]"
                      >
                        {tab.count}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs mt-1">{tab.label}</span>
                  {state.activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary transition-transform duration-200 ease-out" />
                  )}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex-1 overflow-hidden">
            {state.activeTab === "conversations" && (
              <ScrollArea className="h-full">
                {filteredConversations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="mx-auto h-8 w-8 mb-2 opacity-50" />
                    <p>No conversations yet</p>
                    <p className="text-sm">Start a chat with someone from the Users tab</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {filteredConversations.map((conv) => {
                      const leftUsersInConversation = state.leftUsers[conv.conversationId] || []
                      const otherParticipants = conv.participants.filter((p) => p !== state.username)
                      const conversationTitle = otherParticipants.join(", ")
                      const isUserLeft = leftUsersInConversation.length > 0
                      const isSelected = state.currentConversationId === conv.conversationId

                      return (
                        <li
                          key={conv.conversationId}
                          onClick={() => handleConversationSelect(conv.conversationId)}
                          className={`p-3 cursor-pointer hover:bg-muted flex items-center ${isSelected ? "bg-muted" : ""}`}
                        >
                          <Avatar className="h-12 w-12 mr-3">
                            <AvatarFallback className={getAvatarColor(conversationTitle)}>
                              {getInitials(conversationTitle)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span
                                className={`font-medium truncate ${isUserLeft ? "text-muted-foreground italic" : ""}`}
                              >
                                {conversationTitle}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(conv.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground truncate">
                                {state.typingUser === conversationTitle ? (
                                  <span className="text-primary animate-pulse flex items-center">
                                    <span>typing</span>
                                    <span className="inline-flex">
                                      <span className="animate-bounce mx-0.5">.</span>
                                      <span className="animate-bounce animation-delay-200 mx-0.5">.</span>
                                      <span className="animate-bounce animation-delay-400 mx-0.5">.</span>
                                    </span>
                                  </span>
                                ) : (
                                  "Click to view conversation"
                                )}
                              </span>
                              {state.unreadCounts[conv.conversationId] > 0 && (
                                <Badge
                                  variant="destructive"
                                  className="ml-1 h-6 w-6 flex items-center justify-center p-0 rounded-full animate-pulse"
                                >
                                  {state.unreadCounts[conv.conversationId]}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </ScrollArea>
            )}

            {state.activeTab === "archived" && (
              <ScrollArea className="h-full">
                {filteredArchivedConversations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Archive className="mx-auto h-8 w-8 mb-2 opacity-50" />
                    <p>No archived chats</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {filteredArchivedConversations.map((conv) => {
                      const otherParticipants = conv.participants.filter((p) => p !== state.username)
                      const conversationTitle = otherParticipants.join(", ")
                      const isSelected = state.selectedArchivedConversation === conv.conversationId

                      return (
                        <li
                          key={conv.conversationId}
                          onClick={() => handleArchivedConversationSelect(conv.conversationId)}
                          className={`p-3 cursor-pointer hover:bg-muted flex items-center ${isSelected ? "bg-muted" : ""}`}
                        >
                          <Avatar className="h-12 w-12 mr-3">
                            <AvatarFallback className={`${getAvatarColor(conversationTitle)} opacity-50`}>
                              {getInitials(conversationTitle)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-medium truncate text-muted-foreground italic">
                                {conversationTitle}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(conv.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex items-center">
                              <Badge variant="outline" className="text-xs">
                                Archived
                              </Badge>
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </ScrollArea>
            )}

            {state.activeTab === "users" && (
              <ScrollArea className="h-full">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="mx-auto h-8 w-8 mb-2 opacity-50" />
                    <p>No active users</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {filteredUsers.map((user) => (
                      <li
                        key={user.username}
                        onClick={() => handleCreateConversation(user.username)}
                        className="p-3 cursor-pointer hover:bg-muted flex items-center"
                      >
                        <Avatar className="h-12 w-12 mr-3">
                          <AvatarFallback className={getAvatarColor(user.username)}>
                            {getInitials(user.username)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="font-medium">{user.username}</div>
                          <div className="text-xs text-muted-foreground">
                            {user.connectionIds.length} device{user.connectionIds.length !== 1 ? "s" : ""}
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" className="ml-2">
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </ScrollArea>
            )}
          </div>

          <div className="p-3 border-t border-border">
            <div className="flex items-center">
              <Avatar className="h-10 w-10 mr-3">
                <AvatarFallback className={getAvatarColor(state.username)}>{getInitials(state.username)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="font-medium">{state.username}</div>
                <div className="text-xs text-muted-foreground">Online</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main chat area */}
        <div className="w-2/3 flex flex-col">
          {state.currentConversationId && (
            <>
              <div className="bg-primary/10 p-3 flex items-center justify-between border-b border-border">
                {state.conversations.map((conv) => {
                  if (conv.conversationId === state.currentConversationId) {
                    const otherParticipants = conv.participants.filter((p) => p !== state.username)
                    const conversationTitle = otherParticipants.join(", ")
                    return (
                      <div key={conv.conversationId} className="flex items-center flex-1">
                        <Avatar className="h-8 w-8 mr-2">
                          <AvatarFallback className={getAvatarColor(conversationTitle)}>
                            {getInitials(conversationTitle)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h2 className="text-base font-medium">{conversationTitle}</h2>
                          {state.typingUser === conversationTitle ? (
                            <p className="text-xs text-primary animate-pulse flex items-center">
                              <span>{state.typingUser} is typing</span>
                              <span className="ml-1 inline-flex">
                                <span className="animate-bounce mx-0.5">.</span>
                                <span className="animate-bounce animation-delay-200 mx-0.5">.</span>
                                <span className="animate-bounce animation-delay-400 mx-0.5">.</span>
                              </span>
                            </p>
                          ) : null}
                        </div>
                      </div>
                    )
                  }
                  return null
                })}

                <div className="flex items-center">
                  <Button variant="ghost" size="icon">
                    <Search className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-hidden bg-gradient-to-b from-muted/30 to-background">
                {/* Chat messages */}
                <ScrollArea className="h-full p-3" ref={messageContainerRef}>
                    {state.messages.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-center p-4">
                        <div className="text-muted-foreground">
                          <MessageSquare className="mx-auto h-12 w-12 mb-4 opacity-30" />
                          <p className="text-lg font-medium">No messages yet</p>
                          <p className="text-sm">Start the conversation by sending a message below</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {state.messages.map((msg, index) => {
                          const isFirstInGroup =
                            index === 0 || state.messages[index - 1].senderUsername !== msg.senderUsername

                          return (
                            <div
                              key={index}
                              className={`flex ${msg.isOwnMessage ? "justify-end" : "justify-start"}`}
                              ref={(el) => {
                                if (el) {
                                  messageRefs.current.set(msg.messageId, el)
                                }
                              }}
                              data-message-id={msg.messageId}
                            >
                              <div
                                className={cn(
                                  "px-3 py-2 max-w-[80%] break-words",
                                  msg.isOwnMessage
                                    ? "bg-primary text-primary-foreground rounded-tl-lg rounded-bl-lg rounded-tr-lg"
                                    : "bg-muted rounded-tr-lg rounded-br-lg rounded-bl-lg",
                                  isFirstInGroup && !msg.isOwnMessage && "rounded-tl-none",
                                  isFirstInGroup && msg.isOwnMessage && "rounded-tr-none",
                                )}
                              >
                                {isFirstInGroup && !msg.isOwnMessage && (
                                  <div className="text-xs font-medium mb-1 text-muted-foreground">
                                    {msg.senderUsername}
                                  </div>
                                )}
                                <div>{msg.content}</div>
                                <div className="text-xs mt-1 text-right flex justify-end items-center gap-1">
                                  {new Date(msg.timestamp).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                  {msg.isOwnMessage && msg.readBy.length > 0 && (
                                    <CheckCircle className="h-3 w-3 text-green-500" />
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </ScrollArea>
              </div>

              <div className="p-3 bg-card border-t">
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="icon" className="text-muted-foreground">
                    <Smile className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-muted-foreground">
                    <Paperclip className="h-5 w-5" />
                  </Button>
                  <Input
                    type="text"
                    placeholder="Type a message..."
                    value={state.message}
                    onChange={(e) => {
                      dispatch({ type: "SET_MESSAGE", payload: e.target.value })
                      if (e.target.value.trim()) {
                        handleTyping()
                        debouncedStoppedTyping()
                      } else {
                        handleStoppedTyping()
                      }
                    }}
                    onBlur={handleStoppedTyping}
                    onKeyDown={handleKeyPress}
                    className="flex-1 bg-muted/50"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!state.isConnected || !state.message.trim()}
                    size="icon"
                    className="bg-primary text-primary-foreground rounded-full h-10 w-10"
                  >
                    {state.message.trim() ? <Send className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </Button>
                </div>
              </div>
            </>
          )}

          {!state.currentConversationId && !state.selectedArchivedConversation && (
              <div className="flex-1 flex items-center justify-center text-center p-8 bg-gradient-to-b from-muted/30 to-background">
                <div className="max-w-md">
                  <div className="relative mb-8">
                    <div className="absolute -inset-1 bg-gradient-to-r from-red-500 to-orange-500 rounded-full blur opacity-30 animate-pulse"></div>
                  </div>
                  <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-red-500 to-orange-500 text-transparent bg-clip-text">
                    Welcome to Ephemeral Chat
                  </h3>
                  <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
                    Your messages disappear forever when you leave. Start a conversation from the sidebar or find
                    someone new.
                  </p>
                  <Button
                    onClick={() => dispatch({ type: "SET_ACTIVE_TAB", payload: "users" })}
                    className="mx-auto bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 transition-all duration-300 shadow-md hover:shadow-lg"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Find Someone to Chat With
                  </Button>
                </div>
              </div>
            )}

          {/* Archived conversation view */}
          {state.selectedArchivedConversation && (
            <>
              <div className="bg-primary/10 p-3 flex items-center justify-between border-b border-border">
                {state.archivedConversations.map((conv) => {
                  if (conv.conversationId === state.selectedArchivedConversation) {
                    const otherParticipants = conv.participants.filter((p) => p !== state.username)
                    const conversationTitle = otherParticipants.join(", ")
                    return (
                      <div key={conv.conversationId} className="flex items-center flex-1">
                        <Avatar className="h-8 w-8 mr-2">
                          <AvatarFallback className={`${getAvatarColor(conversationTitle)} opacity-50`}>
                            {getInitials(conversationTitle)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h2 className="text-base font-medium text-muted-foreground italic">{conversationTitle}</h2>
                          <Badge variant="outline" className="text-xs">Archived</Badge>
                        </div>
                      </div>
                    )
                  }
                  return null
                })}

                <div className="flex items-center">
                  <Button variant="ghost" size="icon">
                    <Search className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-hidden bg-gradient-to-b from-muted/30 to-background">
                {/* Archived Chat messages - Display only */}
                <ScrollArea className="h-full p-3" ref={messageContainerRef}>
                    {state.messages.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-center p-4">
                        <div className="text-muted-foreground">
                          <MessageSquare className="mx-auto h-12 w-12 mb-4 opacity-30" />
                          <p className="text-lg font-medium">No messages in archived chat</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {state.messages.map((msg, index) => {
                          const isFirstInGroup =
                            index === 0 || state.messages[index - 1].senderUsername !== msg.senderUsername

                          return (
                            <div
                              key={index}
                              className={`flex ${msg.isOwnMessage ? "justify-end" : "justify-start"}`}
                              ref={(el) => {
                                if (el) {
                                  messageRefs.current.set(msg.messageId, el)
                                }
                              }}
                              data-message-id={msg.messageId}
                            >
                              <div
                                className={cn(
                                  "px-3 py-2 max-w-[80%] break-words",
                                  msg.isOwnMessage
                                    ? "bg-primary text-primary-foreground rounded-tl-lg rounded-bl-lg rounded-tr-lg"
                                    : "bg-muted rounded-tr-lg rounded-br-lg rounded-bl-lg",
                                  isFirstInGroup && !msg.isOwnMessage && "rounded-tl-none",
                                  isFirstInGroup && msg.isOwnMessage && "rounded-tr-none",
                                )}
                              >
                                {isFirstInGroup && !msg.isOwnMessage && (
                                  <div className="text-xs font-medium mb-1 text-muted-foreground">
                                    {msg.senderUsername}
                                  </div>
                                )}
                                <div>{msg.content}</div>
                                <div className="text-xs mt-1 text-right flex justify-end items-center gap-1">
                                  {new Date(msg.timestamp).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                  {msg.isOwnMessage && msg.readBy.length > 0 && (
                                    <CheckCircle className="h-3 w-3 text-green-500" />
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </ScrollArea>
              </div>

              <div className="p-3 bg-card border-t">
                <div className="flex items-center space-x-2">
                  <p className="text-muted-foreground italic">This conversation is archived and cannot be modified.</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

