import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';
import { X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [remember, setRemember] = useState(false);
  const { login, loading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKey.trim()) return;
    
    const success = await login(apiKey, remember);
    if (success) {
      setApiKey('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white">Connect to Mindat API</DialogTitle>
          <DialogDescription>
            Enter your API key to access the Mindat API.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-1">
            <Label htmlFor="apiKey" className="text-sm font-medium text-gray-700 dark:text-gray-300">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              className="bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white text-sm rounded-lg"
              placeholder="Enter your Mindat API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              autoComplete="off"
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
                className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer"
              >
                Remember API key
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
          
          <DialogFooter className="pt-4">
            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-indigo-700 text-white"
              disabled={loading}
            >
              {loading ? 'Connecting...' : 'Connect'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
