import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';

export default function Home() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        <div className="flex items-center space-x-3 mb-6">
          <span className="text-primary text-5xl font-bold">Mindat</span>
          <span className="text-secondary text-3xl font-semibold">API Explorer</span>
        </div>

        <h1 className="text-4xl font-bold mb-6 text-gray-900 dark:text-white">
          Explore and Learn the Mindat API
        </h1>
        
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mb-8">
          A self-service application to explore, learn, and generate code for the Mindat API based on Swagger documentation.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            size="lg"
            className="bg-primary hover:bg-indigo-700 text-white text-lg px-8"
            onClick={() => navigate('/explorer')}
          >
            Get Started
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="text-lg px-8"
            onClick={() => navigate('/knowledge-base')}
          >
            Learn More
          </Button>
          <Button
            variant="secondary"
            size="lg"
            className="text-lg px-8"
            onClick={() => navigate('/search')}
          >
            Direct Search
          </Button>
        </div>
      </div>
      
      <div className="bg-white dark:bg-slate-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-indigo-100 dark:bg-indigo-900 text-primary mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">API Documentation</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Access comprehensive documentation for all Mindat API endpoints.
              </p>
            </div>
            
            <div className="text-center">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-indigo-100 dark:bg-indigo-900 text-primary mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">Code Generation</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Generate ready-to-use code snippets in Python, JavaScript, and more.
              </p>
            </div>
            
            <div className="text-center">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-indigo-100 dark:bg-indigo-900 text-primary mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">Interactive Chat</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Get assistance with API usage through our interactive chat helper.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <footer className="bg-gray-100 dark:bg-slate-850 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-600 dark:text-gray-400 text-sm">
          <p>
            This API Explorer is designed to help you explore and learn the Mindat API. Learn more about the Mindat database at{' '}
            <a 
              href="https://www.mindat.org" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-primary hover:underline"
            >
              mindat.org
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
