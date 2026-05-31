import { create } from "zustand";

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  isMainAnswer?: boolean;
};

export type TutorState = {
  activeSessionId: string | null;
  questionText: string;
  messages: Message[];
  isSolving: boolean;
  error: string | null;
  
  // Actions
  setQuestionText: (text: string) => void;
  setSessionId: (id: string | null) => void;
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  setIsSolving: (isSolving: boolean) => void;
  setError: (error: string | null) => void;
  clearSession: () => void;
};

export const useTutorStore = create<TutorState>((set) => ({
  activeSessionId: null,
  questionText: "",
  messages: [],
  isSolving: false,
  error: null,

  setQuestionText: (text) => set({ questionText: text }),
  setSessionId: (id) => set({ activeSessionId: id }),
  addMessage: (message) => 
    set((state) => ({ messages: [...state.messages, message] })),
  setMessages: (messages) => set({ messages }),
  setIsSolving: (isSolving) => set({ isSolving }),
  setError: (error) => set({ error }),
  clearSession: () => set({ 
    activeSessionId: null, 
    messages: [], 
    isSolving: false, 
    error: null 
  }),
}));
