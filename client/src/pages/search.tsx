import { useState } from 'react';
import { useLocation } from 'wouter';
import Header from '@/components/layout/header';
import Sidebar from '@/components/layout/sidebar';
import ChatHelper from '@/components/chat/chat-helper';
import MindatSearch from '@/components/search/mindat-search';
import { APIEndpoint } from '@/types/api';

export default function Search() {
  const [, navigate] = useLocation();
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [activeEndpoint, setActiveEndpoint] = useState<APIEndpoint | null>(null);

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  return (
    <div className="flex flex-col h-screen">
      <Header toggleSidebar={toggleSidebar} />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          visible={sidebarVisible}
          activeEndpoint={activeEndpoint}
          setActiveEndpoint={setActiveEndpoint}
        />
        
        <div className="flex-1 overflow-auto p-4 bg-gray-100 dark:bg-slate-900">
          <div className="max-w-6xl mx-auto">
            <div className="mb-6">
              <h1 className="text-2xl font-bold mb-2">Search Mindat Data</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Search for minerals and localities directly from the Mindat API. Get detailed information about mineral formulas, 
                locality coordinates, and more.
              </p>
            </div>
            
            <MindatSearch />
          </div>
        </div>
      </div>
      
      <ChatHelper />
    </div>
  );
}