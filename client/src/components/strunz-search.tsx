
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { searchMineralsByStrunzClass } from "@/lib/mindat-service";

interface StrunzSearchProps {
  onSelect: (mineral: any) => void;
}

export function StrunzSearch({ onSelect }: StrunzSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Query to fetch minerals by strunz class
  const { data: mineralSearchResults, isLoading: isLoadingMineralSearch } = useQuery({
    queryKey: ['minerals-by-strunz', searchTerm],
    queryFn: async () => {
      const results = await searchMineralsByStrunzClass({
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

  // Function to extract and display the Strunz classification information
  const getStrunzClassificationDisplay = (mineral: any) => {
    const strunzCode = mineral.strunz_code || mineral.strunz_classification;
    
    if (!strunzCode) return 'N/A';
    
    // Define mapping for Strunz classes (first letter)
    const strunzClasses: Record<string, string> = {
      "A": "Elements",
      "B": "Sulfides and Sulfosalts",
      "C": "Halides",
      "D": "Oxides and Hydroxides",
      "E": "Carbonates and Nitrates",
      "F": "Borates",
      "G": "Sulfates, Chromates, Molybdates, and Tungstates",
      "H": "Phosphates, Arsenates, and Vanadates",
      "I": "Silicates",
      "J": "Organic Compounds",
      "1": "Elements",
      "2": "Sulfides",
      "3": "Halides",
      "4": "Oxides",
      "5": "Carbonates and Nitrates",
      "6": "Borates",
      "7": "Sulfates",
      "8": "Phosphates",
      "9": "Silicates",
      "10": "Organic Compounds"
    };

    // Extract the main class (first character)
    const mainClass = strunzCode.charAt(0);
    const className = strunzClasses[mainClass] || 'Unknown class';
    
    return `${strunzCode} (${className})`;
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
                  <TableHead>Strunz Classification</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mineralSearchResults.results.map((mineral: any) => (
                  <TableRow key={mineral.id}>
                    <TableCell className="font-medium">{mineral.name || 'N/A'}</TableCell>
                    <TableCell dangerouslySetInnerHTML={{ __html: mineral.mindat_formula || mineral.ima_formula || 'N/A' }} />
                    <TableCell>{mineral.strunz_code || mineral.strunz_classification || 'N/A'}</TableCell>
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

          {/* Strunz Classification Mapping Results */}
          {mineralSearchResults.results.length > 0 && (mineralSearchResults.results[0].strunz_code || mineralSearchResults.results[0].strunz_classification) && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Strunz Classification Information</h3>
              
              <div className="mb-4">
                <h4 className="text-md font-medium mb-2">Strunz Code: {mineralSearchResults.results[0].strunz_code || mineralSearchResults.results[0].strunz_classification}</h4>
                <div className="bg-muted/50 p-3 rounded-md">
                  <p className="text-sm text-muted-foreground">
                    {getStrunzClassificationDisplay(mineralSearchResults.results[0])}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    The Strunz classification is a mineral classification system based on chemical composition and crystal structure. The first letter/number represents the main class.
                  </p>
                </div>
              </div>
              
              {/* Strunz Class Table */}
              <div>
                <h4 className="text-md font-medium mb-2">Strunz Classification System</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Class</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>1/A</TableCell>
                      <TableCell>Elements</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>2/B</TableCell>
                      <TableCell>Sulfides and Sulfosalts</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>3/C</TableCell>
                      <TableCell>Halides</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>4/D</TableCell>
                      <TableCell>Oxides and Hydroxides</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>5/E</TableCell>
                      <TableCell>Carbonates and Nitrates</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>6/F</TableCell>
                      <TableCell>Borates</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>7/G</TableCell>
                      <TableCell>Sulfates, Chromates, Molybdates, and Tungstates</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>8/H</TableCell>
                      <TableCell>Phosphates, Arsenates, and Vanadates</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>9/I</TableCell>
                      <TableCell>Silicates</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>10/J</TableCell>
                      <TableCell>Organic Compounds</TableCell>
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
