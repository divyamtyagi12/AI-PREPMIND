import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { tutorService } from '../../services/tutorService';
import TutorSidebar from '../../components/tutor/TutorSidebar';
import TutorMessage from '../../components/tutor/TutorMessage';
import TutorModeSelector from '../../components/tutor/TutorModeSelector';
import TutorContextBadge from '../../components/tutor/TutorContextBadge';
import TutorSuggestedQuestions from '../../components/tutor/TutorSuggestedQuestions';
import TutorTypingIndicator from '../../components/tutor/TutorTypingIndicator';
import TutorInput from '../../components/tutor/TutorInput';
import { Bot, AlertCircle, RefreshCw } from 'lucide-react';

const DEFAULT_SUGGESTIONS = [
  'Can you explain the intuition behind this topic?',
  'What are common edge cases to watch out for in an interview?',
  'How do I derive the time and space complexity?',
  'Give me a Level 1 hint on how to start.',
];

export default function AITutor() {
  const [searchParams, setSearchParams] = useSearchParams();
  const contextType = searchParams.get('contextType');
  const referenceId = searchParams.get('referenceId');

  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [quota, setQuota] = useState(null);

  const [mode, setMode] = useState('explain');
  const [hintLevel, setHintLevel] = useState(1);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  // Load initial quota and conversations
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [quotaData, convs] = await Promise.all([
        tutorService.getQuota(),
        tutorService.listConversations(),
      ]);
      setQuota(quotaData);
      setConversations(convs || []);

      // If URL has context parameters, create or load context conversation
      if (contextType && referenceId) {
        const quick = await tutorService.createQuickContext(contextType, referenceId);
        if (quick?.conversation) {
          setConversations((prev) => [quick.conversation, ...prev]);
          await loadConversation(quick.conversation.id);
          // Clean up search params after creating
          setSearchParams({});
          return;
        }
      }

      // Default: load first active conversation or start fresh
      if (convs && convs.length > 0) {
        await loadConversation(convs[0].id);
      }
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to initialize AI Tutor');
    } finally {
      setLoading(false);
    }
  };

  const loadConversation = async (id) => {
    try {
      const data = await tutorService.getConversation(id);
      setCurrentConversation(data.conversation);
      setMessages(data.messages || []);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to load conversation');
    }
  };

  const handleStartNewChat = async () => {
    try {
      const conv = await tutorService.createConversation({ title: 'New Conversation' });
      setConversations((prev) => [conv, ...prev]);
      setCurrentConversation(conv);
      setMessages([]);
    } catch (err) {
      setError('Could not start new conversation');
    }
  };

  const handleDeleteConversation = async (id) => {
    try {
      await tutorService.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (currentConversation?.id === id) {
        setCurrentConversation(null);
        setMessages([]);
      }
    } catch (err) {
      setError('Failed to archive conversation');
    }
  };

  const handleSendMessage = async (text) => {
    if (!text.trim() || sending) return;
    setError(null);

    // If no active conversation, create one first
    let activeConv = currentConversation;
    if (!activeConv) {
      try {
        activeConv = await tutorService.createConversation({ title: 'New Conversation' });
        setConversations((prev) => [activeConv, ...prev]);
        setCurrentConversation(activeConv);
      } catch (e) {
        setError('Failed to create new conversation');
        return;
      }
    }

    const optimisticMsg = {
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setSending(true);

    try {
      const res = await tutorService.sendMessage(activeConv.id, {
        message: text,
        mode,
        hintLevel: mode === 'hint' ? hintLevel : undefined,
      });

      setMessages((prev) => [...prev.slice(0, -1), res.userMessageDoc, res.assistantMessageDoc]);
      if (res.quota) {
        setQuota((prev) => ({
          ...prev,
          usedToday: res.quota.usedToday,
          remaining: Math.max(0, res.quota.dailyLimit - res.quota.usedToday),
        }));
      }

      // Auto advance hint level if user was asking for a hint
      if (mode === 'hint' && hintLevel < 4) {
        setHintLevel((lvl) => lvl + 1);
      }
    } catch (err) {
      const errMsg = err?.response?.data?.error || err.message || 'Error communicating with AI Tutor';
      setError(errMsg);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Sidebar */}
      <TutorSidebar
        conversations={conversations}
        currentId={currentConversation?.id}
        onSelect={loadConversation}
        onNewChat={handleStartNewChat}
        onDelete={handleDeleteConversation}
        quota={quota}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Bar with Context Badge & Mode Selector */}
        <header className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 dark:text-white truncate">
                {currentConversation?.title || 'PrepMind AI Tutor'}
              </h1>
              <TutorContextBadge conversation={currentConversation} />
            </div>
            {quota && (
              <span className="text-xs text-slate-500 hidden sm:inline">
                {quota.remaining} prompts remaining today
              </span>
            )}
          </div>

          <TutorModeSelector
            currentMode={mode}
            onSelectMode={setMode}
            hintLevel={hintLevel}
            onSetHintLevel={setHintLevel}
          />
        </header>

        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-lg text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-rose-500 hover:text-rose-700 font-bold ml-2"
              >
                ✕
              </button>
            </div>
          )}

          {messages.length === 0 && !loading && (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-lg mx-auto text-slate-500">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
                <Bot className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                How can I assist your prep today?
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                I adapt to your current mastery level. Switch modes above for conceptual explanations, progressive hints, Socratic guidance, or interview solutions.
              </p>
              <TutorSuggestedQuestions
                suggestions={DEFAULT_SUGGESTIONS}
                onSelect={(q) => handleSendMessage(q)}
              />
            </div>
          )}

          {messages.map((m, idx) => (
            <TutorMessage key={m.id || idx} message={m} />
          ))}

          {sending && <TutorTypingIndicator />}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Footer */}
        <footer className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
          <div className="max-w-4xl mx-auto">
            {messages.length > 0 && !sending && (
              <TutorSuggestedQuestions
                suggestions={DEFAULT_SUGGESTIONS.slice(0, 3)}
                onSelect={(q) => handleSendMessage(q)}
              />
            )}
            <TutorInput
              onSendMessage={handleSendMessage}
              disabled={sending || (quota && quota.remaining <= 0)}
              placeholder={
                quota && quota.remaining <= 0
                  ? 'Daily prompt limit reached. Resets at midnight UTC.'
                  : mode === 'hint'
                  ? `Ask for hint level ${hintLevel} (or ask a specific doubt)...`
                  : 'Ask your tutor a doubt, request an explanation, or paste code...'
              }
            />
          </div>
        </footer>
      </div>
    </div>
  );
}

