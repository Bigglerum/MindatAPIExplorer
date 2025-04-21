import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  isAuthenticated: boolean;
  apiKey: string | null;
  login: (apiKey: string, remember: boolean) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  apiKey: null,
  login: async () => false,
  logout: () => {},
  loading: false
});

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { toast } = useToast();

  useEffect(() => {
    // Check for saved API key in localStorage
    const savedApiKey = localStorage.getItem('mindat_api_key');
    if (savedApiKey) {
      validateApiKey(savedApiKey)
        .then(valid => {
          if (valid) {
            setApiKey(savedApiKey);
            setIsAuthenticated(true);
          } else {
            localStorage.removeItem('mindat_api_key');
          }
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const validateApiKey = async (key: string): Promise<boolean> => {
    try {
      // Request a simple API call to validate the key
      const response = await fetch('/api/validate-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey: key }),
      });
      
      return response.ok;
    } catch (error) {
      console.error('Failed to validate API key:', error);
      return false;
    }
  };

  const login = async (key: string, remember: boolean): Promise<boolean> => {
    setLoading(true);
    try {
      const isValid = await validateApiKey(key);
      
      if (isValid) {
        setApiKey(key);
        setIsAuthenticated(true);
        
        if (remember) {
          localStorage.setItem('mindat_api_key', key);
        }
        
        toast({
          title: "Authentication successful",
          description: "You're now connected to the Mindat API",
        });
        
        return true;
      } else {
        toast({
          title: "Authentication failed",
          description: "Invalid API key. Please check and try again.",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      toast({
        title: "Authentication error",
        description: "Failed to connect to the Mindat API",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setApiKey(null);
    setIsAuthenticated(false);
    localStorage.removeItem('mindat_api_key');
    toast({
      title: "Logged out",
      description: "You've been disconnected from the Mindat API",
    });
  };

  return React.createElement(
    AuthContext.Provider,
    { value: { isAuthenticated, apiKey, login, logout, loading } },
    children
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
