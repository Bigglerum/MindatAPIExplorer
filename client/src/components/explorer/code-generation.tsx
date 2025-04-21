import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useApiDocs } from '@/hooks/use-api-docs';
import { APIEndpoint } from '@/types/api';
import { Copy, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

interface CodeGenerationProps {
  endpoint: APIEndpoint;
  parameters: Record<string, any>;
}

export function CodeGeneration({ endpoint, parameters }: CodeGenerationProps) {
  const [language, setLanguage] = useState<string>('python');
  const [code, setCode] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const { generateCode } = useApiDocs();
  const { apiKey } = useAuth();

  useEffect(() => {
    generateCodeSample();
  }, [endpoint, parameters, language]);

  const generateCodeSample = async () => {
    try {
      const sampleCode = await generateCode(endpoint, parameters, language);
      setCode(sampleCode);
    } catch (error) {
      console.error('Failed to generate code sample:', error);
      setCode(`# Error generating code sample`);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };
  
  const getLanguageSpecificCode = () => {
    const url = `https://api.mindat.org${endpoint.path}`;
    const queryParams = Object.entries(parameters)
      .filter(([_, value]) => value !== undefined && value !== '')
      .map(([key, value]) => `    "${key}": ${JSON.stringify(value)}`);
    
    const maskedApiKey = apiKey ? `${apiKey.substring(0, 3)}...${apiKey.substring(apiKey.length - 3)}` : 'YOUR_API_KEY';
    
    switch (language) {
      case 'python':
        return `import requests

url = "${url}"
headers = {
    "Authorization": "Token ${maskedApiKey}",
    "Content-Type": "application/json"
}
params = {
${queryParams.join(',\n')}
}

response = requests.${endpoint.method.toLowerCase()}(url, headers=headers, ${endpoint.method.toLowerCase() === 'get' ? 'params=params' : 'json=params'})
data = response.json()

print(data)`;

      case 'javascript':
        return `// Using fetch API
const url = "${url}";
const headers = {
    "Authorization": "Token ${maskedApiKey}",
    "Content-Type": "application/json"
};

${endpoint.method.toLowerCase() === 'get' ? 
`// Create query string
const queryParams = new URLSearchParams();
${Object.entries(parameters)
  .filter(([_, value]) => value !== undefined && value !== '')
  .map(([key, value]) => `queryParams.append("${key}", ${JSON.stringify(value)});`)
  .join('\n')}

fetch(\`\${url}?\${queryParams.toString()}\`, {
    method: "${endpoint.method.toUpperCase()}",
    headers
})` : 
`fetch(url, {
    method: "${endpoint.method.toUpperCase()}",
    headers,
    body: JSON.stringify({
${queryParams.join(',\n')}
    })
})`}
    .then(response => response.json())
    .then(data => console.log(data))
    .catch(error => console.error('Error:', error));`;

      case 'curl':
        return `curl -X ${endpoint.method.toUpperCase()} \\
  "${url}${endpoint.method.toLowerCase() === 'get' && Object.keys(parameters).length ? 
    '?' + Object.entries(parameters)
      .filter(([_, value]) => value !== undefined && value !== '')
      .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
      .join('&') : ''}" \\
  -H "Authorization: Token ${maskedApiKey}" \\
  -H "Content-Type: application/json"${endpoint.method.toLowerCase() !== 'get' && Object.keys(parameters).length ? 
    ` \\
  -d '${JSON.stringify(parameters, null, 2)}'` : ''}`;

      default:
        return '# Select a language to generate code';
    }
  };

  return (
    <div className="mb-6">
      <h3 className="font-medium mb-3 text-gray-800 dark:text-gray-200">Code Generation</h3>
      
      <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-3">
          <Button
            variant={language === 'python' ? 'default' : 'outline'}
            size="sm"
            className={language === 'python' ? 'bg-secondary hover:bg-cyan-700 text-white' : ''}
            onClick={() => setLanguage('python')}
          >
            Python
          </Button>
          <Button
            variant={language === 'javascript' ? 'default' : 'outline'}
            size="sm"
            className={language === 'javascript' ? 'bg-secondary hover:bg-cyan-700 text-white' : ''}
            onClick={() => setLanguage('javascript')}
          >
            JavaScript
          </Button>
          <Button
            variant={language === 'curl' ? 'default' : 'outline'}
            size="sm"
            className={language === 'curl' ? 'bg-secondary hover:bg-cyan-700 text-white' : ''}
            onClick={() => setLanguage('curl')}
          >
            cURL
          </Button>
        </div>
        
        <div className="relative">
          <pre className="font-mono text-xs bg-slate-800 text-white p-4 rounded-lg overflow-x-auto">
            {getLanguageSpecificCode()}
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
      </div>
    </div>
  );
}
