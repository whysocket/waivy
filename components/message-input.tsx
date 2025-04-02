"use client"

import type React from "react"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Send } from "lucide-react"
import { toast } from "sonner"
import { useConnection } from "@/context/connection-context"

interface MessageInputProps {
    username: string
    selectedRecipient: string | null
}

export default function MessageInput({ username, selectedRecipient }: MessageInputProps) {
    const [messageInput, setMessageInput] = useState<string>("")
    const { connection, addMessage } = useConnection()

    const sendMessage = async () => {
        if (!connection || !messageInput || !selectedRecipient || !username) return

        if (selectedRecipient === username) {
            toast.error("Cannot send message", {
                description: "You cannot send messages to yourself.",
            })
            return
        }

        // Generate a unique ID for this message
        const messageId = `sent-${Date.now()}`

        // Add the sent message to the messages state immediately with a "sending" status
        addMessage({
            sender: username,
            text: messageInput,
            id: messageId,
            isOwnMessage: true,
            timestamp: new Date(),
            status: "sending",
        })

        // Clear the input field immediately for better UX
        const messageCopy = messageInput
        setMessageInput("")

        try {
            await connection.invoke("SendMessage", selectedRecipient, messageCopy)

            // Update the message status to "sent" (handled in the context)
        } catch (err) {
            console.error("Error sending message:", err)

            toast.error("Message not sent", {
                description: "Failed to send message.",
                action: {
                    label: "Retry",
                    onClick: () => {
                        // Retry sending this message
                        setMessageInput(messageCopy)
                    },
                },
            })
        }
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    return (
        <div className="flex gap-2">
            <Input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={selectedRecipient ? "Type your message..." : "Select a recipient first"}
                disabled={!selectedRecipient || selectedRecipient === username}
            />
            <Button onClick={sendMessage} disabled={!selectedRecipient || !messageInput || selectedRecipient === username}>
                <Send size={18} />
            </Button>
        </div>
    )
}

