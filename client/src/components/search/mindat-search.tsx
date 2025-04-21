import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Search, BookOpen, MapPin, Database, AlertOctagon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as MindatService from '@/lib/mindat-service';

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

const mineralSearchSchema = z.object({
  searchType: z.enum(['name', 'formula', 'elements']),
  searchTerm: z.string().min(1, 'Please enter a search term')
});

const localitySearchSchema = z.object({
  searchType: z.enum(['name', 'country', 'region']),
  searchTerm: z.string().min(1, 'Please enter a search term')
});

const quickLookupSchema = z.object({
  lookupType: z.enum(['mineral-formula', 'locality-coordinates']),
  lookupTerm: z.string().min(1, 'Please enter a term to look up')
});

export default function MindatSearch() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('minerals');
  const [minerals, setMinerals] = useState<MineralData[]>([]);
  const [localities, setLocalities] = useState<LocalityData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [formulaResult, setFormulaResult] = useState<string | null>(null);
  const [coordinatesResult, setCoordinatesResult] = useState<{ latitude: number; longitude: number } | null>(null);
  const [lookupTerm, setLookupTerm] = useState('');

  // Forms
  const mineralForm = useForm<z.infer<typeof mineralSearchSchema>>({
    resolver: zodResolver(mineralSearchSchema),
    defaultValues: {
      searchType: 'name',
      searchTerm: ''
    }
  });

  const localityForm = useForm<z.infer<typeof localitySearchSchema>>({
    resolver: zodResolver(localitySearchSchema),
    defaultValues: {
      searchType: 'name',
      searchTerm: ''
    }
  });

  const quickLookupForm = useForm<z.infer<typeof quickLookupSchema>>({
    resolver: zodResolver(quickLookupSchema),
    defaultValues: {
      lookupType: 'mineral-formula',
      lookupTerm: ''
    }
  });

  // Search for minerals
  const onMineralSearch = async (data: z.infer<typeof mineralSearchSchema>) => {
    setIsLoading(true);
    setMinerals([]);
    
    try {
      const params: MindatService.MindatMineralSearchParams = {};
      
      if (data.searchType === 'name') {
        params.name = data.searchTerm;
      } else if (data.searchType === 'formula') {
        params.formula = data.searchTerm;
      } else if (data.searchType === 'elements') {
        params.elements = data.searchTerm.split(',').map(el => el.trim());
      }
      
      const results = await MindatService.searchMinerals(params);
      
      if (results && results.data) {
        setMinerals(results.data);
        
        if (results.data.length === 0) {
          toast({
            title: 'No minerals found',
            description: 'Try a different search term or criteria',
            variant: 'destructive'
          });
        }
      }
    } catch (error) {
      console.error('Error searching minerals:', error);
      toast({
        title: 'Error searching minerals',
        description: 'An error occurred while searching. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Search for localities
  const onLocalitySearch = async (data: z.infer<typeof localitySearchSchema>) => {
    setIsLoading(true);
    setLocalities([]);
    
    try {
      const params: MindatService.MindatLocalitySearchParams = {};
      
      if (data.searchType === 'name') {
        params.name = data.searchTerm;
      } else if (data.searchType === 'country') {
        params.country = data.searchTerm;
      } else if (data.searchType === 'region') {
        params.region = data.searchTerm;
      }
      
      const results = await MindatService.searchLocalities(params);
      
      if (results && results.data) {
        setLocalities(results.data);
        
        if (results.data.length === 0) {
          toast({
            title: 'No localities found',
            description: 'Try a different search term or criteria',
            variant: 'destructive'
          });
        }
      }
    } catch (error) {
      console.error('Error searching localities:', error);
      toast({
        title: 'Error searching localities',
        description: 'An error occurred while searching. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Quick lookup
  const onQuickLookup = async (data: z.infer<typeof quickLookupSchema>) => {
    setIsLoading(true);
    setFormulaResult(null);
    setCoordinatesResult(null);
    setLookupTerm(data.lookupTerm);
    
    try {
      if (data.lookupType === 'mineral-formula') {
        const formula = await MindatService.getMineralFormula(data.lookupTerm);
        setFormulaResult(formula);
        
        if (!formula) {
          toast({
            title: 'Formula not found',
            description: `Could not find a formula for "${data.lookupTerm}"`,
            variant: 'destructive'
          });
        }
      } else if (data.lookupType === 'locality-coordinates') {
        const coordinates = await MindatService.getLocalityCoordinates(data.lookupTerm);
        setCoordinatesResult(coordinates);
        
        if (!coordinates) {
          toast({
            title: 'Coordinates not found',
            description: `Could not find coordinates for "${data.lookupTerm}"`,
            variant: 'destructive'
          });
        }
      }
    } catch (error) {
      console.error('Error during quick lookup:', error);
      toast({
        title: 'Error during lookup',
        description: 'An error occurred while looking up information. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Lookup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Quick Lookup
          </CardTitle>
          <CardDescription>
            Quickly look up specific information like mineral formulas or locality coordinates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...quickLookupForm}>
            <form onSubmit={quickLookupForm.handleSubmit(onQuickLookup)} className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <FormField
                  control={quickLookupForm.control}
                  name="lookupType"
                  render={({ field }) => (
                    <FormItem className="w-full md:w-1/3">
                      <FormLabel>Lookup Type</FormLabel>
                      <FormControl>
                        <select
                          className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                          {...field}
                        >
                          <option value="mineral-formula">Mineral Formula</option>
                          <option value="locality-coordinates">Locality Coordinates</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={quickLookupForm.control}
                  name="lookupTerm"
                  render={({ field }) => (
                    <FormItem className="w-full md:w-2/3">
                      <FormLabel>Term to Look Up</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder={
                            quickLookupForm.watch('lookupType') === 'mineral-formula' 
                              ? 'Enter mineral name (e.g., Quartz)' 
                              : 'Enter locality name (e.g., Tsumeb Mine)'
                          }
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
                {isLoading ? 'Looking up...' : 'Look Up'}
              </Button>
            </form>
          </Form>
          
          {/* Results */}
          {formulaResult !== null && (
            <Card className="mt-4 border-green-200 dark:border-green-900">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <BookOpen className="h-6 w-6 text-green-600 dark:text-green-500 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold">Formula for {lookupTerm}</h3>
                    <div className="mt-2 p-3 bg-gray-50 dark:bg-slate-800 rounded-md">
                      {formulaResult ? (
                        <p className="text-xl font-mono">{formulaResult}</p>
                      ) : (
                        <div className="flex items-center gap-2 text-amber-600">
                          <AlertOctagon className="h-5 w-5" />
                          <p>No formula found for this mineral</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {coordinatesResult !== null && (
            <Card className="mt-4 border-blue-200 dark:border-blue-900">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <MapPin className="h-6 w-6 text-blue-600 dark:text-blue-500 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold">Coordinates for {lookupTerm}</h3>
                    <div className="mt-2 p-3 bg-gray-50 dark:bg-slate-800 rounded-md">
                      {coordinatesResult ? (
                        <div>
                          <p className="font-mono">Latitude: {coordinatesResult.latitude}</p>
                          <p className="font-mono">Longitude: {coordinatesResult.longitude}</p>
                          <a 
                            href={`https://www.google.com/maps/search/?api=1&query=${coordinatesResult.latitude},${coordinatesResult.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                          >
                            <MapPin className="h-4 w-4" />
                            View on map
                          </a>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-amber-600">
                          <AlertOctagon className="h-5 w-5" />
                          <p>No coordinates found for this locality</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
      
      {/* Advanced Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Advanced Search
          </CardTitle>
          <CardDescription>
            Search for minerals or localities with more detailed criteria
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="minerals">Minerals</TabsTrigger>
              <TabsTrigger value="localities">Localities</TabsTrigger>
            </TabsList>
            
            <TabsContent value="minerals">
              <Form {...mineralForm}>
                <form onSubmit={mineralForm.handleSubmit(onMineralSearch)} className="space-y-4">
                  <div className="flex flex-col md:flex-row gap-4">
                    <FormField
                      control={mineralForm.control}
                      name="searchType"
                      render={({ field }) => (
                        <FormItem className="w-full md:w-1/3">
                          <FormLabel>Search By</FormLabel>
                          <FormControl>
                            <select
                              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                              {...field}
                            >
                              <option value="name">Mineral Name</option>
                              <option value="formula">Chemical Formula</option>
                              <option value="elements">Elements (comma-separated)</option>
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={mineralForm.control}
                      name="searchTerm"
                      render={({ field }) => (
                        <FormItem className="w-full md:w-2/3">
                          <FormLabel>Search Term</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder={
                                mineralForm.watch('searchType') === 'name' 
                                  ? 'E.g., Quartz, Calcite, Beryl' 
                                  : mineralForm.watch('searchType') === 'formula'
                                  ? 'E.g., SiO2, CaCO3'
                                  : 'E.g., Si,O or Fe,Cu,S'
                              }
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Searching...' : 'Search Minerals'}
                  </Button>
                </form>
              </Form>
              
              {/* Results */}
              {minerals.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-3">Results ({minerals.length})</h3>
                  <div className="space-y-4">
                    {minerals.map((mineral) => (
                      <Card key={mineral.id}>
                        <CardContent className="pt-6">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="text-xl font-semibold">{mineral.name}</h4>
                              {mineral.formula && (
                                <p className="text-gray-600 dark:text-gray-400 font-mono mt-1">
                                  {mineral.formula}
                                </p>
                              )}
                            </div>
                            {mineral.ima_status && (
                              <div className="px-2 py-1 rounded-md bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 text-xs">
                                {mineral.ima_status}
                              </div>
                            )}
                          </div>
                          
                          {mineral.description && (
                            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                              {mineral.description.length > 300 
                                ? `${mineral.description.substring(0, 300)}...` 
                                : mineral.description}
                            </p>
                          )}
                          
                          {mineral.url && (
                            <a 
                              href={mineral.url.startsWith('http') ? mineral.url : `https://www.mindat.org/min-${mineral.id}.html`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-3 text-primary hover:underline inline-flex items-center gap-1"
                            >
                              <BookOpen className="h-4 w-4" />
                              View on Mindat.org
                            </a>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="localities">
              <Form {...localityForm}>
                <form onSubmit={localityForm.handleSubmit(onLocalitySearch)} className="space-y-4">
                  <div className="flex flex-col md:flex-row gap-4">
                    <FormField
                      control={localityForm.control}
                      name="searchType"
                      render={({ field }) => (
                        <FormItem className="w-full md:w-1/3">
                          <FormLabel>Search By</FormLabel>
                          <FormControl>
                            <select
                              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                              {...field}
                            >
                              <option value="name">Locality Name</option>
                              <option value="country">Country</option>
                              <option value="region">Region</option>
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={localityForm.control}
                      name="searchTerm"
                      render={({ field }) => (
                        <FormItem className="w-full md:w-2/3">
                          <FormLabel>Search Term</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder={
                                localityForm.watch('searchType') === 'name' 
                                  ? 'E.g., Tsumeb Mine, Bisbee' 
                                  : localityForm.watch('searchType') === 'country'
                                  ? 'E.g., USA, Germany, Australia'
                                  : 'E.g., California, Namibia, Saxony'
                              }
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Searching...' : 'Search Localities'}
                  </Button>
                </form>
              </Form>
              
              {/* Results */}
              {localities.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-3">Results ({localities.length})</h3>
                  <div className="space-y-4">
                    {localities.map((locality) => (
                      <Card key={locality.id}>
                        <CardContent className="pt-6">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="text-xl font-semibold">{locality.name}</h4>
                              {(locality.country || locality.region) && (
                                <p className="text-gray-600 dark:text-gray-400 mt-1">
                                  {[locality.region, locality.country].filter(Boolean).join(', ')}
                                </p>
                              )}
                            </div>
                            {locality.location_type && (
                              <div className="px-2 py-1 rounded-md bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 text-xs">
                                {locality.location_type}
                              </div>
                            )}
                          </div>
                          
                          {locality.description && (
                            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                              {locality.description.length > 300 
                                ? `${locality.description.substring(0, 300)}...` 
                                : locality.description}
                            </p>
                          )}
                          
                          <div className="mt-3 flex flex-wrap gap-3">
                            {locality.latitude && locality.longitude && (
                              <a 
                                href={`https://www.google.com/maps/search/?api=1&query=${locality.latitude},${locality.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline inline-flex items-center gap-1"
                              >
                                <MapPin className="h-4 w-4" />
                                View on map
                              </a>
                            )}
                            
                            {locality.url && (
                              <a 
                                href={locality.url.startsWith('http') ? locality.url : `https://www.mindat.org/loc-${locality.id}.html`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline inline-flex items-center gap-1"
                              >
                                <BookOpen className="h-4 w-4" />
                                View on Mindat.org
                              </a>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}