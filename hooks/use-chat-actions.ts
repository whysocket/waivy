"use client"

import { useCallback } from "react"
import * as signalR from "@microsoft/signalr"
import { useChatContext } from "@/contexts/chat-context"
import { useChatConnection } from "@/hooks/use-chat-connection"
import { debounce } from "@/contexts/chat-context"

export function useChatActions() {
  const { state, dispatch } = useChatContext()
  const { connectToHub, fetchActiveUsers, fetchConversations } = useChatConnection()

  // Scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      const messageContainer = document.querySelector('[data-message-container="true"]')
      if (messageContainer) {
        messageContainer.scrollTop = messageContainer.scrollHeight
      }
    }, 100) // Small delay to ensure content is rendered
  }, [])

  // Handle username submission
  const handleUsernameSubmit = useCallback(async () => {
    if (!state.username.trim()) {
      alert("Please enter a username")
      return
    }

    dispatch({ type: "SET_USERNAME_ERROR", payload: null })

    if (!state.connection) {
      try {
        const connection = await connectToHub()
        await connection.invoke("SetUsername", state.username)
        dispatch({ type: "SET_SHOW_USERNAME_INPUT", payload: false })
        fetchActiveUsers()
        fetchConversations()
      } catch (err) {
        console.error("Connection or SetUsername Error: ", err)
      }
    } else if (state.connection.state === signalR.HubConnectionState.Connected) {
      try {
        await state.connection.invoke("SetUsername", state.username)
        dispatch({ type: "SET_SHOW_USERNAME_INPUT", payload: false })
        fetchActiveUsers()
        fetchConversations()
      } catch (err) {
        console.error("SetUsername Error: ", err)
      }
    }
  }, [state.username, state.connection, connectToHub, fetchActiveUsers, fetchConversations, dispatch])

  // Send a message
  const handleSendMessage = useCallback(() => {
    if (
      state.connection &&
      state.connection.state === signalR.HubConnectionState.Connected &&
      state.currentConversationId &&
      state.message.trim()
    ) {
      state.connection
        .invoke("SendMessage", state.currentConversationId, state.message)
        .then(() => {
          dispatch({ type: "SET_MESSAGE", payload: "" })
        })
        .catch((err) => console.error("SendMessage Error: ", err))
    }
  }, [state.connection, state.currentConversationId, state.message, dispatch])

  // Notify typing
  const handleTyping = useCallback(() => {
    if (
      state.connection &&
      state.connection.state === signalR.HubConnectionState.Connected &&
      state.currentConversationId
    ) {
      const recipient = state.conversations
        .find((conv) => conv.conversationId === state.currentConversationId)
        ?.participants.find((p) => p !== state.username)

      if (recipient) {
        state.connection.invoke("Typing", recipient).catch((err) => console.error("Typing Error: ", err))
      }
    }
  }, [state.connection, state.currentConversationId, state.conversations, state.username])

  // Notify stopped typing
  const handleStoppedTyping = useCallback(() => {
    if (
      state.connection &&
      state.connection.state === signalR.HubConnectionState.Connected &&
      state.currentConversationId
    ) {
      const recipient = state.conversations
        .find((conv) => conv.conversationId === state.currentConversationId)
        ?.participants.find((p) => p !== state.username)

      if (recipient) {
        state.connection.invoke("StoppedTyping", recipient).catch((err) => console.error("StoppedTyping Error: ", err))
      }
    }
  }, [state.connection, state.currentConversationId, state.conversations, state.username])

  // Debounced typing handler
  const debouncedStoppedTyping = useCallback(
    debounce(() => {
      handleStoppedTyping()
    }, 1000),
    [handleStoppedTyping],
  )

  // Fetch conversation messages
  const fetchConversationMessages = useCallback(
    async (conversationId: string) => {
      if (state.connection && state.connection.state === signalR.HubConnectionState.Connected) {
        try {
          const msgs = await state.connection.invoke("GetConversationMessages", conversationId)
          dispatch({
            type: "SET_MESSAGES",
            payload: msgs.map((msg: any) => ({ ...msg, isOwnMessage: msg.senderUsername === state.username })),
          })
          scrollToBottom()
        } catch (err) {
          console.error("GetConversationMessages Error: ", err)
        }
      }
    },
    [state.connection, state.username, dispatch, scrollToBottom],
  )

  // Handle conversation selection
  const handleConversationSelect = useCallback(
    (conversationId: string) => {
      dispatch({ type: "SET_CURRENT_CONVERSATION_ID", payload: conversationId })
      fetchConversationMessages(conversationId)
      dispatch({ type: "CLEAR_UNREAD_COUNT", payload: conversationId })
      dispatch({ type: "SET_TYPING_USER", payload: null })
      dispatch({ type: "SET_SELECTED_ARCHIVED_CONVERSATION", payload: null })
      dispatch({ type: "SET_SHOW_MOBILE_CHAT", payload: true })
    },
    [fetchConversationMessages, dispatch],
  )

  // Handle archived conversation selection
  const handleArchivedConversationSelect = useCallback(
    (conversationId: string) => {
      dispatch({ type: "SET_SELECTED_ARCHIVED_CONVERSATION", payload: conversationId })
      dispatch({ type: "SET_CURRENT_CONVERSATION_ID", payload: null })
      dispatch({ type: "SET_SHOW_MOBILE_CHAT", payload: true })
    },
    [dispatch],
  )

  // Create a new conversation
  const handleCreateConversation = useCallback(
    async (otherUsername: string) => {
      if (state.connection && state.connection.state === signalR.HubConnectionState.Connected && state.username) {
        try {
          const conversationId = await state.connection.invoke("CreateConversation", [state.username, otherUsername])
          dispatch({ type: "SET_CURRENT_CONVERSATION_ID", payload: conversationId })
          fetchConversationMessages(conversationId)
          fetchConversations()
          dispatch({ type: "SET_ACTIVE_TAB", payload: "conversations" })
          dispatch({ type: "SET_SHOW_MOBILE_CHAT", payload: true })
        } catch (err) {
          console.error("CreateConversation Error: ", err)
        }
      }
    },
    [state.connection, state.username, fetchConversationMessages, fetchConversations, dispatch],
  )

  // Mark messages as read
  const markMessagesAsRead = useCallback(() => {
    if (
      state.connection &&
      state.connection.state === signalR.HubConnectionState.Connected &&
      state.currentConversationId
    ) {
      const unreadMessageIds = state.messages
        .filter(
          (msg) =>
            !msg.isOwnMessage && !msg.readBy.includes(state.username) && !state.readMessageIds.has(msg.messageId),
        )
        .map((msg) => msg.messageId)

      if (unreadMessageIds.length > 0) {
        console.log("Marking messages as read:", unreadMessageIds)
        state.connection
          .invoke("MarkMessagesAsRead", state.currentConversationId, unreadMessageIds)
          .then(() => {
            // Update local state to reflect read status
            unreadMessageIds.forEach((messageId) => {
              dispatch({
                type: "MARK_MESSAGE_AS_READ",
                payload: { messageId, username: state.username },
              })
            })
            dispatch({ type: "ADD_READ_MESSAGE_IDS", payload: unreadMessageIds })
          })
          .catch((err) => console.error("MarkMessagesAsRead Error: ", err))
      }
    }
  }, [state.connection, state.currentConversationId, state.messages, state.username, state.readMessageIds, dispatch])

  return {
    scrollToBottom,
    handleUsernameSubmit,
    handleSendMessage,
    handleTyping,
    handleStoppedTyping,
    debouncedStoppedTyping,
    fetchConversationMessages,
    handleConversationSelect,
    handleArchivedConversationSelect,
    handleCreateConversation,
    markMessagesAsRead,
  }
}

