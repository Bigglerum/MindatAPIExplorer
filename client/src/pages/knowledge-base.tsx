import { useState } from 'react';
import { useLocation } from 'wouter';
import Header from '@/components/layout/header';
import Sidebar from '@/components/layout/sidebar';
import ChatHelper from '@/components/chat/chat-helper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { CrystalClassTable } from '@/components/knowledge-base/crystal-class-table';

export default function KnowledgeBase() {
  const [, navigate] = useLocation();
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [activeSection, setActiveSection] = useState<string>('overview');

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'crystal-classes':
        return <CrystalClassTable />;
      default:
        return (
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
        );
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <Header toggleSidebar={toggleSidebar} />
      
      <div className="flex flex-1 overflow-hidden">
        {/* On mobile, position sidebar with lower z-index so it doesn't cover main content */}
        <div className="lg:relative">
          <Sidebar 
            visible={sidebarVisible} 
            activeEndpoint={null} 
            setActiveEndpoint={() => {}} 
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
        
        <div className="flex-1 overflow-hidden flex flex-col z-10 relative lg:z-0">
          <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
            <Tabs defaultValue="knowledge-base" className="w-full">
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
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Sidebar navigation */}
                <div className="md:col-span-1">
                  <Card>
                    <CardHeader>
                      <CardTitle>Topics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <nav>
                        <ul className="space-y-2">
                          <li>
                            <button 
                              onClick={() => setActiveSection('overview')}
                              className={`text-left w-full px-2 py-1.5 rounded ${activeSection === 'overview' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                            >
                              Overview
                            </button>
                          </li>
                          <li>
                            <button 
                              onClick={() => setActiveSection('crystal-classes')}
                              className={`text-left w-full px-2 py-1.5 rounded ${activeSection === 'crystal-classes' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                            >
                              Crystal Classes
                            </button>
                          </li>
                          <li>
                            <button 
                              onClick={() => setActiveSection('mineral-data')}
                              className={`text-left w-full px-2 py-1.5 rounded ${activeSection === 'mineral-data' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                            >
                              Mineral Data Fields
                            </button>
                          </li>
                          <li>
                            <button 
                              onClick={() => setActiveSection('locality-data')}
                              className={`text-left w-full px-2 py-1.5 rounded ${activeSection === 'locality-data' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                            >
                              Locality Data Fields
                            </button>
                          </li>
                        </ul>
                      </nav>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Main content area */}
                <div className="md:col-span-3">
                  {renderContent()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <ChatHelper />
    </div>
  );
}
