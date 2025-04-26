import { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import Header from '@/components/layout/header';
import Sidebar from '@/components/layout/sidebar';
import { ApiExplorer } from '@/components/explorer/api-explorer';
import { KnowledgeBaseContent } from '@/components/explorer/knowledge-base-content';
import { SavedRequestsContent } from '@/components/explorer/saved-requests-content';
import ChatHelper from '@/components/chat/chat-helper';
import { APIEndpoint } from '@/types/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useApiDocs } from '@/hooks/use-api-docs';

export default function Explorer() {
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [activeEndpoint, setActiveEndpoint] = useState<APIEndpoint | null>(null);
  const [activeTab, setActiveTab] = useState('explorer');
  const { categories } = useApiDocs();
  const [, navigate] = useLocation();

  // Set a default endpoint when categories are loaded
  useEffect(() => {
    if (categories && categories.length > 0 && categories[0].endpoints.length > 0) {
      setActiveEndpoint(categories[0].endpoints[0]);
    }
  }, [categories]);

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  return (
    <div className="flex flex-col h-screen">
      <Header toggleSidebar={toggleSidebar} />
      
      <div className="flex flex-1 overflow-hidden">
        {/* On mobile, position sidebar with lower z-index so it doesn't cover main content */}
        <div className="lg:relative">
          <Sidebar 
            visible={sidebarVisible} 
            activeEndpoint={activeEndpoint} 
            setActiveEndpoint={setActiveEndpoint} 
          />
          {/* Overlay that appears when sidebar is open on mobile - clicking it closes the sidebar */}
          {sidebarVisible && (
            <div 
              className="fixed inset-0 bg-black/20 lg:hidden z-20" 
              onClick={toggleSidebar}
              aria-hidden="true"
            />
          )}
        </div>
        
        {/* Main content area with higher z-index on mobile */}
        <div className="flex-1 flex flex-col z-10 relative lg:z-0">
          <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
            <Tabs 
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full h-full flex flex-col"
            >
              <TabsList className="bg-transparent h-auto overflow-x-auto flex-nowrap justify-start">
                <TabsTrigger 
                  value="explorer"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-2 sm:px-4 py-3 text-xs sm:text-sm whitespace-nowrap"
                >
                  API Explorer
                </TabsTrigger>
                <Link href="/mineral-reference">
                  <span className="px-2 sm:px-4 py-3 text-xs sm:text-sm whitespace-nowrap text-gray-600 dark:text-gray-300 hover:text-primary flex items-center border-b-2 border-transparent hover:border-primary/50">
                    Additional Mapping
                  </span>
                </Link>
                <TabsTrigger 
                  value="knowledge-base"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-2 sm:px-4 py-3 text-xs sm:text-sm whitespace-nowrap"
                >
                  Knowledge Base
                </TabsTrigger>
                <TabsTrigger 
                  value="saved-requests"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-2 sm:px-4 py-3 text-xs sm:text-sm whitespace-nowrap"
                >
                  Saved Requests
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          {/* Separate scrollable content area */}
          <div className="flex-1 overflow-auto">
            {activeTab === 'explorer' && (
              <ApiExplorer endpoint={activeEndpoint} />
            )}
            
            {activeTab === 'knowledge-base' && (
              <KnowledgeBaseContent />
            )}
            
            {activeTab === 'saved-requests' && (
              <SavedRequestsContent />
            )}
          </div>
        </div>
      </div>
      
      <ChatHelper />
    </div>
  );
}
