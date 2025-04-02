"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import * as signalR from "@microsoft/signalr";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Users } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface ConnectionEvent {
  text: string;
  id: string;
  timestamp: Date;
}

interface Message {
  sender: string;
  text: string;
  id: string;
  isOwnMessage: boolean;
  timestamp: Date;
}

interface User {
  connectionId: string;
  username: string;
}

export default function Home() {
  const [connectionEvents, setConnectionEvents] = useState<ConnectionEvent[]>(
    []
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState<string>("");
  const [connection, setConnection] = useState<signalR.HubConnection | null>(
    null
  );
  const [selectedRecipient, setSelectedRecipient] = useState<string | null>(
    null
  );
  const [currentConnectionId, setCurrentConnectionId] = useState<string | null>(
    null
  );
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [username, setUsername] = useState<string>("");
  const [usernameSet, setUsernameSet] = useState<boolean>(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (usernameSet && username && currentConnectionId && connection) {
      connection
        .invoke("SetUsername", currentConnectionId, username)
        .catch((err) => console.error("Error setting username:", err));
    }
  }, [usernameSet, username, currentConnectionId, connection]);

  useEffect(() => {
    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl("http://localhost:5184/chat")
      .withAutomaticReconnect()
      .build();

    newConnection.on("UserConnected", (user: User) => {
      setConnectionEvents((prevEvents) => [
        ...prevEvents,
        {
          text: `User connected: ${user.username}`,
          id: user.connectionId,
          timestamp: new Date(),
        },
      ]);
      setActiveUsers((prevUsers) => {
        if (!prevUsers.some((u) => u.connectionId === user.connectionId)) {
          return [...prevUsers, user];
        }
        return prevUsers;
      });
    });

    newConnection.on("UserDisconnected", (connectionId: string) => {
      setConnectionEvents((prevEvents) => [
        ...prevEvents,
        {
          text: `User disconnected: ${connectionId}`,
          id: connectionId,
          timestamp: new Date(),
        },
      ]);
      setActiveUsers((prevUsers) =>
        prevUsers.filter((user) => user.connectionId !== connectionId)
      );
    });

    newConnection.on("ReceiveMessage", (sender: string, message: string) => {
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          sender: sender,
          text: message,
          id: `${Date.now()}`,
          isOwnMessage: sender === currentConnectionId,
          timestamp: new Date(),
        },
      ]);
    });

    newConnection
      .start()
      .then(() => {
        console.log("SignalR Connected!");
        setConnection(newConnection);
        setCurrentConnectionId(newConnection.connectionId);
        newConnection
          .invoke("GetActiveUsers")
          .then((users: User[]) => {
            setActiveUsers(users);
          })
          .catch((error) =>
            console.error("Error getting active users:", error)
          );
      })
      .catch((err) => console.error("SignalR Connection Error: ", err));

    return () => {
      if (
        newConnection &&
        newConnection.state === signalR.HubConnectionState.Connected
      ) {
        newConnection.stop();
      }
    };
  }, []);

  const sendMessage = () => {
    if (
      connection &&
      messageInput &&
      selectedRecipient &&
      currentConnectionId
    ) {
      if (selectedRecipient === currentConnectionId) {
        alert("You cannot send messages to yourself.");
        return;
      }

      setMessages((prevMessages) => [
        ...prevMessages,
        {
          sender: currentConnectionId,
          text: messageInput,
          id: `sent-${Date.now()}`,
          isOwnMessage: true,
          timestamp: new Date(),
        },
      ]);

      connection
        .invoke("SendMessage", selectedRecipient, messageInput)
        .catch((err) => console.error("Error sending message: ", err));

      setMessageInput("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getInitials = (userId: string) => {
    const user = activeUsers.find((u) => u.connectionId === userId);
    if (user && user.username) {
      return user.username.substring(0, 2).toUpperCase();
    }
    return userId.substring(0, 2).toUpperCase();
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="p-4 flex flex-col h-screen max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">SignalR Chat Application</h1>

      {!usernameSet ? (
        <Dialog open={!usernameSet}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set your username</DialogTitle>
              <DialogDescription>
                Choose a username to join the chat.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="username" className="text-right">
                  Username
                </Label>
                <Input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="col-span-3"
                />
              </div>
            </div>
            <Button onClick={() => setUsernameSet(true)} disabled={!username}>
              Continue
            </Button>
          </DialogContent>
        </Dialog>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-grow">
          <div className="md:col-span-1">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users size={18} />
                  Active Users
                </CardTitle>
                <CardDescription>
                  {activeUsers.length} user{activeUsers.length !== 1 ? "s" : ""}{" "}
                  online
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[calc(100vh-250px)]">
                  <div className="space-y-2">
                    {activeUsers.map((user) => (
                      <div
                        key={user.connectionId}
                        className={`flex items-center p-2 rounded-lg cursor-pointer transition-colors ${
                          selectedRecipient === user.connectionId
                            ? "bg-primary/10"
                            : "hover:bg-muted"
                        }`}
                        onClick={() =>
                          user.connectionId !== currentConnectionId &&
                          setSelectedRecipient(user.connectionId)
                        }
                      >
                        <Avatar className="h-8 w-8 mr-2">
                          <AvatarFallback
                            className={
                              user.connectionId === currentConnectionId
                                ? "bg-primary"
                                : "bg-muted-foreground"
                            }
                          >
                            {getInitials(user.connectionId)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 truncate">
                          {user.connectionId === currentConnectionId
                            ? "You"
                            : user.username}
                        </div>
                        <Badge variant="outline" className="ml-auto">
                          {user.connectionId === currentConnectionId
                            ? "You"
                            : "Online"}
                        </Badge>
                      </div>
                    ))}
                  </div>
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
                <TabsContent
                  value="chat"
                  className="h-full flex flex-col m-0 p-0"
                >
                  <CardHeader className="pb-2">
                    <CardTitle>
                      {selectedRecipient ? (
                        <>
                          Chatting with:{" "}
                          {activeUsers.find(
                            (user) => user.connectionId === selectedRecipient
                          )?.username ||
                          selectedRecipient === currentConnectionId
                            ? "You"
                            : selectedRecipient}
                        </>
                      ) : (
                        <>Select a user to start chatting</>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <Separator />
                  <CardContent className="flex-grow p-0">
                    <ScrollArea className="h-[calc(100vh-300px)] p-4">
                      {messages.length > 0 ? (
                        <div className="space-y-4">
                          {messages
                            .filter(
                              (msg) =>
                                !selectedRecipient ||
                                msg.sender === selectedRecipient ||
                                (msg.isOwnMessage &&
                                  msg.sender === currentConnectionId)
                            )
                            .map((message) => (
                              <div
                                key={message.id}
                                className={`flex ${
                                  message.isOwnMessage
                                    ? "justify-end"
                                    : "justify-start"
                                }`}
                              >
                                <div className="flex flex-col max-w-[80%]">
                                  <div
                                    className={`p-3 rounded-lg ${
                                      message.isOwnMessage
                                        ? "bg-primary text-primary-foreground rounded-br-none"
                                        : "bg-muted rounded-bl-none"
                                    }`}
                                  >
                                    {message.text}
                                  </div>
                                  <span className="text-xs text-muted-foreground mt-1 px-1">
                                    {formatTime(message.timestamp)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          <div ref={messagesEndRef} />
                        </div>
                      ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground">
                          {selectedRecipient
                            ? "No messages yet. Start the conversation!"
                            : "Select a user to start chatting"}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                  <div className="p-4 border-t">
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder={
                          selectedRecipient
                            ? "Type your message..."
                            : "Select a recipient first"
                        }
                        disabled={
                          !selectedRecipient ||
                          selectedRecipient === currentConnectionId
                        }
                      />
                      <Button
                        onClick={sendMessage}
                        disabled={
                          !selectedRecipient ||
                          !messageInput ||
                          selectedRecipient === currentConnectionId
                        }
                      >
                        <Send size={18} />
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="events" className="h-full m-0 p-0">
                  <CardHeader>
                    <CardTitle>Connection Events</CardTitle>
                    <CardDescription>
                      History of user connections and disconnections
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[calc(100vh-350px)]">
                      <ul className="space-y-2">
                        {connectionEvents.map((event, index) => (
                          <li
                            key={`${event.id}-${index}`}
                            className="flex items-center p-2 border-b"
                          >
                            <Badge
                              variant={
                                event.text.includes("connected")
                                  ? "outline"
                                  : "destructive"
                              }
                              className="mr-2"
                            >
                              {event.text.includes("connected")
                                ? "Connected"
                                : "Disconnected"}
                            </Badge>
                            <span className="flex-1">{event.text}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatTime(event.timestamp)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>
                  </CardContent>
                </TabsContent>
              </Card>
            </Tabs>
          </div>
        </div>
      )}
    </div>
  );
}
