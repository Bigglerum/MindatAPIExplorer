import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import Header from '@/components/layout/header';
import Sidebar from '@/components/layout/sidebar';
import ChatHelper from '@/components/chat/chat-helper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

export default function KnowledgeBase() {
  const [, navigate] = useLocation();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [sidebarVisible, setSidebarVisible] = useState(true);
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, authLoading, navigate]);

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  if (authLoading) {
    return <div className="flex justify-center items-center h-screen">
      <Skeleton className="h-12 w-12 rounded-full" />
    </div>;
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  return (
    <div className="flex flex-col h-screen">
      <Header toggleSidebar={toggleSidebar} />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          visible={sidebarVisible} 
          activeEndpoint={null} 
          setActiveEndpoint={() => {}} 
        />
        
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
            <Tabs defaultValue="explorer" className="w-full">
              <TabsList className="bg-transparent h-auto">
                <TabsTrigger 
                  value="explorer"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-4 py-3"
                  onClick={() => navigate('/explorer')}
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
                  onClick={() => navigate('/saved-requests')}
                >
                  Saved Requests
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <div className="container mx-auto p-6">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">API Knowledge Base</h1>
                <div className="relative w-64">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-500 dark:text-gray-400">
                    <Search className="h-4 w-4" />
                  </div>
                  <Input
                    type="search"
                    className="pl-10"
                    placeholder="Search knowledge base..."
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Getting Started</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      <li className="text-blue-600 dark:text-blue-400 hover:underline">
                        <a href="#">Introduction to the Mindat API</a>
                      </li>
                      <li className="text-blue-600 dark:text-blue-400 hover:underline">
                        <a href="#">Authentication</a>
                      </li>
                      <li className="text-blue-600 dark:text-blue-400 hover:underline">
                        <a href="#">Rate Limits</a>
                      </li>
                      <li className="text-blue-600 dark:text-blue-400 hover:underline">
                        <a href="#">Error Handling</a>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Endpoints Reference</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      <li className="text-blue-600 dark:text-blue-400 hover:underline">
                        <a href="#">Minerals</a>
                      </li>
                      <li className="text-blue-600 dark:text-blue-400 hover:underline">
                        <a href="#">Locations</a>
                      </li>
                      <li className="text-blue-600 dark:text-blue-400 hover:underline">
                        <a href="#">Images</a>
                      </li>
                      <li className="text-blue-600 dark:text-blue-400 hover:underline">
                        <a href="#">Search</a>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Tutorials</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      <li className="text-blue-600 dark:text-blue-400 hover:underline">
                        <a href="#">Fetching Mineral Data</a>
                      </li>
                      <li className="text-blue-600 dark:text-blue-400 hover:underline">
                        <a href="#">Working with Locations</a>
                      </li>
                      <li className="text-blue-600 dark:text-blue-400 hover:underline">
                        <a href="#">Advanced Search Techniques</a>
                      </li>
                      <li className="text-blue-600 dark:text-blue-400 hover:underline">
                        <a href="#">Handling Pagination</a>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <ChatHelper />
    </div>
  );
}
