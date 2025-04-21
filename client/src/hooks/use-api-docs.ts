import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { APICategory, APIEndpoint, SavedRequest } from '@/types/api';
import { useToast } from '@/hooks/use-toast';

export function useApiDocs() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get all API categories and endpoints
  const {
    data: categories,
    isLoading: categoriesLoading,
    error: categoriesError
  } = useQuery({
    queryKey: ['/api/docs/categories'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Get a single endpoint by ID
  const getEndpoint = (endpointId: number) => {
    return useQuery({
      queryKey: ['/api/docs/endpoints', endpointId],
      enabled: !!endpointId,
    });
  };

  // Search endpoints
  const searchEndpoints = (query: string) => {
    return useQuery({
      queryKey: ['/api/docs/search', query],
      enabled: query.length >= 2,
    });
  };

  // Get saved requests
  const {
    data: savedRequests,
    isLoading: savedRequestsLoading,
    error: savedRequestsError
  } = useQuery({
    queryKey: ['/api/saved-requests'],
  });

  // Send API request
  const sendRequest = useMutation({
    mutationFn: async ({ endpoint, parameters }: { endpoint: APIEndpoint, parameters: Record<string, any> }) => {
      const response = await apiRequest('POST', '/api/proxy', {
        path: endpoint.path,
        method: endpoint.method,
        parameters,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Request sent successfully",
        description: "API response received"
      });
    },
    onError: (error) => {
      toast({
        title: "Request failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Save a request
  const saveRequest = useMutation({
    mutationFn: async ({ name, endpoint, parameters }: { name: string, endpoint: APIEndpoint, parameters: Record<string, any> }) => {
      const response = await apiRequest('POST', '/api/saved-requests', {
        name,
        endpointId: endpoint.id,
        parameters,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saved-requests'] });
      toast({
        title: "Request saved",
        description: "Your API request has been saved"
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to save request",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Delete a saved request
  const deleteSavedRequest = useMutation({
    mutationFn: async (requestId: number) => {
      const response = await apiRequest('DELETE', `/api/saved-requests/${requestId}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saved-requests'] });
      toast({
        title: "Request deleted",
        description: "Your saved request has been deleted"
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete request",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Generate code for an endpoint
  const generateCode = async (endpoint: APIEndpoint, parameters: Record<string, any>, language: string) => {
    try {
      const response = await apiRequest('POST', '/api/generate-code', {
        endpoint,
        parameters,
        language
      });
      const data = await response.json();
      return data.code;
    } catch (error) {
      toast({
        title: "Code generation failed",
        description: "Unable to generate code sample",
        variant: "destructive"
      });
      throw error;
    }
  };

  return {
    categories: categories as APICategory[],
    categoriesLoading,
    categoriesError,
    getEndpoint,
    searchEndpoints,
    savedRequests: savedRequests as SavedRequest[],
    savedRequestsLoading,
    savedRequestsError,
    sendRequest,
    saveRequest,
    deleteSavedRequest,
    generateCode
  };
}
