"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Users } from "lucide-react"
import { useConnection } from "@/context/connection-context"
import UsersList from "@/components/users-list"
import MessageList from "@/components/message-list"
import MessageInput from "@/components/message-input"
import ConnectionEvents from "@/components/connection-events"

interface ChatInterfaceProps {
    username: string
}

export default function ChatInterface({ username }: ChatInterfaceProps) {
    const { activeUsers, connectionEvents, connectionState } = useConnection()
    const [selectedRecipient, setSelectedRecipient] = useState<string | null>(null)

    // Clear selected recipient if they disconnect
    useEffect(() => {
        if (selectedRecipient && !activeUsers.some((user) => user.username === selectedRecipient)) {
            setSelectedRecipient(null)
        }
    }, [activeUsers, selectedRecipient])

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-grow">
            <div className="md:col-span-1">
                <Card className="h-full">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users size={18} />
                            Active Users
                        </CardTitle>
                        <CardDescription>
                            {activeUsers.length} user{activeUsers.length !== 1 ? "s" : ""} online
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[calc(100vh-250px)]">
                            <UsersList
                                users={activeUsers}
                                currentUsername={username}
                                selectedUser={selectedRecipient}
                                onSelectUser={setSelectedRecipient}
                            />
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>

            <div className="md:col-span-2">
                <Tabs defaultValue="chat" className="h-full flex flex-col">
                    <TabsList className="mb-2">
                        <TabsTrigger value="chat">Chat</TabsTrigger>
                        <TabsTrigger value="events">Connection Events</TabsTrigger>
                    </TabsList>

                    <Card className="flex-grow">
                        <TabsContent value="chat" className="h-full flex flex-col m-0 p-0">
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center justify-between">
                                    <span>
                                        {selectedRecipient ? (
                                            <>Chatting with: {selectedRecipient === username ? "You" : selectedRecipient}</>
                                        ) : (
                                            <>Select a user to start chatting</>
                                        )}
                                    </span>
                                    <Badge variant="outline">{connectionState}</Badge>
                                </CardTitle>
                            </CardHeader>
                            <Separator />
                            <CardContent className="flex-grow p-0">
                                <MessageList selectedRecipient={selectedRecipient} />
                            </CardContent>
                            <div className="p-4 border-t">
                                <MessageInput username={username} selectedRecipient={selectedRecipient} />
                            </div>
                        </TabsContent>

                        <TabsContent value="events" className="h-full m-0 p-0">
                            <CardHeader>
                                <CardTitle>Connection Events</CardTitle>
                                <CardDescription>History of user connections and disconnections</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ConnectionEvents events={connectionEvents} />
                            </CardContent>
                        </TabsContent>
                    </Card>
                </Tabs>
            </div>
        </div>
    )
}

