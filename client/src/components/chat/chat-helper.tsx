import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Minus, X, MessageSquare, ArrowUpCircle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatHelper() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'How can I help you with the Mindat API today?'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of messages when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const toggleChat = () => {
    if (isMinimized) {
      setIsMinimized(false);
      return;
    }
    setIsOpen(!isOpen);
  };

  const minimizeChat = () => {
    setIsMinimized(true);
  };

  const closeChat = () => {
    setIsOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: input
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await apiRequest('POST', '/api/chat', {
        message: input,
        history: messages
      });
      
      const data = await response.json();
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to get response:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Chat Helper */}
      <div 
        className={`fixed bottom-0 right-0 w-full md:w-[80%] lg:w-[90%] bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-lg rounded-tl-lg transition-transform transform ${
          isOpen ? (isMinimized ? 'translate-y-[calc(100%-40px)]' : 'translate-y-0') : 'translate-y-full'
        } h-[85vh] md:h-[80vh] flex flex-col z-40`}
      >
        <div className="p-3 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-700 rounded-tl-lg">
          <h3 className="font-medium text-gray-800 dark:text-gray-200">API Assistant</h3>
          <div className="flex space-x-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              onClick={minimizeChat}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              onClick={closeChat}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex-1 p-3 overflow-y-auto space-y-3 ios-scroll">
          {messages.map((message, index) => (
            <div 
              key={index} 
              className={`flex items-end ${message.role === 'user' ? 'justify-end' : ''}`}
            >
              <div 
                className={`${
                  message.role === 'assistant' 
                    ? 'bg-slate-100 dark:bg-slate-600 text-slate-900 dark:text-white rounded-lg rounded-bl-none' 
                    : 'bg-gray-100 dark:bg-slate-700 rounded-lg rounded-br-none'
                } p-3 max-w-[90%] text-sm`}
              >
                <div className="prose dark:prose-invert prose-sm max-w-none overflow-x-auto" dangerouslySetInnerHTML={{ 
                  __html: `
                    <style>
                      table { 
                        border-collapse: collapse;
                        width: 100%;
                        margin: 1rem 0;
                        font-size: 0.875rem;
                      }
                      th, td {
                        border: 1px solid #cbd5e0;
                        padding: 0.5rem;
                        text-align: left;
                      }
                      th {
                        background-color: #e2e8f0;
                        font-weight: 600;
                        color: #1a202c;
                      }
                      tr:nth-child(even) {
                        background-color: #f8fafc;
                      }
                      tr:nth-child(odd) {
                        background-color: #ffffff;
                      }
                      .dark th {
                        background-color: #374151;
                        color: #f9fafb;
                        border-color: #4b5563;
                      }
                      .dark td {
                        border-color: #4b5563;
                        color: #f9fafb;
                      }
                      .dark tr:nth-child(even) {
                        background-color: #1f2937;
                      }
                      .dark tr:nth-child(odd) {
                        background-color: #111827;
                      }
                      code.inline {
                        background-color: #edf2f7;
                        color: #1a202c;
                        padding: 0.1rem 0.3rem;
                        border-radius: 0.25rem;
                      }
                      .dark code.inline {
                        background-color: #2d3748;
                        color: #e2e8f0;
                      }
                      pre {
                        background-color: #1a202c;
                        color: #e2e8f0;
                        padding: 1rem;
                        border-radius: 0.375rem;
                        overflow-x: auto;
                        margin: 1rem 0;
                      }
                    </style>
                  ` + 
                  message.content
                    .replace(/```([^`]+)```/g, '<pre><code>$1</code></pre>')
                    .replace(/`([^`]+)`/g, '<code class="inline">$1</code>')
                    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
                    .replace(/\n\s*\n/g, '<br /><br />') // Double line breaks
                    .replace(/\n/g, '<br />') // Single line breaks
                    .replace(/\s{4,}/g, ' ') // Remove excessive whitespace
                    .replace(/<br \/>\s*<table>/g, '<table>') // Remove breaks before tables
                    .replace(/\s*<\/table>\s*<br \/>/g, '</table>') // Remove breaks after tables
                }} />
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        
        <form onSubmit={handleSubmit} className="p-3 border-t border-gray-200 dark:border-slate-700">
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Textarea
                className="bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white text-sm rounded-lg block w-full pl-3 pr-10 py-2 resize-none"
                placeholder="Ask something about the API..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                rows={2}
              />
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                disabled={loading}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-primary"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <Button
              type="submit"
              variant="default"
              size="icon"
              disabled={loading}
              className="bg-primary hover:bg-indigo-700 text-white h-10 w-10 rounded-full flex items-center justify-center"
            >
              <ArrowUpCircle className="h-5 w-5" />
            </Button>
          </div>
        </form>
      </div>
      
      {/* Chat toggle button - only shown when chat is closed */}
      {!isOpen && (
        <Button
          onClick={toggleChat}
          variant="default"
          size="icon"
          className="fixed bottom-5 right-5 bg-primary hover:bg-indigo-700 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg z-50"
        >
          <MessageSquare className="h-5 w-5" />
        </Button>
      )}
    </>
  );
}
