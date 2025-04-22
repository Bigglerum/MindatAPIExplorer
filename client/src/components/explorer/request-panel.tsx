import { useState } from 'react';
import { APIEndpoint } from '@/types/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CodeGeneration } from './code-generation';
import { Send, Bookmark } from 'lucide-react';
import { useApiDocs } from '@/hooks/use-api-docs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface RequestPanelProps {
  endpoint: APIEndpoint;
  parameters: Record<string, any>;
  onParameterChange: (name: string, value: any) => void;
  onSendRequest: () => void;
  onSaveRequest: () => void;
  loading: boolean;
}

export function RequestPanel({
  endpoint,
  parameters,
  onParameterChange,
  onSendRequest,
  loading
}: RequestPanelProps) {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [requestName, setRequestName] = useState('');
  const { saveRequest } = useApiDocs();

  const getParameterType = (param: any) => {
    if (!param || !param.schema) return 'string';
    
    const type = param.schema.type;
    if (type === 'integer' || type === 'number') return 'number';
    if (type === 'boolean') return 'checkbox';
    
    return 'string';
  };

  const getParameterPlaceholder = (param: any) => {
    if (!param) return '';
    
    if (param.example) return String(param.example);
    if (param.schema && param.schema.default) return String(param.schema.default);
    
    return '';
  };

  const getMethodBadgeClass = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300';
      case 'POST':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300';
      case 'PUT':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300';
      case 'DELETE':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300';
      default:
        return 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-300';
    }
  };

  const handleSaveRequestConfirm = async () => {
    if (!requestName.trim()) return;
    
    await saveRequest.mutateAsync({
      name: requestName,
      endpoint,
      parameters
    });
    
    setSaveDialogOpen(false);
    setRequestName('');
  };

  return (
    <div className="w-full md:w-1/2 overflow-y-auto border-b md:border-b-0 md:border-r border-gray-200 dark:border-slate-700">
      <div className="p-3 sm:p-5">
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-1">{endpoint.summary || endpoint.path}</h2>
          <div className="flex items-center mb-4">
            <span className={`${getMethodBadgeClass(endpoint.method)} px-2 py-1 rounded-md mr-2 font-medium`}>
              {endpoint.method.toUpperCase()}
            </span>
            <span className="font-mono text-sm text-gray-600 dark:text-gray-300">{endpoint.path}</span>
          </div>
          {endpoint.description && (
            <p className="text-gray-600 dark:text-gray-400 text-sm">{endpoint.description}</p>
          )}
        </div>
        
        {/* Parameters Section */}
        {endpoint.parameters && endpoint.parameters.length > 0 && (
          <div className="mb-6">
            <h3 className="font-medium mb-3 text-gray-800 dark:text-gray-200">
              {endpoint.parameters.some(p => p.in === 'path') ? 'Path Parameters' : 'Query Parameters'}
            </h3>
            
            <div className="space-y-4">
              {endpoint.parameters.map((param) => (
                <div key={param.name} className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="flex items-center">
                        <span className="font-mono text-sm font-medium">{param.name}</span>
                        <span className="ml-2 text-xs px-1.5 py-0.5 bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-300 rounded">
                          {param.schema?.type || 'string'}
                        </span>
                      </div>
                      {param.description && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{param.description}</p>
                      )}
                    </div>
                    <div className="flex items-center">
                      <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">
                        {param.required ? 'Required' : 'Optional'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <Input
                      type={getParameterType(param)}
                      className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white text-sm rounded-lg block w-full p-2.5"
                      placeholder={getParameterPlaceholder(param)}
                      value={parameters[param.name] || ''}
                      onChange={(e) => onParameterChange(param.name, e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Code Generation Section */}
        <CodeGeneration endpoint={endpoint} parameters={parameters} />
        
        {/* Actions */}
        <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <Button
            className="bg-primary hover:bg-indigo-700 text-white w-full sm:w-auto"
            onClick={onSendRequest}
            disabled={loading}
          >
            <Send className="h-4 w-4 mr-2" />
            Send Request
          </Button>
          <Button
            variant="outline"
            className="bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-slate-600 w-full sm:w-auto"
            onClick={() => setSaveDialogOpen(true)}
          >
            <Bookmark className="h-4 w-4 mr-2" />
            Save Request
          </Button>
        </div>
      </div>

      {/* Save Request Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save API Request</DialogTitle>
            <DialogDescription>
              Give this request a name to save it for future use.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Label htmlFor="request-name">Request Name</Label>
            <Input
              id="request-name"
              placeholder="E.g., List Minerals with Pagination"
              value={requestName}
              onChange={(e) => setRequestName(e.target.value)}
              className="mt-1"
            />
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSaveDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveRequestConfirm}
              disabled={!requestName.trim()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
