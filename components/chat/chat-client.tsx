"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { cn } from "@/lib/utils"
import * as signalR from "@microsoft/signalr"
import { formatRelative } from "date-fns"
import { enGB } from "date-fns/locale"

// Add these CSS classes
const animationDelayClasses = {
    "animation-delay-200": "animation-delay-200",
    "animation-delay-400": "animation-delay-400",
}

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

interface Message {
    messageId: string
    conversationId: string
    senderUsername: string
    content: string
    timestamp: string
    isOwnMessage: boolean
    readBy: string[]
}

interface ActiveUser {
    username: string
    connectionIds: string[]
}

interface UserConnection {
    username: string
    connectionId: string
}

interface Conversation {
    conversationId: string
    participants: string[]
    createdAt: string
}

interface LeavedConversation extends Conversation {
    lastMessages: Message[]
}

export default function ChatClient() {
    const [connection, setConnection] = useState<signalR.HubConnection | null>(null)
    const [username, setUsername] = useState<string>("")
    const [message, setMessage] = useState<string>("")
    const [messages, setMessages] = useState<Message[]>([])
    const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([])
    const messageContainerRef = useRef<HTMLDivElement>(null)
    const [typingUser, setTypingUser] = useState<string | null>(null)
    const [isConnected, setIsConnected] = useState<boolean>(false)
    const [conversations, setConversations] = useState<Conversation[]>([])
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
    const [showUsernameInput, setShowUsernameInput] = useState<boolean>(true)
    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
    const [readMessageIds, setReadMessageIds] = useState<Set<string>>(new Set())
    const messageRefs = useRef<Map<string, HTMLElement>>(new Map())
    const [leftUsers, setLeftUsers] = useState<Record<string, string[]>>({})
    const [leavedConversations, setLeavedConversations] = useState<LeavedConversation[]>([])
    const [selectedLeavedConversation, setSelectedLeavedConversation] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<string>("conversations")
    const [searchQuery, setSearchQuery] = useState<string>("")
    const [showMobileChat, setShowMobileChat] = useState<boolean>(false)
    const { theme, setTheme } = useTheme()

    const updateUnreadCount = (conversationId: string) => {
        setUnreadCounts((prevCounts) => ({
            ...prevCounts,
            [conversationId]: (prevCounts[conversationId] || 0) + 1,
        }))
    }

    useEffect(() => {
        // Just build the connection but don't start it yet
        const newConnection = new signalR.HubConnectionBuilder()
            .withUrl("http://localhost:5184/chat")
            .withAutomaticReconnect()
            .build()

        setConnection(newConnection)

        return () => {
            if (newConnection) {
                // Ensure we properly stop the connection when unmounting
                if (newConnection.state === signalR.HubConnectionState.Connected) {
                    newConnection.stop().catch((err) => console.error("Error stopping connection:", err))
                } else if (newConnection.state === signalR.HubConnectionState.Connecting) {
                    // If it's still connecting, we need to handle that too
                    console.log("Component unmounted while connection was still connecting")
                }
            }
        }
    }, [])

    useEffect(() => {
        if (connection && username) {
            // First, remove any existing listeners to prevent duplicates
            connection.off("ReceiveMessage")
            connection.off("UserConnected")
            connection.off("UserDisconnected")
            connection.off("UserDeviceDisconnected")
            connection.off("ErrorMessage")
            connection.off("UserTyping")
            connection.off("UserStoppedTyping")
            connection.off("ConversationCreated")
            connection.off("MessageRead")
            connection.off("UserLeftConversation")

            connection.on("ReceiveMessage", (newMessage: Message) => {
                if (currentConversationId === newMessage.conversationId) {
                    setMessages((prevMessages) => [
                        ...prevMessages,
                        { ...newMessage, isOwnMessage: newMessage.senderUsername === username },
                    ])
                    scrollToBottom()
                } else {
                    updateUnreadCount(newMessage.conversationId)
                }
            })

            connection.on("UserConnected", (user: UserConnection) => {
                console.log(`${user.username} connected`)
                fetchActiveUsers()
            })

            connection.on("UserDisconnected", (disconnectedUsername: string) => {
                console.log(`${disconnectedUsername} disconnected`)
                fetchActiveUsers()
            })

            connection.on("UserDeviceDisconnected", (disconnectedUsername: string, connectionId: string) => {
                console.log(`${disconnectedUsername} device ${connectionId} disconnected`)
                fetchActiveUsers()
            })

            connection.on("ErrorMessage", (errorMessage: string) => {
                alert(errorMessage)
            })

            connection.on("UserTyping", (typingUsername: string) => {
                setTypingUser(typingUsername)
            })

            connection.on("UserStoppedTyping", (stoppedTypingUsername: string) => {
                setTypingUser(null)
            })

            connection.on("ConversationCreated", (newConversation: Conversation) => {
                if (newConversation.participants.includes(username)) {
                    setConversations((prevConversations) => [...prevConversations, newConversation])
                }
            })

            connection.on("MessageRead", (conversationId: string, messageId: string, readerUsername: string) => {
                if (conversationId === currentConversationId) {
                    setMessages((prevMessages) =>
                        prevMessages.map((msg) =>
                            msg.messageId === messageId && !msg.readBy.includes(username)
                                ? { ...msg, readBy: [...msg.readBy, readerUsername] }
                                : msg,
                        ),
                    )
                }
            })

            connection.on("UserLeftConversation", (conversationId: string, leavingUsername: string) => {
                // Update leftUsers state
                setLeftUsers((prevLeftUsers) => {
                    const updatedLeftUsers = { ...prevLeftUsers }
                    if (updatedLeftUsers[conversationId]) {
                        updatedLeftUsers[conversationId] = [...updatedLeftUsers[conversationId], leavingUsername]
                    } else {
                        updatedLeftUsers[conversationId] = [leavingUsername]
                    }
                    return updatedLeftUsers
                })

                // Move conversation to leavedConversations if user is a participant
                if (
                    conversations.find((conv) => conv.conversationId === conversationId && conv.participants.includes(username))
                ) {
                    setLeavedConversations((prevLeavedConversations) => {
                        const existingConversation = prevLeavedConversations.find((conv) => conv.conversationId === conversationId)
                        if (!existingConversation) {
                            const conversationToMove = conversations.find((conv) => conv.conversationId === conversationId)
                            if (conversationToMove) {
                                const lastMessages = messages
                                    .filter((msg) => msg.conversationId === conversationId)
                                    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                                    .slice(-10)

                                return [...prevLeavedConversations, { ...conversationToMove, lastMessages }]
                            }
                        }
                        return prevLeavedConversations
                    })
                    setConversations((prevConversations) =>
                        prevConversations.filter((conv) => conv.conversationId !== conversationId),
                    )
                    if (currentConversationId === conversationId) {
                        setCurrentConversationId(null)
                    }
                }
            })

            fetchConversations()
            return () => {
                // This cleanup will run when the dependencies change
                connection.off("ReceiveMessage")
                connection.off("UserConnected")
                connection.off("UserDisconnected")
                connection.off("UserDeviceDisconnected")
                connection.off("ErrorMessage")
                connection.off("UserTyping")
                connection.off("UserStoppedTyping")
                connection.off("ConversationCreated")
                connection.off("MessageRead")
                connection.off("UserLeftConversation")
            }
        }
    }, [connection, username, currentConversationId, conversations, messages])

    // Replace with an improved scrollToBottom function that works better on mobile
    const scrollToBottom = () => {
        setTimeout(() => {
            if (messageContainerRef.current) {
                messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight
            }
        }, 100) // Small delay to ensure content is rendered
    }

    // Add this useEffect to ensure scrolling happens when messages change
    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const handleUsernameSubmit = () => {
        if (!username.trim()) {
            alert("Please enter a username")
            return
        }

        if (connection) {
            // Start the connection only when username is submitted
            connection
                .start()
                .then(() => {
                    console.log("SignalR Connected!")
                    setIsConnected(true)

                    // Now that we're connected, set the username
                    return connection.invoke("SetUsername", username)
                })
                .then(() => {
                    setShowUsernameInput(false)
                    fetchActiveUsers()
                    fetchConversations()
                })
                .catch((err) => {
                    console.error("Connection or SetUsername Error: ", err)
                    setIsConnected(false)
                })
        }
    }

    const handleSendMessage = () => {
        if (connection && connection.state === signalR.HubConnectionState.Connected && currentConversationId) {
            if (message.trim() === "") return
            connection
                .invoke("SendMessage", currentConversationId, message)
                .catch((err) => console.error("SendMessage Error: ", err))
            setMessage("")
        }
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            if (showUsernameInput) {
                handleUsernameSubmit()
            } else {
                handleSendMessage()
            }
        }
    }

    const fetchActiveUsers = () => {
        if (connection && connection.state === signalR.HubConnectionState.Connected) {
            connection
                .invoke("GetActiveUsers")
                .then((users: ActiveUser[]) => setActiveUsers(users))
                .catch((err) => console.error("GetActiveUsers Error: ", err))
        }
    }

    const fetchConversations = () => {
        if (connection && connection.state === signalR.HubConnectionState.Connected && username) {
            connection
                .invoke("GetConversationsForUser", username)
                .then((convs: Conversation[]) => setConversations(convs))
                .catch((err) => console.error("GetConversations Error: ", err))
        }
    }

    const handleTyping = () => {
        if (connection && connection.state === signalR.HubConnectionState.Connected && currentConversationId) {
            const recipient = conversations
                .find((conv) => conv.conversationId === currentConversationId)
                ?.participants.find((p) => p !== username)
            if (recipient) {
                connection.invoke("Typing", recipient)
            }
        }
    }

    const handleStoppedTyping = () => {
        if (connection && connection.state === signalR.HubConnectionState.Connected && currentConversationId) {
            const recipient = conversations
                .find((conv) => conv.conversationId === currentConversationId)
                ?.participants.find((p) => p !== username)
            if (recipient) {
                connection.invoke("StoppedTyping", recipient)
            }
        }
    }

    const handleCreateConversation = async (otherUsername: string) => {
        if (connection && connection.state === signalR.HubConnectionState.Connected && username) {
            try {
                const conversationId = await connection.invoke<string>("CreateConversation", [username, otherUsername])
                setCurrentConversationId(conversationId)
                fetchConversationMessages(conversationId)
                fetchConversations()
                setActiveTab("conversations")
                setShowMobileChat(true)
            } catch (err) {
                console.error("CreateConversation Error: ", err)
            }
        }
    }

    const fetchConversationMessages = async (conversationId: string | null) => {
        if (connection && connection.state === signalR.HubConnectionState.Connected && conversationId) {
            try {
                const msgs = await connection.invoke<Message[]>("GetConversationMessages", conversationId)
                setMessages(msgs.map((msg) => ({ ...msg, isOwnMessage: msg.senderUsername === username })))
                scrollToBottom()
            } catch (err) {
                console.error("GetConversationMessages Error: ", err)
            }
        }
    }

    const handleConversationSelect = (selectedConversationId: string) => {
        setCurrentConversationId(selectedConversationId)
        fetchConversationMessages(selectedConversationId)
        setUnreadCounts((prevCounts) => {
            const newCounts = { ...prevCounts }
            delete newCounts[selectedConversationId]
            return newCounts
        })
        setTypingUser(null)
        setReadMessageIds(new Set())
        setSelectedLeavedConversation(null)
        setShowMobileChat(true)
    }

    const handleLeavedConversationSelect = (conversationId: string) => {
        setSelectedLeavedConversation(conversationId)
        setCurrentConversationId(null)
        setShowMobileChat(true)
    }

    const markMessagesAsRead = useCallback(() => {
        if (connection && connection.state === signalR.HubConnectionState.Connected && currentConversationId) {
            const unreadMessageIds = messages
                .filter((msg) => !msg.isOwnMessage && !msg.readBy.includes(username) && !readMessageIds.has(msg.messageId))
                .map((msg) => msg.messageId)

            if (unreadMessageIds.length > 0) {
                connection
                    .invoke("MarkMessagesAsRead", currentConversationId, Array.from(unreadMessageIds))
                    .catch((err) => console.error("MarkMessagesAsRead Error: ", err))
                setReadMessageIds((prevReadMessageIds) => new Set([...Array.from(prevReadMessageIds), ...unreadMessageIds]))
            }
        }
    }, [connection, currentConversationId, messages, username, readMessageIds])

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const messageId = entry.target.getAttribute("data-message-id")
                        if (messageId && !readMessageIds.has(messageId)) {
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

        messageRefs.current.forEach((ref, messageId) => {
            if (ref) {
                observer.observe(ref)
            }
        })

        return () => {
            observer.disconnect()
        }
    }, [messages, markMessagesAsRead])

    const getInitials = (name: string) => {
        return name.substring(0, 2).toUpperCase()
    }

    const getAvatarColor = (name: string) => {
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

    const filteredConversations = conversations.filter((conv) => {
        const otherParticipants = conv.participants.filter((p) => p !== username).join(", ")
        return otherParticipants.toLowerCase().includes(searchQuery.toLowerCase())
    })

    const filteredUsers = activeUsers.filter(
        (user) => user.username !== username && user.username.toLowerCase().includes(searchQuery.toLowerCase()),
    )

    const filteredArchivedConversations = leavedConversations.filter((conv) => {
        const otherParticipants = conv.participants.filter((p) => p !== username).join(", ")
        return otherParticipants.toLowerCase().includes(searchQuery.toLowerCase())
    })

    if (showUsernameInput) {
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
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                onKeyDown={handleKeyPress}
                                className="flex-1 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/70"
                            />
                        </div>

                        <Button
                            onClick={handleUsernameSubmit}
                            disabled={!username.trim()}
                            className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 transition-all duration-300"
                        >
                            {isConnected ? "Join Chat" : username.trim() ? "Connect & Join" : "Join Chat"}
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
                {!showMobileChat ? (
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
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 bg-muted/50"
                                />
                                {searchQuery && (
                                    <button
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2"
                                        onClick={() => setSearchQuery("")}
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
                                        count: Object.values(unreadCounts).reduce((a, b) => a + b, 0),
                                        variant: "destructive",
                                    },
                                    {
                                        id: "archived",
                                        label: "Archived",
                                        icon: <Archive className="h-4 w-4" />,
                                        count: leavedConversations.length,
                                        variant: "secondary",
                                    },
                                    {
                                        id: "users",
                                        label: "Users",
                                        icon: <Users className="h-4 w-4" />,
                                        count: activeUsers.filter((user) => user.username !== username).length,
                                        variant: "secondary",
                                    },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex-1 flex flex-col items-center justify-center py-2 relative transition-colors duration-200 ${activeTab === tab.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
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
                                        {activeTab === tab.id && (
                                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary transition-transform duration-200 ease-out" />
                                        )}
                                    </button>
                                ))}
                            </nav>
                        </div>

                        <div className="flex-1 overflow-hidden">
                            {activeTab === "conversations" && (
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
                                                const leftUsersInConversation = leftUsers[conv.conversationId] || []
                                                const otherParticipants = conv.participants.filter((p) => p !== username)
                                                const conversationTitle = otherParticipants.join(", ")
                                                const isUserLeft = leftUsersInConversation.length > 0
                                                const isSelected = currentConversationId === conv.conversationId
                                                const createdAtFormatted = formatRelative(new Date(conv.createdAt), new Date(), {
                                                    locale: enGB,
                                                })

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
                                                                    {typingUser === conversationTitle ? (
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
                                                                {unreadCounts[conv.conversationId] > 0 && (
                                                                    <Badge
                                                                        variant="destructive"
                                                                        className="ml-1 h-6 w-6 flex items-center justify-center p-0 rounded-full animate-pulse"
                                                                    >
                                                                        {unreadCounts[conv.conversationId]}
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

                            {activeTab === "archived" && (
                                <ScrollArea className="h-full">
                                    {filteredArchivedConversations.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <Archive className="mx-auto h-8 w-8 mb-2 opacity-50" />
                                            <p>No archived chats</p>
                                        </div>
                                    ) : (
                                        <ul className="divide-y divide-border">
                                            {filteredArchivedConversations.map((conv) => {
                                                const otherParticipants = conv.participants.filter((p) => p !== username)
                                                const conversationTitle = otherParticipants.join(", ")
                                                const isSelected = selectedLeavedConversation === conv.conversationId
                                                const createdAtFormatted = formatRelative(new Date(conv.createdAt), new Date(), {
                                                    locale: enGB,
                                                })

                                                return (
                                                    <li
                                                        key={conv.conversationId}
                                                        onClick={() => handleLeavedConversationSelect(conv.conversationId)}
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

                            {activeTab === "users" && (
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
                        {currentConversationId && (
                            <>
                                <div className="bg-primary/10 p-3 flex items-center">
                                    <Button variant="ghost" size="icon" className="mr-1" onClick={() => setShowMobileChat(false)}>
                                        <ArrowLeft className="h-5 w-5" />
                                    </Button>

                                    {conversations.map((conv) => {
                                        if (conv.conversationId === currentConversationId) {
                                            const otherParticipants = conv.participants.filter((p) => p !== username)
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
                                                        {typingUser && (
                                                            <p className="text-xs text-primary animate-pulse truncate flex items-center">
                                                                <span>{typingUser} is typing</span>
                                                                <span className="ml-1 inline-flex">
                                                                    <span className="animate-bounce mx-0.5">.</span>
                                                                    <span className="animate-bounce animation-delay-200 mx-0.5">.</span>
                                                                    <span className="animate-bounce animation-delay-400 mx-0.5">.</span>
                                                                </span>
                                                            </p>
                                                        )}
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
                                        {messages.length === 0 ? (
                                            <div className="h-full flex items-center justify-center text-center p-4">
                                                <div className="text-muted-foreground">
                                                    <MessageSquare className="mx-auto h-12 w-12 mb-4 opacity-30" />
                                                    <p className="text-lg font-medium">No messages yet</p>
                                                    <p className="text-sm">Start the conversation by sending a message below</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {messages.map((msg, index) => {
                                                    const isFirstInGroup =
                                                        index === 0 || messages[index - 1].senderUsername !== msg.senderUsername
                                                    const isLastInGroup =
                                                        index === messages.length - 1 || messages[index + 1].senderUsername !== msg.senderUsername

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
                                            value={message}
                                            onChange={(e) => {
                                                setMessage(e.target.value)
                                                handleTyping()
                                            }}
                                            onBlur={handleStoppedTyping}
                                            onKeyDown={handleKeyPress}
                                            className="flex-1 bg-muted/50"
                                        />
                                        <Button
                                            onClick={handleSendMessage}
                                            disabled={!isConnected || !message.trim()}
                                            size="icon"
                                            className="bg-primary text-primary-foreground rounded-full h-10 w-10"
                                        >
                                            {message.trim() ? <Send className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                                        </Button>
                                    </div>
                                </div>
                            </>
                        )}

                        {selectedLeavedConversation && (
                            <>
                                <div className="bg-primary/10 p-3 flex items-center">
                                    <Button variant="ghost" size="icon" className="mr-1" onClick={() => setShowMobileChat(false)}>
                                        <ArrowLeft className="h-5 w-5" />
                                    </Button>

                                    {leavedConversations.map((conv) => {
                                        if (conv.conversationId === selectedLeavedConversation) {
                                            const otherParticipants = conv.participants.filter((p) => p !== username)
                                            const conversationTitle = otherParticipants.join(", ")
                                            return (
                                                <div key={conv.conversationId} className="flex items-center flex-1">
                                                    <Avatar className="h-8 w-8 mr-2">
                                                        <AvatarFallback className={`${getAvatarColor(conversationTitle)} opacity-50`}>
                                                            {getInitials(conversationTitle)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <h2 className="text-base font-medium text-muted-foreground italic truncate">
                                                            {conversationTitle}
                                                            <Badge variant="outline" className="ml-2 text-xs">
                                                                Archived
                                                            </Badge>
                                                        </h2>
                                                    </div>
                                                </div>
                                            )
                                        }
                                        return null
                                    })}
                                </div>

                                <div className="flex-1 overflow-hidden bg-gradient-to-b from-muted/30 to-background">
                                    <ScrollArea className="h-full p-3 bg-muted/20">
                                        {leavedConversations.find((conv) => conv.conversationId === selectedLeavedConversation)
                                            ?.lastMessages.length === 0 ? (
                                            <div className="h-full flex items-center justify-center text-center p-4">
                                                <div className="text-muted-foreground">
                                                    <AlertCircle className="mx-auto h-12 w-12 mb-4 opacity-30" />
                                                    <p className="text-lg font-medium">No messages available</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {leavedConversations
                                                    .find((conv) => conv.conversationId === selectedLeavedConversation)
                                                    ?.lastMessages.map((msg, index) => {
                                                        const messages =
                                                            leavedConversations.find((conv) => conv.conversationId === selectedLeavedConversation)
                                                                ?.lastMessages || []
                                                        const isFirstInGroup =
                                                            index === 0 || messages[index - 1].senderUsername !== msg.senderUsername
                                                        const isLastInGroup =
                                                            index === messages.length - 1 || messages[index + 1].senderUsername !== msg.senderUsername

                                                        return (
                                                            <div key={index} className={`flex ${msg.isOwnMessage ? "justify-end" : "justify-start"}`}>
                                                                <div
                                                                    className={cn(
                                                                        "px-3 py-2 max-w-[80%] break-words",
                                                                        msg.isOwnMessage
                                                                            ? "bg-primary/70 text-primary-foreground rounded-tl-lg rounded-bl-lg rounded-tr-lg"
                                                                            : "bg-muted/70 rounded-tr-lg rounded-br-lg rounded-bl-lg",
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

                                <div className="p-4 bg-card border-t">
                                    <Button onClick={() => setShowMobileChat(false)} variant="outline" className="w-full">
                                        Return to Active Conversations
                                    </Button>
                                </div>
                            </>
                        )}

                        {!currentConversationId && !selectedLeavedConversation && (
                            <div className="h-full flex items-center justify-center text-center p-8 bg-gradient-to-b from-muted/30 to-background">
                                <div className="max-w-md">
                                    <div className="relative mb-8">
                                        <div className="absolute -inset-1 bg-gradient-to-r from-red-500 to-orange-500 rounded-full blur opacity-30 animate-pulse"></div>
                                        <Flame className="relative mx-auto h-20 w-20 text-destructive animate-bounce-slow" />
                                    </div>
                                    <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-red-500 to-orange-500 text-transparent bg-clip-text">
                                        Welcome to Ephemeral Chat
                                    </h3>
                                    <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
                                        Your messages disappear forever when you leave. Start a conversation from the sidebar or find
                                        someone new.
                                    </p>
                                    <Button
                                        onClick={() => setActiveTab("users")}
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
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 bg-muted/50"
                            />
                            {searchQuery && (
                                <button
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                                    onClick={() => setSearchQuery("")}
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
                                    count: Object.values(unreadCounts).reduce((a, b) => a + b, 0),
                                    variant: "destructive",
                                },
                                {
                                    id: "archived",
                                    label: "Archived",
                                    icon: <Archive className="h-4 w-4" />,
                                    count: leavedConversations.length,
                                    variant: "secondary",
                                },
                                {
                                    id: "users",
                                    label: "Users",
                                    icon: <Users className="h-4 w-4" />,
                                    count: activeUsers.filter((user) => user.username !== username).length,
                                    variant: "secondary",
                                },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex-1 flex flex-col items-center justify-center py-2 relative transition-colors duration-200 ${activeTab === tab.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
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
                                    {activeTab === tab.id && (
                                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary transition-transform duration-200 ease-out" />
                                    )}
                                </button>
                            ))}
                        </nav>
                    </div>

                    <div className="flex-1 overflow-hidden">
                        {activeTab === "conversations" && (
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
                                            const leftUsersInConversation = leftUsers[conv.conversationId] || []
                                            const otherParticipants = conv.participants.filter((p) => p !== username)
                                            const conversationTitle = otherParticipants.join(", ")
                                            const isUserLeft = leftUsersInConversation.length > 0
                                            const isSelected = currentConversationId === conv.conversationId
                                            const createdAtFormatted = formatRelative(new Date(conv.createdAt), new Date(), {
                                                locale: enGB,
                                            })

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
                                                                {typingUser === conversationTitle ? (
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
                                                            {unreadCounts[conv.conversationId] > 0 && (
                                                                <Badge
                                                                    variant="destructive"
                                                                    className="ml-1 h-6 w-6 flex items-center justify-center p-0 rounded-full animate-pulse"
                                                                >
                                                                    {unreadCounts[conv.conversationId]}
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

                        {activeTab === "archived" && (
                            <ScrollArea className="h-full">
                                {filteredArchivedConversations.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Archive className="mx-auto h-8 w-8 mb-2 opacity-50" />
                                        <p>No archived chats</p>
                                    </div>
                                ) : (
                                    <ul className="divide-y divide-border">
                                        {filteredArchivedConversations.map((conv) => {
                                            const otherParticipants = conv.participants.filter((p) => p !== username)
                                            const conversationTitle = otherParticipants.join(", ")
                                            const isSelected = selectedLeavedConversation === conv.conversationId
                                            const createdAtFormatted = formatRelative(new Date(conv.createdAt), new Date(), {
                                                locale: enGB,
                                            })

                                            return (
                                                <li
                                                    key={conv.conversationId}
                                                    onClick={() => handleLeavedConversationSelect(conv.conversationId)}
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

                        {activeTab === "users" && (
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
                                <AvatarFallback className={getAvatarColor(username)}>{getInitials(username)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <div className="font-medium">{username}</div>
                                <div className="text-xs text-muted-foreground">Online</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main chat area */}
                <div className="w-2/3 flex flex-col">
                    {currentConversationId && (
                        <>
                            <div className="bg-primary/10 p-3 flex items-center justify-between border-b border-border">
                                {conversations.map((conv) => {
                                    if (conv.conversationId === currentConversationId) {
                                        const otherParticipants = conv.participants.filter((p) => p !== username)
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
                                                    {typingUser && (
                                                        <p className="text-xs text-primary animate-pulse flex items-center">
                                                            <span>{typingUser} is typing</span>
                                                            <span className="ml-1 inline-flex">
                                                                <span className="animate-bounce mx-0.5">.</span>
                                                                <span className="animate-bounce animation-delay-200 mx-0.5">.</span>
                                                                <span className="animate-bounce animation-delay-400 mx-0.5">.</span>
                                                            </span>
                                                        </p>
                                                    )}
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
                                <ScrollArea className="h-full p-4" ref={messageContainerRef}>
                                    {messages.length === 0 ? (
                                        <div className="h-full flex items-center justify-center text-center p-4">
                                            <div className="text-muted-foreground">
                                                <MessageSquare className="mx-auto h-12 w-12 mb-4 opacity-30" />
                                                <p className="text-lg font-medium">No messages yet</p>
                                                <p className="text-sm">Start the conversation by sending a message below</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {messages.map((msg, index) => {
                                                const isFirstInGroup = index === 0 || messages[index - 1].senderUsername !== msg.senderUsername
                                                const isLastInGroup =
                                                    index === messages.length - 1 || messages[index + 1].senderUsername !== msg.senderUsername

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
                                        value={message}
                                        onChange={(e) => {
                                            setMessage(e.target.value)
                                            handleTyping()
                                        }}
                                        onBlur={handleStoppedTyping}
                                        onKeyDown={handleKeyPress}
                                        className="flex-1 bg-muted/50"
                                    />
                                    <Button
                                        onClick={handleSendMessage}
                                        disabled={!isConnected || !message.trim()}
                                        size="icon"
                                        className="bg-primary text-primary-foreground rounded-full h-10 w-10"
                                    >
                                        {message.trim() ? <Send className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}

                    {selectedLeavedConversation && (
                        <>
                            <div className="bg-primary/10 p-3 flex items-center justify-between border-b border-border">
                                {leavedConversations.map((conv) => {
                                    if (conv.conversationId === selectedLeavedConversation) {
                                        const otherParticipants = conv.participants.filter((p) => p !== username)
                                        const conversationTitle = otherParticipants.join(", ")
                                        return (
                                            <div key={conv.conversationId} className="flex items-center flex-1">
                                                <Avatar className="h-8 w-8 mr-2">
                                                    <AvatarFallback className={`${getAvatarColor(conversationTitle)} opacity-50`}>
                                                        {getInitials(conversationTitle)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <h2 className="text-base font-medium text-muted-foreground italic">
                                                        {conversationTitle}
                                                        <Badge variant="outline" className="ml-2 text-xs">
                                                            Archived
                                                        </Badge>
                                                    </h2>
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
                                <ScrollArea className="h-full p-4 bg-muted/20">
                                    {leavedConversations.find((conv) => conv.conversationId === selectedLeavedConversation)?.lastMessages
                                        .length === 0 ? (
                                        <div className="h-full flex items-center justify-center text-center p-4">
                                            <div className="text-muted-foreground">
                                                <AlertCircle className="mx-auto h-12 w-12 mb-4 opacity-30" />
                                                <p className="text-lg font-medium">No messages available</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {leavedConversations
                                                .find((conv) => conv.conversationId === selectedLeavedConversation)
                                                ?.lastMessages.map((msg, index) => {
                                                    const messages =
                                                        leavedConversations.find((conv) => conv.conversationId === selectedLeavedConversation)
                                                            ?.lastMessages || []
                                                    const isFirstInGroup =
                                                        index === 0 || messages[index - 1].senderUsername !== msg.senderUsername
                                                    const isLastInGroup =
                                                        index === messages.length - 1 || messages[index + 1].senderUsername !== msg.senderUsername

                                                    return (
                                                        <div key={index} className={`flex ${msg.isOwnMessage ? "justify-end" : "justify-start"}`}>
                                                            <div
                                                                className={cn(
                                                                    "px-3 py-2 max-w-[80%] break-words",
                                                                    msg.isOwnMessage
                                                                        ? "bg-primary/70 text-primary-foreground rounded-tl-lg rounded-bl-lg rounded-tr-lg"
                                                                        : "bg-muted/70 rounded-tr-lg rounded-br-lg rounded-bl-lg",
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

                            <div className="p-4 bg-card border-t">
                                <Button onClick={() => setSelectedLeavedConversation(null)} variant="outline" className="w-full">
                                    Return to Active Conversations
                                </Button>
                            </div>
                        </>
                    )}

                    {!currentConversationId && !selectedLeavedConversation && (
                        <div className="h-full flex items-center justify-center text-center p-8 bg-gradient-to-b from-muted/30 to-background">
                            <div className="max-w-md">
                                <div className="relative mb-8">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-red-500 to-orange-500 rounded-full blur opacity-30 animate-pulse"></div>
                                    <Flame className="relative mx-auto h-20 w-20 text-destructive animate-bounce-slow" />
                                </div>
                                <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-red-500 to-orange-500 text-transparent bg-clip-text">
                                    Welcome to Ephemeral Chat
                                </h3>
                                <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
                                    Your messages disappear forever when you leave. Select a conversation from the sidebar or start a new
                                    chat.
                                </p>
                                <Button
                                    onClick={() => setActiveTab("users")}
                                    className="mx-auto bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 transition-all duration-300 shadow-md hover:shadow-lg"
                                >
                                    <Users className="mr-2 h-4 w-4" />
                                    Find Someone to Chat With
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

