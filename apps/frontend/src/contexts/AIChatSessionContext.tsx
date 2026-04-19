import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type AIChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

function newMessageId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

type AIChatSessionContextValue = {
  chatHistory: AIChatMessage[];
  pushUserMessage: (content: string) => void;
  pushAssistantMessage: (content: string) => void;
  clearChat: () => void;
};

const AIChatSessionContext = createContext<AIChatSessionContextValue | null>(null);

/** Keeps Ask AI messages for the SPA session (survives route changes; cleared when app shell unmounts, e.g. logout). */
export function AIChatSessionProvider({ children }: { children: React.ReactNode }) {
  const [chatHistory, setChatHistory] = useState<AIChatMessage[]>([]);

  const pushUserMessage = useCallback((content: string) => {
    setChatHistory((prev) => [...prev, { id: newMessageId(), role: 'user', content }]);
  }, []);

  const pushAssistantMessage = useCallback((content: string) => {
    setChatHistory((prev) => [...prev, { id: newMessageId(), role: 'assistant', content }]);
  }, []);

  const clearChat = useCallback(() => setChatHistory([]), []);

  const value = useMemo(
    () => ({ chatHistory, pushUserMessage, pushAssistantMessage, clearChat }),
    [chatHistory, pushUserMessage, pushAssistantMessage, clearChat],
  );

  return <AIChatSessionContext.Provider value={value}>{children}</AIChatSessionContext.Provider>;
}

export function useAIChatSession(): AIChatSessionContextValue {
  const ctx = useContext(AIChatSessionContext);
  if (!ctx) throw new Error('useAIChatSession must be used within AIChatSessionProvider');
  return ctx;
}
