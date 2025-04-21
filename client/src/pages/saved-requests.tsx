import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import Header from '@/components/layout/header';
import Sidebar from '@/components/layout/sidebar';
import ChatHelper from '@/components/chat/chat-helper';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useApiDocs } from '@/hooks/use-api-docs';
import { SavedRequest } from '@/types/api';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Play, 
  Trash2,
  BookOpen, 
  Search,
  Calendar 
} from 'lucide-react';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { formatDistanceToNow } from 'date-fns';

export default function SavedRequests() {
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { savedRequests, savedRequestsLoading, deleteSavedRequest } = useApiDocs();
  const [deleteRequestId, setDeleteRequestId] = useState<number | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, authLoading, navigate]);

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  const handleDeleteRequest = (id: number) => {
    setDeleteRequestId(id);
  };

  const confirmDelete = async () => {
    if (deleteRequestId) {
      await deleteSavedRequest.mutateAsync(deleteRequestId);
      setDeleteRequestId(null);
    }
  };

  const loadRequest = (request: SavedRequest) => {
    // Navigate to explorer and load the saved request
    navigate('/explorer');
    // Additional logic would be implemented to load the specific request
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
            <Tabs defaultValue="saved-requests" className="w-full">
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
                  onClick={() => navigate('/knowledge-base')}
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
            </Tabs>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold">Saved Requests</h1>
              <Button 
                variant="outline" 
                onClick={() => navigate('/explorer')}
              >
                <Search className="h-4 w-4 mr-2" />
                Explore New Endpoints
              </Button>
            </div>
            
            {savedRequestsLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : !savedRequests || savedRequests.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                <BookOpen className="h-12 w-12 mx-auto text-gray-400" />
                <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">No saved requests</h2>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  Save API requests for quick access later
                </p>
                <Button 
                  className="mt-4" 
                  onClick={() => navigate('/explorer')}
                >
                  Go to Explorer
                </Button>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[300px]">Name</TableHead>
                      <TableHead>Endpoint</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {savedRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">{request.name}</TableCell>
                        <TableCell>{request.endpoint?.path || 'Unknown endpoint'}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                            request.endpoint?.method.toUpperCase() === 'GET' 
                              ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300'
                              : request.endpoint?.method.toUpperCase() === 'POST'
                              ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300'
                          }`}>
                            {request.endpoint?.method.toUpperCase() || 'UNKNOWN'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1 text-gray-500" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => loadRequest(request)}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDeleteRequest(request.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <ChatHelper />
      
      <AlertDialog open={!!deleteRequestId} onOpenChange={() => setDeleteRequestId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this saved request.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
