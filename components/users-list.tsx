"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import type { ActiveUser } from "@/types/chat"

interface UsersListProps {
    users: ActiveUser[]
    currentUsername: string
    selectedUser: string | null
    onSelectUser: (username: string) => void
}

export default function UsersList({ users, currentUsername, selectedUser, onSelectUser }: UsersListProps) {
    const getInitials = (name: string) => {
        return name.substring(0, 2).toUpperCase()
    }

    return (
        <div className="space-y-2">
            {users.map((user) => (
                <div
                    key={user.username}
                    className={`flex items-center p-2 rounded-lg cursor-pointer transition-colors ${selectedUser === user.username ? "bg-primary/10" : "hover:bg-muted"
                        }`}
                    onClick={() => user.username !== currentUsername && onSelectUser(user.username)}
                >
                    <Avatar className="h-8 w-8 mr-2">
                        <AvatarFallback className={user.username === currentUsername ? "bg-primary" : "bg-muted-foreground"}>
                            {getInitials(user.username)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 truncate">
                        {user.username === currentUsername ? `${user.username} (You)` : user.username}
                    </div>
                    <Badge variant="outline" className="ml-auto">
                        {user.connectionIds.length > 1 ? `${user.connectionIds.length} devices` : "1 device"}
                    </Badge>
                </div>
            ))}
        </div>
    )
}

