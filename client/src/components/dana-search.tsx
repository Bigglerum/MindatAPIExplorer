
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { searchMineralsByDanaClass } from "@/lib/mindat-service";

interface DanaSearchProps {
  onSelect: (mineral: any) => void;
}

export function DanaSearch({ onSelect }: DanaSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Query to fetch minerals by dana class
  const { data: mineralSearchResults, isLoading: isLoadingMineralSearch } = useQuery({
    queryKey: ['minerals-by-dana', searchTerm],
    queryFn: async () => {
      const results = await searchMineralsByDanaClass({
        name: searchTerm,
        limit: 10
      });
      
      return results;
    },
    enabled: isSearching && searchTerm.length > 2
  });

  // Function to handle mineral search
  const handleSearch = () => {
    if (searchTerm.length > 2) {
      setIsSearching(true);
    }
  };

  // Function to extract and display the Dana classification information
  const getDanaClassificationDisplay = (mineral: any) => {
    const danaCode = mineral.dana_code || mineral.dana_classification;
    
    if (!danaCode) return 'N/A';
    
    // Define mapping for Dana classes (first number)
    const danaClasses: Record<string, string> = {
      "1": "Elements",
      "2": "Sulfides",
      "3": "Halides",
      "4": "Oxides",
      "5": "Carbonates & Nitrates",
      "6": "Borates",
      "7": "Sulfates, Chromates, Molybdates, & Tungstates",
      "8": "Phosphates, Arsenates, & Vanadates",
      "9": "Silicates",
      "10": "Organic Minerals"
    };

    // Extract the main class (first number before period)
    const mainClass = danaCode.split('.')[0];
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
