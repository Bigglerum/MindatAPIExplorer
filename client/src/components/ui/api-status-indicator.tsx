import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon, AlertTriangleIcon, CheckCircleIcon } from "lucide-react";
import { checkApiAvailability } from '@/lib/mindat-service';

/**
 * Status indicator for the Mindat API
 * Shows whether the API is available or experiencing issues
 */
export function ApiStatusIndicator() {
  const [status, setStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const isAvailable = await checkApiAvailability();
        setStatus(isAvailable ? 'available' : 'unavailable');
        
        if (!isAvailable) {
          setError('The Mindat API is currently unavailable. This may affect search results and data retrieval.');
        }
      } catch (err) {
        setStatus('unavailable');
        setError('Error checking API status. The Mindat API may be unavailable.');
      }
    };
    
    checkStatus();
    
    // Check API status every 5 minutes
    const interval = setInterval(checkStatus, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  if (status === 'checking') {
    return (
      <Alert className="bg-blue-50 border-blue-100">
        <InfoIcon className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-700">Checking API Status</AlertTitle>
        <AlertDescription className="text-blue-600">
          Verifying connection to the Mindat API...
        </AlertDescription>
      </Alert>
    );
  }
  
  if (status === 'unavailable') {
    return (
      <Alert className="bg-amber-50 border-amber-100">
        <AlertTriangleIcon className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-700">API Connectivity Issue</AlertTitle>
        <AlertDescription className="text-amber-600">
          {error || 'The Mindat API is currently unavailable. This may affect search results and data retrieval.'}
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <Alert className="bg-green-50 border-green-100">
      <CheckCircleIcon className="h-4 w-4 text-green-600" />
      <AlertTitle className="text-green-700">API Connected</AlertTitle>
      <AlertDescription className="text-green-600">
        Successfully connected to the Mindat API.
      </AlertDescription>
    </Alert>
  );
}