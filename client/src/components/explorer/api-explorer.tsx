import { useState, useEffect } from 'react';
import { RequestPanel } from './request-panel';
import { ResponsePanel } from './response-panel';
import { APIEndpoint, APIResponse } from '@/types/api';
import { useApiDocs } from '@/hooks/use-api-docs';
import { useAuth } from '@/hooks/use-auth';
import { executeApiRequest } from '@/lib/api-client';

interface ApiExplorerProps {
  endpoint: APIEndpoint | null;
}

export function ApiExplorer({ endpoint }: ApiExplorerProps) {
  const [parameters, setParameters] = useState<Record<string, any>>({});
  const [response, setResponse] = useState<APIResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const { apiKey } = useAuth();
  const { generateCode } = useApiDocs();

  // Reset parameters when endpoint changes
  useEffect(() => {
    setParameters({});
    setResponse(null);
  }, [endpoint]);

  const handleParameterChange = (name: string, value: any) => {
    setParameters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSendRequest = async () => {
    if (!endpoint || !apiKey) return;
    
    setLoading(true);
    const startTime = Date.now();
    
    try {
      const data = await executeApiRequest(
        endpoint.path,
        endpoint.method,
        parameters,
        apiKey
      );
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      setResponse({
        status: 200,
        statusText: 'OK',
        headers: {
          'Content-Type': 'application/json'
        },
        data,
        duration
      });
    } catch (error: any) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      setResponse({
        status: error.status || 500,
        statusText: error.statusText || 'Error',
        headers: {},
        data: { error: error.message },
        duration
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRequest = async () => {
    // Handled by the RequestPanel component
  };

  if (!endpoint) {
    return (
      <div className="flex-1 overflow-auto flex items-center justify-center">
        <div className="text-center p-8">
          <h2 className="text-2xl font-bold mb-2">Select an API Endpoint</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Choose an endpoint from the sidebar to start exploring the Mindat API
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto flex flex-col md:flex-row h-full">
      <RequestPanel
        endpoint={endpoint}
        parameters={parameters}
        onParameterChange={handleParameterChange}
        onSendRequest={handleSendRequest}
        onSaveRequest={handleSaveRequest}
        loading={loading}
      />
      <ResponsePanel
        response={response}
        loading={loading}
      />
    </div>
  );
}
