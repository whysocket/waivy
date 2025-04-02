"use client"
import { ScrollArea } from "@/components/ui/scroll-area"
import { X } from "lucide-react"
import { useConnection } from "@/context/connection-context"
import { useEffect, useRef } from "react"

// Update the MessageListProps interface to remove username and add messagesEndRef internally
interface MessageListProps {
    selectedRecipient: string | null
}

export default function MessageList({ selectedRecipient }: MessageListProps) {
    const { messages } = useConnection()
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Add useEffect to scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }

    // Filter messages based on the selected recipient
    const filteredMessages = messages.filter(
        (msg) => !selectedRecipient || msg.sender === selectedRecipient || (msg.isOwnMessage && selectedRecipient),
    )

    return (
        <ScrollArea className="h-[calc(100vh-300px)] p-4">
            {filteredMessages.length > 0 ? (
                <div className="space-y-4">
                    {filteredMessages.map((message) => (
                        <div key={message.id} className={`flex ${message.isOwnMessage ? "justify-end" : "justify-start"}`}>
                            <div className="flex flex-col max-w-[80%]">
                                <div
                                    className={`p-3 rounded-lg ${message.isOwnMessage
                                            ? "bg-primary text-primary-foreground rounded-br-none"
                                            : "bg-muted rounded-bl-none"
                                        }`}
                                >
                                    {message.text}
                                </div>
                                <div className="flex items-center justify-end mt-1 px-1">
                                    <span className="text-xs text-muted-foreground">{formatTime(message.timestamp)}</span>
                                    {message.isOwnMessage && message.status && (
                                        <span className="ml-2">
                                            {message.status === "sending" && (
                                                <span className="text-xs text-muted-foreground">Sending...</span>
                                            )}
                                            {message.status === "sent" && <span className="text-xs text-green-500">✓</span>}
                                            {message.status === "failed" && (
                                                <span className="text-xs text-red-500 flex items-center gap-1">
                                                    <X size={12} />
                                                    Failed
                                                </span>
                                            )}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                    {selectedRecipient ? "No messages yet. Start the conversation!" : "Select a user to start chatting"}
                </div>
            )}
        </ScrollArea>
    )
}

