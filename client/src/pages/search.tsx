import { useState } from 'react';
import Header from '@/components/layout/header';
import Sidebar from '@/components/layout/sidebar';
import ChatHelper from '@/components/chat/chat-helper';
import MindatSearch from '@/components/search/mindat-search';

export default function Search() {
  const [sidebarVisible, setSidebarVisible] = useState(true);

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-slate-900">
      <Sidebar visible={sidebarVisible} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header toggleSidebar={toggleSidebar} title="Direct API Search" />
        
        <div className="flex-1 overflow-auto p-4">
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