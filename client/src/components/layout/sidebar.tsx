import { useState, useEffect } from 'react';
import { useApiDocs } from '@/hooks/use-api-docs';
import { APICategory, APIEndpoint } from '@/types/api';
import { Input } from '@/components/ui/input';
import { Search, ChevronDown, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface SidebarProps {
  visible: boolean;
  activeEndpoint: APIEndpoint | null;
  setActiveEndpoint: (endpoint: APIEndpoint) => void;
}

export default function Sidebar({ visible, activeEndpoint, setActiveEndpoint }: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [filteredCategories, setFilteredCategories] = useState<APICategory[]>([]);
  const { categories, categoriesLoading } = useApiDocs();

  // Initialize all categories as expanded
  useEffect(() => {
    if (categories) {
      const initialExpanded: Record<string, boolean> = {};
      categories.forEach(category => {
        initialExpanded[category.name] = true;
      });
      setExpandedCategories(initialExpanded);
    }
  }, [categories]);

  // Filter endpoints based on search query
  useEffect(() => {
    if (!categories) return;
    
    if (!searchQuery.trim()) {
      setFilteredCategories(categories);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = categories.map(category => {
      // Filter endpoints within this category
      const filteredEndpoints = category.endpoints.filter(endpoint => 
        endpoint.path.toLowerCase().includes(query) || 
        endpoint.method.toLowerCase().includes(query) || 
        (endpoint.summary && endpoint.summary.toLowerCase().includes(query))
      );
      
      // Return a new category object with filtered endpoints
      return {
        ...category,
        endpoints: filteredEndpoints
      };
    }).filter(category => category.endpoints.length > 0);
    
    setFilteredCategories(filtered);
    
    // Auto-expand categories that have matching results
    const newExpandedState = { ...expandedCategories };
    filtered.forEach(category => {
      newExpandedState[category.name] = true;
    });
    setExpandedCategories(newExpandedState);
  }, [searchQuery, categories]);

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryName]: !prev[categoryName]
    }));
  };

  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300';
      case 'POST':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300';
      case 'PUT':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300';
      case 'DELETE':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300';
      case 'PATCH':
        return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-300';
      default:
        return 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-300';
    }
  };

  const isActiveEndpoint = (endpoint: APIEndpoint) => {
    return activeEndpoint && activeEndpoint.id === endpoint.id;
  };

  return (
    <aside 
      className={`w-[280px] sm:w-64 lg:w-80 fixed lg:static border-r border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex-shrink-0 overflow-y-auto transition-all duration-300 h-full z-30 ${
        visible ? '' : '-translate-x-full lg:translate-x-0'
      }`}
    >
      <div className="p-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-500 dark:text-gray-400">
            <Search className="h-4 w-4" />
          </div>
          <Input
            type="text"
            className="bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white text-sm rounded-lg w-full pl-10 p-2.5"
            placeholder="Search API endpoints..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      {/* API Categories */}
      <div className="px-4 pb-4">
        {categoriesLoading ? (
          // Loading skeleton
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="mb-4">
              <Skeleton className="h-10 w-full rounded-lg mb-2" />
              <div className="pl-2 space-y-2">
                {Array(3).fill(0).map((_, j) => (
                  <Skeleton key={j} className="h-8 w-full rounded-md" />
                ))}
              </div>
            </div>
          ))
        ) : (
          filteredCategories?.map((category) => (
            <div key={category.id} className="mb-4">
              <div 
                className="flex items-center justify-between cursor-pointer py-2 px-3 bg-gray-100 dark:bg-slate-700 rounded-lg mb-2"
                onClick={() => toggleCategory(category.name)}
              >
                <h3 className="font-medium">{category.name}</h3>
                {expandedCategories[category.name] ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
              {expandedCategories[category.name] && (
                <div className="pl-2">
                  {category.endpoints.map((endpoint) => (
                    <div
                      key={endpoint.id}
                      className={`flex items-center py-2 px-3 rounded-md text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 mb-1 border-l-2 ${
                        isActiveEndpoint(endpoint)
                          ? 'border-primary bg-indigo-50 dark:bg-slate-700'
                          : 'border-transparent hover:border-primary'
                      }`}
                      onClick={() => setActiveEndpoint(endpoint)}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center">
                          <span className={`${getMethodColor(endpoint.method)} text-xs px-1.5 py-0.5 rounded-md mr-2`}>
                            {endpoint.method.toUpperCase()}
                          </span>
                          <span>{endpoint.summary || endpoint.path}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
