import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import Header from '@/components/layout/header';
import Sidebar from '@/components/layout/sidebar';
import { ApiExplorer } from '@/components/explorer/api-explorer';
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
        <Sidebar 
          visible={sidebarVisible} 
          activeEndpoint={activeEndpoint} 
          setActiveEndpoint={setActiveEndpoint} 
        />
        
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
            <Tabs 
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="bg-transparent h-auto">
                <TabsTrigger 
                  value="explorer"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-4 py-3"
                >
                  API Explorer
                </TabsTrigger>
                <TabsTrigger 
                  value="knowledge-base"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-4 py-3"
                >
                  Knowledge Base
                </TabsTrigger>
                <TabsTrigger 
                  value="saved-requests"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-4 py-3"
                >
                  Saved Requests
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="explorer" className="mt-0 flex-1 overflow-hidden">
                <ApiExplorer endpoint={activeEndpoint} />
              </TabsContent>
              
              <TabsContent value="knowledge-base" className="mt-0">
                <div className="p-6">
                  <h2 className="text-2xl font-bold mb-4">API Knowledge Base</h2>
                  <p>Browse comprehensive documentation and guides for the Mindat API.</p>
                  
                  {/* This would be expanded with actual knowledge base content */}
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-4">
                      <h3 className="text-lg font-medium mb-2">Getting Started</h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        Learn the basics of connecting to and using the Mindat API.
                      </p>
                    </div>
                    <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-4">
                      <h3 className="text-lg font-medium mb-2">Authentication</h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        Learn how to authenticate with the API using your API key.
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="saved-requests" className="mt-0">
                <div className="p-6">
                  <h2 className="text-2xl font-bold mb-4">Saved Requests</h2>
                  <p>Access your saved API requests for quick reference.</p>
                  
                  {/* This would be populated with saved requests */}
                  <div className="mt-6">
                    <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                      <p>You haven't saved any requests yet.</p>
                      <p className="mt-2 text-sm">Save a request by clicking the "Save Request" button in the explorer.</p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
      
      <ChatHelper />
    </div>
  );
}
