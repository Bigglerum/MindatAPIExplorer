import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Search, MapPin, Activity } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest } from '@/lib/queryClient';

// Define types for our API responses
interface MineralData {
  id: number;
  name: string;
  formula: string;
  description?: string;
  ima_status?: string;
  discovery_year?: number;
  url?: string;
}

interface LocalityData {
  id: number;
  name: string;
  latitude?: number;
  longitude?: number;
  location_type?: string;
  country?: string;
  region?: string;
  description?: string;
  url?: string;
}

export default function MindatSearch() {
  const [searchType, setSearchType] = useState<'minerals' | 'localities'>('minerals');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mineralResults, setMineralResults] = useState<MineralData[]>([]);
  const [localityResults, setLocalityResults] = useState<LocalityData[]>([]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a search term');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let endpoint = '';
      let params = {};

      if (searchType === 'minerals') {
        endpoint = '/minerals/search';
        params = { name: searchQuery, limit: 10 };
      } else {
        endpoint = '/localities/search';
        params = { name: searchQuery, limit: 10 };
      }

      const response = await apiRequest('POST', '/api/proxy', {
        path: endpoint,
        method: 'GET',
        parameters: params
      });

      const data = await response.json();
      
      if (searchType === 'minerals') {
        setMineralResults(data.data || []);
        setLocalityResults([]);
      } else {
        setLocalityResults(data.data || []);
        setMineralResults([]);
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to perform search. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Search Mindat Database</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="minerals" onValueChange={(value) => setSearchType(value as 'minerals' | 'localities')}>
          <TabsList className="w-full mb-4">
            <TabsTrigger value="minerals" className="w-1/2">Minerals</TabsTrigger>
            <TabsTrigger value="localities" className="w-1/2">Localities</TabsTrigger>
          </TabsList>

          <div className="flex gap-2 mb-4">
            <Input
              placeholder={searchType === 'minerals' ? "Enter mineral name..." : "Enter locality name..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? "Searching..." : "Search"}
              <Search className="ml-2 h-4 w-4" />
            </Button>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <TabsContent value="minerals" className="m-0">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex flex-col space-y-2">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-5/6" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {mineralResults.length > 0 ? (
                  mineralResults.map((mineral) => (
                    <div key={mineral.id} className="border rounded-md p-4">
                      <h3 className="text-lg font-medium">{mineral.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Formula: {mineral.formula || 'Not available'}</p>
                      {mineral.description && (
                        <p className="text-sm mt-2">{mineral.description.substring(0, 200)}...</p>
                      )}
                      {mineral.ima_status && (
                        <div className="mt-2 flex items-center text-xs text-gray-500 dark:text-gray-400">
                          <Activity className="h-3 w-3 mr-1" />
                          IMA Status: {mineral.ima_status}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  !loading && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      {searchQuery ? 'No minerals found matching your search.' : 'Enter a mineral name to search.'}
                    </div>
                  )
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="localities" className="m-0">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex flex-col space-y-2">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-5/6" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {localityResults.length > 0 ? (
                  localityResults.map((locality) => (
                    <div key={locality.id} className="border rounded-md p-4">
                      <h3 className="text-lg font-medium">{locality.name}</h3>
                      <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400">
                        {locality.country && (
                          <span className="mr-3">{locality.country}</span>
                        )}
                        {locality.region && (
                          <span>{locality.region}</span>
                        )}
                      </div>
                      {(locality.latitude && locality.longitude) && (
                        <div className="mt-2 flex items-center text-xs text-gray-500 dark:text-gray-400">
                          <MapPin className="h-3 w-3 mr-1" />
                          Coordinates: {locality.latitude}, {locality.longitude}
                        </div>
                      )}
                      {locality.description && (
                        <p className="text-sm mt-2">{locality.description.substring(0, 200)}...</p>
                      )}
                    </div>
                  ))
                ) : (
                  !loading && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      {searchQuery ? 'No localities found matching your search.' : 'Enter a locality name to search.'}
                    </div>
                  )
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}