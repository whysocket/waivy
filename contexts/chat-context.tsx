"use client"

import type React from "react"
import { createContext, useContext, useReducer, type ReactNode } from "react"
import type * as signalR from "@microsoft/signalr"

// Types
export interface Message {
  messageId: string
  conversationId: string
  senderUsername: string
  content: string
  timestamp: string
  isOwnMessage: boolean
  readBy: string[]
}

export interface ActiveUser {
  username: string
  connectionIds: string[]
}

export interface UserConnection {
  username: string
  connectionId: string
}

export interface Conversation {
  conversationId: string
  participants: string[]
  createdAt: string
}

export interface ArchivedConversation extends Conversation {
  lastMessages: Message[]
}

// State interface - split into logical groups
export interface ChatState {
  // Connection state
  connection: signalR.HubConnection | null
  isConnected: boolean

  // User state
  username: string
  usernameError: string | null
  showUsernameInput: boolean

  // Message state
  message: string
  messages: Message[]
  typingUser: string | null
  readMessageIds: Set<string>

  // Conversation state
  conversations: Conversation[]
  currentConversationId: string | null
  unreadCounts: Record<string, number>
  leftUsers: Record<string, string[]>
  archivedConversations: ArchivedConversation[]
  selectedArchivedConversation: string | null

  // UI state
  activeUsers: ActiveUser[]
  activeTab: string
  searchQuery: string
  showMobileChat: boolean
}

// Initial state
const initialState: ChatState = {
  // Connection state
  connection: null,
  isConnected: false,

  // User state
  username: "",
  usernameError: null,
  showUsernameInput: true,

  // Message state
  message: "",
  messages: [],
  typingUser: null,
  readMessageIds: new Set<string>(),

  // Conversation state
  conversations: [],
  currentConversationId: null,
  unreadCounts: {},
  leftUsers: {},
  archivedConversations: [],
  selectedArchivedConversation: null,

  // UI state
  activeUsers: [],
  activeTab: "conversations",
  searchQuery: "",
  showMobileChat: false,
}

// Action types - grouped by feature
type ConnectionAction =
  | { type: "SET_CONNECTION"; payload: signalR.HubConnection | null }
  | { type: "SET_CONNECTED"; payload: boolean }

type UserAction =
  | { type: "SET_USERNAME"; payload: string }
  | { type: "SET_USERNAME_ERROR"; payload: string | null }
  | { type: "SET_SHOW_USERNAME_INPUT"; payload: boolean }

type MessageAction =
  | { type: "SET_MESSAGE"; payload: string }
  | { type: "ADD_MESSAGE"; payload: Message }
  | { type: "SET_MESSAGES"; payload: Message[] }
  | { type: "SET_TYPING_USER"; payload: string | null }
  | { type: "ADD_READ_MESSAGE_ID"; payload: string }
  | { type: "ADD_READ_MESSAGE_IDS"; payload: string[] }
  | { type: "MARK_MESSAGE_AS_READ"; payload: { messageId: string; username: string } }

type ConversationAction =
  | { type: "ADD_CONVERSATION"; payload: Conversation }
  | { type: "SET_CONVERSATIONS"; payload: Conversation[] }
  | { type: "SET_CURRENT_CONVERSATION_ID"; payload: string | null }
  | { type: "UPDATE_UNREAD_COUNT"; payload: { conversationId: string; count: number } }
  | { type: "CLEAR_UNREAD_COUNT"; payload: string }
  | { type: "UPDATE_LEFT_USERS"; payload: { conversationId: string; username: string } }
  | { type: "ADD_ARCHIVED_CONVERSATION"; payload: ArchivedConversation }
  | { type: "SET_SELECTED_ARCHIVED_CONVERSATION"; payload: string | null }
  | { type: "REMOVE_CONVERSATION"; payload: string }

type UIAction =
  | { type: "SET_ACTIVE_USERS"; payload: ActiveUser[] }
  | { type: "SET_ACTIVE_TAB"; payload: string }
  | { type: "SET_SEARCH_QUERY"; payload: string }
  | { type: "SET_SHOW_MOBILE_CHAT"; payload: boolean }

// Combined action type
type ChatAction = ConnectionAction | UserAction | MessageAction | ConversationAction | UIAction

