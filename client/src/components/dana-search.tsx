
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { 
  searchMineralsByDanaClass, 
  getDanaClassification, 
  type DanaClass 
} from "@/lib/mindat-service";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

interface DanaSearchProps {
  onSelect: (mineral: any) => void;
}

export function DanaSearch({ onSelect }: DanaSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [danaCode, setDanaCode] = useState("");
  const [apiDanaClasses, setApiDanaClasses] = useState<DanaClass[]>([]);
  
  // Query to fetch Dana classes from the API
  const { data: danaClassesData, isLoading: isLoadingDanaClasses } = useQuery({
    queryKey: ['dana-classes'],
    queryFn: async () => {
      console.log("Fetching Dana classes from API...");
      return await getDanaClassification({ pageSize: 100 }); // Fetch all Dana classes
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour since this data rarely changes
  });
  
  // Update state when Dana classes data is loaded
  useEffect(() => {
    if (danaClassesData?.results) {
      console.log("Got Dana classes from API:", danaClassesData.results);
      
      // If we have results, set them as options
      if (danaClassesData.results.length > 0) {
        setApiDanaClasses(danaClassesData.results);
      } else {
        // If we have no results, add some placeholder options for the main Dana classes
        console.log("No Dana classes returned from API, using fallback data");
        // Use the built-in danaClasses mapping to populate the dropdown
        const fallbackClasses = Object.entries(danaClasses).map(([code, name]) => ({
          id: code,
          code: code,
          name: name
        }));
        setApiDanaClasses(fallbackClasses);
      }
    }
  }, [danaClassesData]);
  
  // Define basic Dana classes mapping for display purposes only when API doesn't contain the information
  const danaClasses: Record<string, string> = {
    "01": "Elements",
    "02": "Sulfides",
    "03": "Halides",
    "04": "Oxides",
    "05": "Carbonates & Nitrates",
    "06": "Borates",
    "07": "Sulfates, Chromates, Molybdates, & Tungstates",
    "08": "Phosphates, Arsenates, & Vanadates",
    "09": "Silicates",
    "10": "Organic Minerals"
  };

  // Query to fetch minerals by dana class
  const { data: mineralSearchResults, isLoading: isLoadingMineralSearch } = useQuery({
    queryKey: ['minerals-by-dana', searchTerm, danaCode],
    queryFn: async () => {
      const results = await searchMineralsByDanaClass({
        name: searchTerm,
        dana_class: danaCode || undefined,
        limit: 10
      });
      
      return results;
    },
    enabled: (isSearching && searchTerm.length > 2) || (danaCode !== "")
  });

  // Function to handle mineral search by name
  const handleSearch = () => {
    if (searchTerm.length > 2) {
      setDanaCode(""); // Clear dana class filter when searching by name
      setIsSearching(true);
    }
  };

  // Function to handle search by Dana class
  const handleDanaClassSearch = (value: string) => {
    // Handle "any" value to represent empty Dana class filter
    const danaValue = value === "any" ? "" : value;
    setDanaCode(danaValue);
    setSearchTerm(""); // Clear mineral name search when filtering by Dana class
    setIsSearching(false); // Not needed for Dana class search as it's enabled by the value
  };

  // Function to extract and display the Dana classification information
  const getDanaClassificationDisplay = (mineral: any) => {
    const danaCode = mineral.dana_code || mineral.dana_classification;
    
    if (!danaCode) return 'N/A';
    
    // Extract the main class (first number before period)
    const mainClass = danaCode.split('.')[0].padStart(2, '0');
    const className = danaClasses[mainClass] || 'Unknown class';
    
    return `${danaCode} (${className})`;
  };
  
  // Function to get Dana class info from code
  const getDanaClassInfo = (danaCode: string): DanaClass | undefined => {
    // First look in the API data
    if (apiDanaClasses.length > 0) {
      const apiDanaInfo = apiDanaClasses.find(dc => 
        dc.code === danaCode || 
        (dc.code && danaCode.startsWith(dc.code.split('.')[0]))
      );
      
      if (apiDanaInfo) {
        console.log(`Found Dana class info in API for ${danaCode}:`, apiDanaInfo);
        return apiDanaInfo;
      }
    }
    
    // Fall back to our hardcoded mapping if needed - build a basic DanaClass object
    const mainClass = danaCode.split('.')[0].padStart(2, '0');
    if (danaClasses[mainClass]) {
      const className = danaClasses[mainClass];
      console.log(`Found Dana class info in local map for ${danaCode} (main class ${mainClass}):`, className);
      return {
        id: mainClass, // Use mainClass as string since our DanaClass interface now uses string IDs
        code: mainClass,
        name: className
      };
    }
    
    // If we can't find anything, return undefined
    console.log(`No Dana class info found for ${danaCode}`);
    return undefined;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Mineral Name Search */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Search by Mineral Name</label>
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Enter mineral name (e.g., Quartz)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={searchTerm.length < 3}>
              Search
            </Button>
          </div>
        </div>

        {/* Dana Classification Code Search */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Filter by Dana Classification</label>
          {isLoadingDanaClasses ? (
            <div className="flex items-center">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              <span className="text-sm">Loading Dana classes...</span>
            </div>
          ) : (
            <Select
              value={danaCode}
              onValueChange={handleDanaClassSearch}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a Dana classification" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any Dana classification</SelectItem>
                {apiDanaClasses.map(dc => (
                  <SelectItem key={dc.id} value={dc.code}>
                    {dc.code} - {dc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {isLoadingMineralSearch && (
        <div className="flex justify-center my-4">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Searching minerals...</span>
        </div>
      )}

      {!isLoadingMineralSearch && mineralSearchResults?.results?.length === 0 && (
        <p className="text-center text-gray-500">
          {searchTerm 
            ? `No minerals found matching "${searchTerm}"` 
            : danaCode 
              ? `No minerals found with Dana classification ${danaCode}` 
              : ""
          }
        </p>
      )}

      {mineralSearchResults?.results && mineralSearchResults.results.length > 0 && (
        <>
          <div>
            <h3 className="text-lg font-semibold mb-2">Search Results</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mineral Name</TableHead>
                  <TableHead>Formula</TableHead>
                  <TableHead>Dana Classification</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mineralSearchResults.results.map((mineral: any) => (
                  <TableRow key={mineral.id}>
                    <TableCell className="font-medium">{mineral.name || 'N/A'}</TableCell>
                    <TableCell dangerouslySetInnerHTML={{ __html: mineral.mindat_formula || mineral.ima_formula || 'N/A' }} />
                    <TableCell>{mineral.dana_code || mineral.dana_classification || 'N/A'}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => onSelect(mineral)}>
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Dana Classification Mapping Results */}
          {mineralSearchResults.results.length > 0 && (mineralSearchResults.results[0].dana_code || mineralSearchResults.results[0].dana_classification) && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Dana Classification Information</h3>
              
              {(() => {
                const firstMineral = mineralSearchResults.results[0];
                const danaCodeValue = firstMineral.dana_code || firstMineral.dana_classification;
                
                // Log Dana classification data for debugging
                console.log("First mineral Dana class data:", {
                  name: firstMineral.name,
                  dana_code: firstMineral.dana_code,
                  dana_classification: firstMineral.dana_classification
                });
                
                // Get Dana class information using our mapper function
                const danaClassInfo = danaCodeValue ? getDanaClassInfo(danaCodeValue) : null;
                
                // If we have a Dana classification in the mineral data
                if (danaCodeValue) {
                  return (
                    <div className="space-y-4">
                      <div className="mb-4">
                        <h4 className="text-md font-medium mb-2">Dana Code: {danaCodeValue}</h4>
                        <div className="bg-muted/30 p-4 rounded-md">
                          <p className="text-sm text-muted-foreground">
                            {getDanaClassificationDisplay(firstMineral)}
                          </p>
                          
                          {/* Display Mapped Dana Class Information */}
                          {danaClassInfo && (
                            <div className="mt-3 pt-3 border-t border-muted">
                              <p className="text-sm text-muted-foreground mb-2">Mapped Dana Class Information:</p>
                              
                              <p><span className="font-medium">Code:</span> {danaClassInfo.code}</p>
                              <p><span className="font-medium">Name:</span> {danaClassInfo.name}</p>
                              {danaClassInfo.description && (
                                <p><span className="font-medium">Description:</span> {danaClassInfo.description}</p>
                              )}
                            </div>
                          )}
                          
                          <p className="text-sm text-muted-foreground mt-3 pt-3 border-t border-muted">
                            The Dana classification system categorizes minerals based on their chemical composition and crystal structure. 
                            The first number represents the main class, followed by subclass and group numbers.
                          </p>
                        </div>
                      </div>
                      
                      {/* Dana Class Table - Show just the main classes */}
                      <div>
                        <h4 className="text-md font-medium mb-2">Dana Main Classes</h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Class</TableHead>
                              <TableHead>Description</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {Object.entries(danaClasses).map(([code, desc]) => (
                              <TableRow key={code}>
                                <TableCell>{code}</TableCell>
                                <TableCell>{desc}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  );
                } else {
                  // No Dana classification information available
                  return (
                    <div className="space-y-2">
                      <p className="text-amber-600">
                        <span className="font-medium">Note:</span> No Dana classification information available for this mineral.
                      </p>
                    </div>
                  );
                }
              })()}
            </div>
          )}
        </>
      )}
    </div>
  );
}
