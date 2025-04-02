export interface ConnectionEvent {
    text: string
    username?: string
    connectionId?: string
    timestamp: Date
}

export interface Message {
    sender: string
    text: string
    id: string
    isOwnMessage: boolean
    timestamp: Date
    status?: "sending" | "sent" | "failed"
}

export interface ActiveUser {
    username: string
    connectionIds: string[]
}

