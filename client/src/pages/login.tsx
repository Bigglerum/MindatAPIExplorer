import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function Login() {
  const [apiKey, setApiKey] = useState('');
  const [remember, setRemember] = useState(false);
  const { login, loading } = useAuth();
  const [, navigate] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKey.trim()) return;
    
    const success = await login(apiKey, remember);
    if (success) {
      navigate('/explorer');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-center space-x-3 mb-4">
            <span className="text-primary text-3xl font-bold">Mindat</span>
            <span className="text-secondary text-xl font-semibold">API Explorer</span>
          </div>
          <CardTitle className="text-center">Connect to API</CardTitle>
          <CardDescription className="text-center">
            Enter your API key to access the Mindat API
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Mindat API key"
                required
                autoComplete="off"
                autoFocus
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="remember" 
                  checked={remember}
                  onCheckedChange={(checked) => setRemember(checked as boolean)}
                />
                <Label 
                  htmlFor="remember" 
                  className="text-sm cursor-pointer"
                >
                  Remember my API key
                </Label>
              </div>
              <a 
                href="https://api.mindat.org" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-sm text-secondary hover:underline"
              >
                Get API key
              </a>
            </div>
          </form>
        </CardContent>
        <CardFooter>
          <Button 
            className="w-full bg-primary hover:bg-indigo-700"
            onClick={handleSubmit}
            disabled={loading || !apiKey.trim()}
          >
            {loading ? 'Connecting...' : 'Connect to API'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
