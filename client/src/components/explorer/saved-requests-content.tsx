import React from 'react';

export function SavedRequestsContent() {
  return (
    <div className="flex-1 overflow-auto flex flex-col md:flex-row h-full">
      <div className="w-full overflow-y-auto p-6">
        <h2 className="text-2xl font-bold mb-4">Saved Requests</h2>
        <p>Access your saved API requests for quick reference.</p>
        
        {/* This would be populated with saved requests */}
        <div className="mt-6">
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <p>You haven't saved any requests yet.</p>
            <p className="mt-2 text-sm">Save a request by clicking the "Save Request" button in the explorer.</p>
          </div>
          
          {/* Placeholder content to demonstrate scrolling */}
          <div className="mt-8 border-t border-gray-200 dark:border-slate-700 pt-8">
            <h3 className="text-lg font-bold mb-4">Example Saved Requests</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Here are some examples of what saved requests will look like:
            </p>
            
            {[1, 2, 3, 4, 5].map((i) => (
              <div 
                key={i} 
                className="mb-4 border border-gray-200 dark:border-slate-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium">Example Request {i}</h4>
                  <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 rounded">GET</span>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                  {`A sample request to demonstrate the saved requests feature.`}
                </p>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Saved on {new Date().toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}