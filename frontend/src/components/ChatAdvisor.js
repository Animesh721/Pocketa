import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const ChatAdvisor = () => {
  const [conversations, setConversations] = useState([
    {
      id: 1,
      title: 'Financial Advice Chat',
      messages: [
        {
          role: 'assistant',
          content: '👋 Hi! I\'m your AI financial advisor. I analyze your real spending data to give you specific, actionable solutions.\n\n**I can help you with:**\n• Exact daily spending limits\n• Step-by-step money-saving plans\n• Emergency financial protocols\n• Personalized budget strategies\n\nTry asking: "How can I make my allowance last 7 days?" or "Help me save ₹100"',
          timestamp: new Date()
        }
      ],
      lastUpdated: new Date()
    }
  ]);
  const [currentConversationId, setCurrentConversationId] = useState(1);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [context, setContext] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const textareaRef = useRef(null);

  const currentConversation = conversations.find(c => c.id === currentConversationId);
  const messages = currentConversation?.messages || [];

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  };

  useEffect(() => {
    // Add a small delay to prevent page scrolling issues
    const timer = setTimeout(() => {
      scrollToBottom();
    }, 100);

    return () => clearTimeout(timer);
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [inputMessage]);

  const createNewConversation = () => {
    const newId = Math.max(...conversations.map(c => c.id)) + 1;
    const newConversation = {
      id: newId,
      title: `Chat ${newId}`,
      messages: [
        {
          role: 'assistant',
          content: '👋 Hi! I\'m your AI financial advisor. How can I help you manage your finances today?',
          timestamp: new Date()
        }
      ],
      lastUpdated: new Date()
    };
    setConversations(prev => [newConversation, ...prev]);
    setCurrentConversationId(newId);
  };

  const updateConversationMessages = (conversationId, newMessages) => {
    setConversations(prev => prev.map(conv =>
      conv.id === conversationId
        ? { ...conv, messages: newMessages, lastUpdated: new Date() }
        : conv
    ));
  };

  const deleteConversation = (conversationId) => {
    // Don't delete if it's the only conversation
    if (conversations.length <= 1) return;

    setConversations(prev => prev.filter(conv => conv.id !== conversationId));

    // If we're deleting the current conversation, switch to another one
    if (conversationId === currentConversationId) {
      const remainingConversations = conversations.filter(conv => conv.id !== conversationId);
      if (remainingConversations.length > 0) {
        setCurrentConversationId(remainingConversations[0].id);
      }
    }
  };

  const sendMessage = async (e) => {
    if (e) {
      e.preventDefault();
    }
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    const updatedMessages = [...messages, userMessage];
    updateConversationMessages(currentConversationId, updatedMessages);
    setInputMessage('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      const chatHistory = messages
        .filter(msg => msg.role !== 'system')
        .map(msg => ({ role: msg.role, content: msg.content }));

      const response = await axios.post('/api/advice/chat', {
        message: userMessage.content,
        chatHistory: chatHistory
      });

      // Simulate typing delay for better UX
      setTimeout(() => {
        const assistantMessage = {
          role: 'assistant',
          content: response.data.response,
          timestamp: new Date(response.data.timestamp),
          context: response.data.context
        };

        const finalMessages = [...updatedMessages, assistantMessage];
        updateConversationMessages(currentConversationId, finalMessages);
        setContext(response.data.context);
        setIsTyping(false);
      }, 1000);
    } catch (error) {
      console.error('Chat error:', error);
      setTimeout(() => {
        const errorMessage = {
          role: 'assistant',
          content: 'Sorry, I\'m having trouble responding right now. Please try again in a moment.',
          timestamp: new Date(),
          isError: true
        };
        const finalMessages = [...updatedMessages, errorMessage];
        updateConversationMessages(currentConversationId, finalMessages);
        setIsTyping(false);
      }, 1000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickQuestions = [
    "How can I save ₹100 from this allowance?",
    "What should I cut to make this last 7 days?",
    "How much should I spend on weekends?",
    "Help me with financial emergency",
    "Create a personalized budget plan",
    "What should I do right now?"
  ];

  const handleQuickQuestion = (question) => {
    setInputMessage(question);
    // Auto-focus textarea after selecting quick question
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  return (
    <div className="flex h-full bg-white overflow-hidden">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-80' : 'w-0 lg:w-80'} transition-all duration-300 bg-gray-900 text-white flex flex-col overflow-hidden`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-700">
          <button
            onClick={createNewConversation}
            className="w-full flex items-center justify-center space-x-2 bg-gray-700 hover:bg-gray-600 text-white py-3 px-4 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="font-medium">New Chat</span>
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-2">
          <div className="space-y-2">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`relative rounded-lg transition-colors group ${
                  conversation.id === currentConversationId
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <button
                  onClick={() => setCurrentConversationId(conversation.id)}
                  className="w-full text-left p-3 pr-10"
                >
                  <div className="flex items-center space-x-3">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span className="truncate text-sm font-medium">{conversation.title}</span>
                  </div>
                </button>

                {/* Delete Button - Only show if there's more than one conversation */}
                {conversations.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(conversation.id);
                    }}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600/20 text-red-400 hover:text-red-300"
                    title="Delete conversation"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="p-4 border-t border-gray-700 space-y-2">
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Quick Help</div>
          {quickQuestions.slice(0, 4).map((question, index) => (
            <button
              key={index}
              onClick={() => handleQuickQuestion(question)}
              className="w-full text-left p-2 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded transition-colors"
            >
              {question}
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">🤖</span>
              </div>
              <div>
                <h1 className="font-semibold text-gray-900">AI Financial Advisor</h1>
                <p className="text-sm text-gray-500">
                  {context ? `Balance: ₹${context.currentBalance} • Avg: ${context.avgDaysLasted} days` : 'Ready to help you manage finances'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto"
          style={{ scrollBehavior: 'smooth' }}
        >
          <div className="max-w-4xl mx-auto h-full">
            {messages.map((message, index) => (
              <div key={index} className={`py-8 px-4 ${message.role === 'assistant' ? 'bg-gray-50' : 'bg-white'}`}>
                <div className="flex space-x-4 max-w-3xl mx-auto">
                  <div className="flex-shrink-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      message.role === 'assistant'
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600'
                        : 'bg-gray-700'
                    }`}>
                      <span className="text-white text-sm">
                        {message.role === 'assistant' ? '🤖' : '👤'}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="text-gray-900 leading-relaxed">
                      {message.role === 'assistant' ? (
                        <div
                          dangerouslySetInnerHTML={{
                            __html: message.content
                              .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
                              .replace(/• /g, '<span class="text-blue-600">•</span> ')
                              .replace(/(\d+\. )/g, '<strong class="font-medium">$1</strong>')
                              .split('\n').map(line => {
                                if (line.includes('SAVINGS STRATEGY:') || line.includes('EXTEND ALLOWANCE PLAN:') ||
                                    line.includes('PERSONALIZED BUDGET PLAN:') || line.includes('FINANCIAL STATUS:') ||
                                    line.includes('FINANCIAL EMERGENCY PROTOCOL:')) {
                                  return `<div class="font-semibold text-blue-800 mb-2 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">${line}</div>`;
                                }
                                return line;
                              }).join('<br>')
                          }}
                        />
                      ) : (
                        <span>{message.content}</span>
                      )}
                    </div>
                    {message.isError && (
                      <div className="text-red-600 text-sm">⚠️ Error occurred</div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {(isLoading || isTyping) && (
              <div className="py-8 px-4 bg-gray-50">
                <div className="flex space-x-4 max-w-3xl mx-auto">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                      <span className="text-white text-sm">🤖</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-gray-500 text-sm">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 bg-white p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Message AI Financial Advisor..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white text-gray-900 placeholder-gray-500"
                  rows="1"
                  style={{
                    minHeight: '50px',
                    maxHeight: '200px',
                    fontSize: '16px'
                  }}
                />
              </div>
              <button
                onClick={(e) => sendMessage(e)}
                disabled={!inputMessage.trim() || isLoading}
                className="flex items-center justify-center w-12 h-12 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-xl transition-colors flex-shrink-0"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default ChatAdvisor;