// Reducer function - simplified with focused sub-reducers
function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    // Connection actions
    case "SET_CONNECTION":
      return { ...state, connection: action.payload }
    case "SET_CONNECTED":
      return { ...state, isConnected: action.payload }

    // User actions
    case "SET_USERNAME":
      return { ...state, username: action.payload }
    case "SET_USERNAME_ERROR":
      return { ...state, usernameError: action.payload }
    case "SET_SHOW_USERNAME_INPUT":
      return { ...state, showUsernameInput: action.payload }

    // Message actions
    case "SET_MESSAGE":
      return { ...state, message: action.payload }
    case "ADD_MESSAGE":
      return { ...state, messages: [...state.messages, action.payload] }
    case "SET_MESSAGES":
      return { ...state, messages: action.payload }
    case "SET_TYPING_USER":
      return { ...state, typingUser: action.payload }
    case "ADD_READ_MESSAGE_ID":
      const newReadMessageIds = new Set(state.readMessageIds)
      newReadMessageIds.add(action.payload)
      return { ...state, readMessageIds: newReadMessageIds }
    case "ADD_READ_MESSAGE_IDS":
      const updatedReadMessageIds = new Set([...Array.from(state.readMessageIds), ...action.payload])
      return { ...state, readMessageIds: updatedReadMessageIds }
    case "MARK_MESSAGE_AS_READ":
      return {
        ...state,
        messages: state.messages.map((msg) =>
          msg.messageId === action.payload.messageId && !msg.readBy.includes(action.payload.username)
            ? { ...msg, readBy: [...msg.readBy, action.payload.username] }
            : msg,
        ),
      }

    // Conversation actions
    case "ADD_CONVERSATION":
      return {
        ...state,
        conversations: [...state.conversations, action.payload],
      }
    case "SET_CONVERSATIONS":
      return { ...state, conversations: action.payload }
    case "SET_CURRENT_CONVERSATION_ID":
      return { ...state, currentConversationId: action.payload }
    case "UPDATE_UNREAD_COUNT":
      return {
        ...state,
        unreadCounts: {
          ...state.unreadCounts,
          [action.payload.conversationId]: action.payload.count,
        },
      }
    case "CLEAR_UNREAD_COUNT":
      const newUnreadCounts = { ...state.unreadCounts }
      delete newUnreadCounts[action.payload]
      return { ...state, unreadCounts: newUnreadCounts }
    case "UPDATE_LEFT_USERS":
      const updatedLeftUsers = { ...state.leftUsers }
      if (updatedLeftUsers[action.payload.conversationId]) {
        updatedLeftUsers[action.payload.conversationId] = [
          ...updatedLeftUsers[action.payload.conversationId],
          action.payload.username,
        ]
      } else {
        updatedLeftUsers[action.payload.conversationId] = [action.payload.username]
      }
      return { ...state, leftUsers: updatedLeftUsers }
    case "ADD_ARCHIVED_CONVERSATION":
      return {
        ...state,
        archivedConversations: [...state.archivedConversations, action.payload],
      }
    case "SET_SELECTED_ARCHIVED_CONVERSATION":
      return { ...state, selectedArchivedConversation: action.payload }
    case "REMOVE_CONVERSATION":
      return {
        ...state,
        conversations: state.conversations.filter((conv) => conv.conversationId !== action.payload),
      }

    // UI actions
    case "SET_ACTIVE_USERS":
      return { ...state, activeUsers: action.payload }
    case "SET_ACTIVE_TAB":
      return { ...state, activeTab: action.payload }
    case "SET_SEARCH_QUERY":
      return { ...state, searchQuery: action.payload }
    case "SET_SHOW_MOBILE_CHAT":
      return { ...state, showMobileChat: action.payload }

    default:
      return state
  }
}

// Create context
interface ChatContextType {
  state: ChatState
  dispatch: React.Dispatch<ChatAction>
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

// Provider component
export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState)

  return <ChatContext.Provider value={{ state, dispatch }}>{children}</ChatContext.Provider>
}

// Custom hook to use the chat context
export function useChatContext() {
  const context = useContext(ChatContext)
  if (context === undefined) {
    throw new Error("useChatContext must be used within a ChatProvider")
  }
  return context
}

// Utility functions
export function debounce<T extends (...args: any[]) => void>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }
    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

