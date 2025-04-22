import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Minus, X, MessageSquare } from 'lucide-react';
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
        className={`fixed bottom-0 right-0 sm:w-96 md:w-[600px] lg:w-[800px] bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-lg rounded-tl-lg transition-transform transform ${
          isOpen ? (isMinimized ? 'translate-y-[calc(100%-40px)]' : 'translate-y-0') : 'translate-y-full'
        } h-[500px] flex flex-col z-40`}
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
        
        <div className="flex-1 p-3 overflow-y-auto space-y-3">
          {messages.map((message, index) => (
            <div 
              key={index} 
              className={`flex items-end ${message.role === 'user' ? 'justify-end' : ''}`}
            >
              <div 
                className={`${
                  message.role === 'assistant' 
                    ? 'bg-primary text-white rounded-lg rounded-bl-none' 
                    : 'bg-gray-100 dark:bg-slate-700 rounded-lg rounded-br-none'
                } p-3 max-w-[90%] text-sm`}
              >
                <div className="prose dark:prose-invert prose-sm max-w-none" dangerouslySetInnerHTML={{ 
                  __html: message.content
                    .replace(/```([^`]+)```/g, '<pre class="bg-indigo-900 dark:bg-slate-900 p-3 rounded overflow-x-auto"><code>$1</code></pre>')
                    .replace(/`([^`]+)`/g, '<code class="bg-indigo-800 dark:bg-indigo-900 px-1 py-0.5 rounded text-white">$1</code>')
                    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
                    .replace(/\n/g, '<br />')
                }} />
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        
        <form onSubmit={handleSubmit} className="p-3 border-t border-gray-200 dark:border-slate-700">
          <div className="relative">
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
        </form>
      </div>
      
      {/* Chat toggle button */}
      <Button
        onClick={toggleChat}
        variant="default"
        size="icon"
        className="fixed bottom-5 right-5 bg-primary hover:bg-indigo-700 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg z-50"
      >
        <MessageSquare className="h-5 w-5" />
      </Button>
    </>
  );
}
