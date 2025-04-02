"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import * as signalR from "@microsoft/signalr"
import { toast } from "sonner"
import type { ActiveUser, ConnectionEvent, Message } from "@/types/chat"

interface ConnectionContextType {
    connection: signalR.HubConnection | null
    connectionState: string
    activeUsers: ActiveUser[]
    messages: Message[]
    connectionEvents: ConnectionEvent[]
    addMessage: (message: Message) => void
    updateMessageStatus: (messageId: string, status: "sending" | "sent" | "failed") => void
}

const ConnectionContext = createContext<ConnectionContextType>({
    connection: null,
    connectionState: "Disconnected",
    activeUsers: [],
    messages: [],
    connectionEvents: [],
    addMessage: () => { },
    updateMessageStatus: () => { },
})

export const useConnection = () => useContext(ConnectionContext)

interface ConnectionProviderProps {
    children: React.ReactNode
    serverUrl: string
    username: string
    onConnecting: (isConnecting: boolean) => void
    onConnectionError: (error: string | null) => void
    onConnected: () => void
}

export const ConnectionProvider: React.FC<ConnectionProviderProps> = ({
    children,
    serverUrl,
    username,
    onConnecting,
    onConnectionError,
    onConnected,
}) => {
    const [connection, setConnection] = useState<signalR.HubConnection | null>(null)
    const [connectionState, setConnectionState] = useState<string>("Disconnected")
    const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([])
    const [messages, setMessages] = useState<Message[]>([])
    const [connectionEvents, setConnectionEvents] = useState<ConnectionEvent[]>([])

    const addMessage = useCallback((message: Message) => {
        setMessages((prev) => [...prev, message])
    }, [])

    const updateMessageStatus = useCallback((messageId: string, status: "sending" | "sent" | "failed") => {
        setMessages((prevMessages) => prevMessages.map((msg) => (msg.id === messageId ? { ...msg, status } : msg)))
    }, [])

    // Check if the server is reachable
    const checkServerReachable = useCallback(async (url: string): Promise<boolean> => {
        try {
            // Try to fetch the server's negotiation endpoint
            const negotiateUrl = `${url}/negotiate`
            const response = await fetch(negotiateUrl, {
                method: "OPTIONS",
                headers: {
                    Accept: "application/json",
                },
                mode: "cors",
            })

            return response.ok
        } catch (error) {
            console.error("Server reachability check failed:", error)
            return false
        }
    }, [])

    useEffect(() => {
        let newConnection: signalR.HubConnection | null = null

        const startConnection = async () => {
            onConnecting(true)
            setConnectionState("Connecting")

            try {
                // First check if the server is reachable
                const isReachable = await checkServerReachable(serverUrl)

                if (!isReachable) {
                    throw new Error("Server is not reachable. Please check if it's running.")
                }

                // Configure the connection
                newConnection = new signalR.HubConnectionBuilder()
                    .withUrl(serverUrl, {
                        skipNegotiation: false,
                        transport: signalR.HttpTransportType.WebSockets,
                        logger: signalR.LogLevel.Information,
                    })
                    .withAutomaticReconnect([0, 2000, 5000, 10000, 15000, 30000])
                    .build()

                // Set up connection state handlers
                newConnection.onreconnecting((error) => {
                    console.warn("Connection lost, reconnecting...", error)
                    setConnectionState("Reconnecting")
                    toast.error("Connection lost", {
                        description: "Attempting to reconnect to the chat server...",
                    })
                })

                newConnection.onreconnected((connectionId) => {
                    console.log("Reconnected with ID:", connectionId)
                    setConnectionState("Connected")
                    toast.success("Reconnected", {
                        description: "Successfully reconnected to the chat server.",
                    })

                    // Re-fetch active users after reconnection
                    if (username) {
                        newConnection
                            ?.invoke("SetUsername", username)
                            .catch((err) => console.error("Error re-setting username after reconnection:", err))

                        newConnection
                            ?.invoke<ActiveUser[]>("GetActiveUsers")
                            .then((users) => setActiveUsers(users))
                            .catch((error) => console.error("Error getting active users after reconnection:", error))
                    }
                })

                newConnection.onclose((error) => {
                    console.error("Connection closed", error)
                    setConnectionState("Disconnected")
                    toast.error("Connection closed", {
                        description: "The connection to the chat server was closed.",
                    })
                    onConnecting(false)
                })

                // Set up event handlers
                setupEventHandlers(newConnection)

                // Start the connection
                await newConnection.start()
                console.log("SignalR Connected!")
                setConnection(newConnection)
                setConnectionState("Connected")
                onConnecting(false)
                onConnectionError(null)
                onConnected()

                // Get active users
                try {
                    const users = await newConnection.invoke<ActiveUser[]>("GetActiveUsers")
                    setActiveUsers(users)
                } catch (error) {
                    console.error("Error getting active users:", error)
                    toast.warning("Warning", {
                        description: "Connected to chat server, but failed to get active users.",
                    })
                }
            } catch (err) {
                console.error("SignalR Connection Error:", err)
                setConnectionState("Error")
                onConnecting(false)

                // Provide more specific error messages based on the error type
                let errorMessage = "Failed to connect to the chat server."

                if (err instanceof Error) {
                    if (err.message.includes("Server is not reachable")) {
                        errorMessage = err.message
                    } else if (err.message.includes("Failed to fetch") || err.message.includes("negotiation")) {
                        errorMessage = "Cannot reach the chat server. Please check if the server is running and accessible."
                    } else if (err.message.includes("CORS")) {
                        errorMessage = "Cross-Origin Request Blocked. The server may not allow connections from this origin."
                    }
                }

                onConnectionError(errorMessage)
            }
        }

        const setupEventHandlers = (conn: signalR.HubConnection) => {
            conn.on("UserConnected", (data: { username: string; connectionId: string }) => {
                setConnectionEvents((prevEvents) => [
                    ...prevEvents,
                    {
                        text: `User connected: ${data.username}`,
                        username: data.username,
                        connectionId: data.connectionId,
                        timestamp: new Date(),
                    },
                ])

                setActiveUsers((prevUsers) => {
                    // Check if user already exists
                    const existingUserIndex = prevUsers.findIndex((u) => u.username === data.username)

                    if (existingUserIndex >= 0) {
                        // Add connection ID if it doesn't exist
                        const updatedUsers = [...prevUsers]
                        if (!updatedUsers[existingUserIndex].connectionIds.includes(data.connectionId)) {
                            updatedUsers[existingUserIndex].connectionIds.push(data.connectionId)
                        }
                        return updatedUsers
                    } else {
                        // Add new user
                        return [
                            ...prevUsers,
                            {
                                username: data.username,
                                connectionIds: [data.connectionId],
                            },
                        ]
                    }
                })
            })

            conn.on("UserDisconnected", (username: string) => {
                setConnectionEvents((prevEvents) => [
                    ...prevEvents,
                    {
                        text: `User disconnected: ${username}`,
                        username: username,
                        timestamp: new Date(),
                    },
                ])

                setActiveUsers((prevUsers) => prevUsers.filter((user) => user.username !== username))
            })

            conn.on("UserDeviceDisconnected", (username: string, connectionId: string) => {
                setConnectionEvents((prevEvents) => [
                    ...prevEvents,
                    {
                        text: `User device disconnected: ${username} (${connectionId})`,
                        username: username,
                        connectionId: connectionId,
                        timestamp: new Date(),
                    },
                ])

                setActiveUsers((prevUsers) => {
                    return prevUsers.map((user) => {
                        if (user.username === username) {
                            return {
                                ...user,
                                connectionIds: user.connectionIds.filter((id) => id !== connectionId),
                            }
                        }
                        return user
                    })
                })
            })

            conn.on("ReceiveMessage", (sender: string, message: string) => {
                const newMessage: Message = {
                    sender: sender,
                    text: message,
                    id: `${Date.now()}`,
                    isOwnMessage: sender === username,
                    timestamp: new Date(),
                }

                // If this is a response to a message we sent, update the status
                if (sender === username) {
                    // Find the most recent "sending" message and mark it as "sent
                    setMessages((prevMessages) => {
                        const updatedMessages = [...prevMessages]
                        const sendingMessageIndex = updatedMessages
                            .filter((m) => m.status === "sending")
                            .findIndex((m) => m.text === message)

                        if (sendingMessageIndex !== -1) {
                            updatedMessages[sendingMessageIndex].status = "sent"
                        }

                        return updatedMessages
                    })
                } else {
                    addMessage(newMessage)
                }
            })

            conn.on("ErrorMessage", (errorMessage: string) => {
                toast.error("Error", {
                    description: errorMessage,
                })
            })
        }

        startConnection()

        return () => {
            if (newConnection && newConnection.state === signalR.HubConnectionState.Connected) {
                newConnection.stop().catch((err) => console.error("Error stopping connection:", err))
            }
        }
    }, [serverUrl, username, onConnecting, onConnectionError, onConnected, checkServerReachable])

    const value = {
        connection,
        connectionState,
        activeUsers,
        messages,
        connectionEvents,
        addMessage,
        updateMessageStatus,
    }

    return <ConnectionContext.Provider value={value}>{children}</ConnectionContext.Provider>
}

