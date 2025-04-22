import React from 'react';

export function KnowledgeBaseContent() {
  return (
    <div className="flex-1 overflow-auto flex flex-col md:flex-row h-full">
      <div className="w-full overflow-y-auto p-6">
        <h2 className="text-2xl font-bold mb-4">API Knowledge Base</h2>
        <p>Browse comprehensive documentation and guides for the Mindat API.</p>
        
        {/* This would be expanded with actual knowledge base content */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-4">
            <h3 className="text-lg font-medium mb-2">Getting Started</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Learn the basics of connecting to and using the Mindat API.
            </p>
          </div>
          <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-4">
            <h3 className="text-lg font-medium mb-2">Authentication</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Learn how to authenticate with the API using your API key.
            </p>
          </div>
          
          {/* Add more content to make it scrollable */}
          <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-4">
            <h3 className="text-lg font-medium mb-2">Response Formats</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Understanding the JSON structures returned by the API.
            </p>
          </div>
          <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-4">
            <h3 className="text-lg font-medium mb-2">Error Handling</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              How to handle errors and status codes from the API.
            </p>
          </div>
          <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-4">
            <h3 className="text-lg font-medium mb-2">Pagination</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Working with paginated responses for large datasets.
            </p>
          </div>
          <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-4">
            <h3 className="text-lg font-medium mb-2">Filtering & Sorting</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Advanced query parameters for filtering and sorting results.
            </p>
          </div>
          <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-4">
            <h3 className="text-lg font-medium mb-2">Rate Limits</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Understanding API rate limits and throttling.
            </p>
          </div>
          <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-4">
            <h3 className="text-lg font-medium mb-2">Webhooks</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Setting up webhooks for real-time data updates.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}