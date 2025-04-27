
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
  const [isLoadingDanaClasses, setIsLoadingDanaClasses] = useState(true);

  // Fetch Dana classes from API on component mount
  useEffect(() => {
    const fetchDanaClasses = async () => {
      try {
        console.log("Fetching Dana classes from API...");
        setIsLoadingDanaClasses(true);
        const response = await getDanaClassification({ 
          pageSize: 100 // Get a reasonable number of classes
        });
        
        // Store Dana classes for later use
        if (response && response.results) {
          setApiDanaClasses(response.results);
          console.log("Got Dana classes from API:", response.results);
        }
      } catch (error) {
        console.error("Error fetching Dana classes:", error);
      } finally {
        setIsLoadingDanaClasses(false);
      }
    };

    fetchDanaClasses();
  }, []);

  // Define Dana classes mapping
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

  return (
    <div className="space-y-4">
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

      {isLoadingMineralSearch && (
        <div className="flex justify-center my-4">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Searching minerals...</span>
        </div>
      )}

      {isSearching && !isLoadingMineralSearch && mineralSearchResults?.results?.length === 0 && (
        <p className="text-center text-gray-500">No minerals found matching "{searchTerm}"</p>
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
          {mineralSearchResults.results.length > 0 && mineralSearchResults.results[0].dana_code && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Dana Classification Information</h3>
              
              <div className="mb-4">
                <h4 className="text-md font-medium mb-2">Dana Code: {mineralSearchResults.results[0].dana_code || mineralSearchResults.results[0].dana_classification}</h4>
                <div className="bg-muted/50 p-3 rounded-md">
                  <p className="text-sm text-muted-foreground">
                    {getDanaClassificationDisplay(mineralSearchResults.results[0])}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    The Dana classification system is a mineral classification system that categorizes minerals based on their chemical composition and crystal structure. The first number represents the main class.
                  </p>
                </div>
              </div>
              
              {/* Dana Class Table */}
              <div>
                <h4 className="text-md font-medium mb-2">Dana Classification System</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Class</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>1</TableCell>
                      <TableCell>Elements</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>2</TableCell>
                      <TableCell>Sulfides</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>3</TableCell>
                      <TableCell>Halides</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>4</TableCell>
                      <TableCell>Oxides</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>5</TableCell>
                      <TableCell>Carbonates & Nitrates</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>6</TableCell>
                      <TableCell>Borates</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>7</TableCell>
                      <TableCell>Sulfates, Chromates, Molybdates, & Tungstates</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>8</TableCell>
                      <TableCell>Phosphates, Arsenates, & Vanadates</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>9</TableCell>
                      <TableCell>Silicates</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>10</TableCell>
                      <TableCell>Organic Minerals</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
