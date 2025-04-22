import { useState } from 'react';
import { APIResponse } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Copy, CheckCircle2 } from 'lucide-react';

interface ResponsePanelProps {
  response: APIResponse | null;
  loading: boolean;
}

export function ResponsePanel({ response, loading }: ResponsePanelProps) {
  const [activeTab, setActiveTab] = useState('json');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!response) return;
    
    try {
      await navigator.clipboard.writeText(JSON.stringify(response.data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-green-500';
    if (status >= 300 && status < 400) return 'text-yellow-500';
    if (status >= 400) return 'text-red-500';
    return 'text-gray-500';
  };

  return (
    <div className="w-full md:w-1/2 overflow-y-auto flex flex-col">
      <div className="p-3 sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-medium text-gray-800 dark:text-gray-200">Response</h3>
          {response && (
            <div className="flex items-center space-x-2">
              <span className={`text-xs ${getStatusColor(response.status)} font-medium flex items-center`}>
                <span className={`inline-block w-2 h-2 rounded-full mr-1 ${getStatusColor(response.status)}`}></span>
                {response.status} {response.statusText}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{response.duration}ms</span>
            </div>
          )}
        </div>
        
        {loading ? (
          <div className="space-y-4">
            <div className="border-b border-gray-200 dark:border-slate-700 mb-4">
              <Skeleton className="h-8 w-20 mb-2" />
            </div>
            <Skeleton className="h-96 w-full rounded-lg" />
          </div>
        ) : !response ? (
          <div className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              Send a request to see the response here
            </p>
          </div>
        ) : (
          <>
            <Tabs defaultValue="json" value={activeTab} onValueChange={setActiveTab}>
              <div className="border-b border-gray-200 dark:border-slate-700 mb-4">
                <TabsList className="bg-transparent w-full justify-start">
                  <TabsTrigger value="json" className="px-2 sm:px-4 py-2 text-sm data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none flex-1 sm:flex-initial">
                    JSON
                  </TabsTrigger>
                  <TabsTrigger value="headers" className="px-2 sm:px-4 py-2 text-sm data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none flex-1 sm:flex-initial">
                    Headers
                  </TabsTrigger>
                  <TabsTrigger value="preview" className="px-2 sm:px-4 py-2 text-sm data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none flex-1 sm:flex-initial">
                    Preview
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="json" className="relative mt-0">
                <div className="relative">
                  <pre className="font-mono text-xs bg-slate-800 text-white p-4 rounded-lg overflow-x-auto h-96">
                    {JSON.stringify(response.data, null, 2)}
                  </pre>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600 text-white p-1 rounded"
                    onClick={handleCopy}
                  >
                    {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="headers" className="mt-0">
                <div className="bg-slate-800 rounded-lg p-4 text-white font-mono text-xs h-96 overflow-y-auto">
                  {Object.entries(response.headers).map(([key, value]) => (
                    <div key={key} className="mb-1">
                      <span className="text-emerald-400">{key}:</span> {value}
                    </div>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="preview" className="mt-0">
                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4 h-96 overflow-y-auto">
                  {/* Render a user-friendly representation of the data */}
                  {response.data && typeof response.data === 'object' ? (
                    Array.isArray(response.data.results) ? (
                      <div className="space-y-4">
                        {/* Results with pagination */}
                        <div className="text-sm mb-2">
                          {response.data.count !== undefined && (
                            <span className="text-gray-600 dark:text-gray-400">
                              Total: {response.data.count} items
                            </span>
                          )}
                        </div>
                        
                        {response.data.results.map((item: any, index: number) => (
                          <div key={index} className="border border-gray-200 dark:border-slate-700 rounded-lg p-3">
                            {Object.entries(item).map(([key, value]) => (
                              <div key={key} className="grid grid-cols-3 gap-2 mb-1">
                                <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">{key}:</span>
                                <span className="text-sm col-span-2">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {/* Single object */}
                        {Object.entries(response.data).map(([key, value]) => (
                          <div key={key} className="grid grid-cols-3 gap-2 mb-1">
                            <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">{key}:</span>
                            <span className="text-sm col-span-2">
                              {typeof value === 'object'
                                ? JSON.stringify(value)
                                : String(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )
                  ) : (
                    <pre className="text-sm">{JSON.stringify(response.data, null, 2)}</pre>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}
