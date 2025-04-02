"use client"

import { useEffect, useCallback } from "react"
import * as signalR from "@microsoft/signalr"
import { useChatContext } from "@/contexts/chat-context"

export function useChatConnection() {
  const { state, dispatch } = useChatContext()

  // Connect to SignalR hub
  const connectToHub = useCallback(async () => {
    try {
      const newConnection = new signalR.HubConnectionBuilder()
        .withUrl(process.env.NEXT_PUBLIC_CHAT_HUB_URL!)
        .withAutomaticReconnect()
        .build()

      dispatch({ type: "SET_CONNECTION", payload: newConnection })

      await newConnection.start()
      dispatch({ type: "SET_CONNECTED", payload: true })
      console.log("SignalR Connected!")

      return newConnection
    } catch (error) {
      console.error("Connection Error:", error)
      dispatch({ type: "SET_CONNECTED", payload: false })
      throw error
    }
  }, [dispatch])

  // Setup SignalR event handlers
  useEffect(() => {
    const connection = state.connection
    const username = state.username

    if (!connection || !username) return

    // Remove existing listeners to prevent duplicates
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
    connection.off("TriedToUse")

    // Set up event handlers
    connection.on("TriedToUse", (attemptedUsername: string) => {
      if (attemptedUsername === username) {
        dispatch({
          type: "SET_USERNAME_ERROR",
          payload: `Username "${attemptedUsername}" is already taken. Please choose another.`,
        })
      }
    })

    connection.on("ReceiveMessage", (newMessage: any) => {
      if (state.currentConversationId === newMessage.conversationId) {
        dispatch({
          type: "ADD_MESSAGE",
          payload: { ...newMessage, isOwnMessage: newMessage.senderUsername === username },
        })
      } else {
        // Update unread count
        const currentCount = state.unreadCounts[newMessage.conversationId] || 0
        dispatch({
          type: "UPDATE_UNREAD_COUNT",
          payload: { conversationId: newMessage.conversationId, count: currentCount + 1 },
        })
      }
    })

    connection.on("UserConnected", (user: any) => {
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
      dispatch({ type: "SET_TYPING_USER", payload: typingUsername })
    })

    connection.on("UserStoppedTyping", (_stoppedTypingUsername: string) => {
      dispatch({ type: "SET_TYPING_USER", payload: null })
    })

    connection.on("ConversationCreated", (newConversation: any) => {
      if (newConversation.participants.includes(username)) {
        dispatch({ type: "ADD_CONVERSATION", payload: newConversation })
      }
    })

    connection.on("MessageRead", (conversationId: string, messageId: string, readerUsername: string) => {
      if (conversationId === state.currentConversationId) {
        dispatch({
          type: "MARK_MESSAGE_AS_READ",
          payload: { messageId, username: readerUsername },
        })
      }
    })

    connection.on("UserLeftConversation", (conversationId: string, leavingUsername: string) => {
      // Update leftUsers state
      dispatch({
        type: "UPDATE_LEFT_USERS",
        payload: { conversationId, username: leavingUsername },
      })

      // Move conversation to archivedConversations if user is a participant
      const conversation = state.conversations.find(
        (conv) => conv.conversationId === conversationId && conv.participants.includes(username),
      )

      if (conversation) {
        const lastMessages = state.messages
          .filter((msg) => msg.conversationId === conversationId)
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
          .slice(-10)

        dispatch({
          type: "ADD_ARCHIVED_CONVERSATION",
          payload: { ...conversation, lastMessages },
        })

        dispatch({ type: "REMOVE_CONVERSATION", payload: conversationId })

        if (state.currentConversationId === conversationId) {
          dispatch({ type: "SET_CURRENT_CONVERSATION_ID", payload: null })
        }
      }
    })

    // Fetch initial data
    fetchConversations()

    return () => {
      // Cleanup listeners
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
      connection.off("TriedToUse")
    }
  }, [
    state.connection,
    state.username,
    state.currentConversationId,
    state.conversations,
    state.messages,
    state.unreadCounts,
  ])

  // Clean up connection on unmount
  useEffect(() => {
    return () => {
      if (state.connection) {
        if (state.connection.state === signalR.HubConnectionState.Connected) {
          state.connection.stop().catch((err) => console.error("Error stopping connection:", err))
        }
      }
    }
  }, [state.connection])

  // Fetch active users
  const fetchActiveUsers = useCallback(() => {
    if (state.connection && state.connection.state === signalR.HubConnectionState.Connected) {
      state.connection
        .invoke("GetActiveUsers")
        .then((users: any) => {
          dispatch({ type: "SET_ACTIVE_USERS", payload: users })
        })
        .catch((err) => console.error("GetActiveUsers Error: ", err))
    }
  }, [state.connection, dispatch])

  // Fetch conversations
  const fetchConversations = useCallback(() => {
    if (state.connection && state.connection.state === signalR.HubConnectionState.Connected && state.username) {
      state.connection
        .invoke("GetConversationsForUser", state.username)
        .then((convs: any) => {
          dispatch({ type: "SET_CONVERSATIONS", payload: convs })
        })
        .catch((err) => console.error("GetConversations Error: ", err))
    }
  }, [state.connection, state.username, dispatch])

  return {
    connectToHub,
    fetchActiveUsers,
    fetchConversations,
  }
}

