import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  searchMineralsBySpaceGroup,
  getSpaceGroups
} from "@/lib/mindat-service";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SpaceGroupSearchProps {
  onSelect: (mineral: any) => void;
  selectedSystem?: string;
}

// List of common space group symbols for search dropdown
const spaceGroupSymbols = [
  "P1", "P2₁/c", "C2/c", "P2₁2₁2₁", "Pnma", "R-3m", "P6₃/mmc", 
  "Pa3", "Fm-3m", "Fd-3m", "Ia-3d"
];

export function SpaceGroupSearch({ onSelect, selectedSystem = "" }: SpaceGroupSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [spaceGroupSymbol, setSpaceGroupSymbol] = useState<string>("");

  // Query to fetch minerals by space group
  const { data: mineralSearchResults, isLoading: isLoadingMineralSearch } = useQuery({
    queryKey: ['minerals-by-space-group', searchTerm, spaceGroupSymbol, selectedSystem],
    queryFn: () => searchMineralsBySpaceGroup({
      name: searchTerm,
      space_group: spaceGroupSymbol || undefined,
      crystal_system: selectedSystem === 'all' ? undefined : selectedSystem,
      limit: 10
    }),
    enabled: (isSearching && searchTerm.length > 2) || (spaceGroupSymbol !== "")
  });

  // Function to handle mineral search by name
  const handleSearch = () => {
    if (searchTerm.length > 2) {
      setSpaceGroupSymbol(""); // Clear space group filter when searching by name
      setIsSearching(true);
    }
  };

  // Function to handle search by space group symbol
  const handleSpaceGroupSearch = (value: string) => {
    // Handle "any" value to represent empty space group filter
    const spaceGroupValue = value === "any" ? "" : value;
    setSpaceGroupSymbol(spaceGroupValue);
    setSearchTerm(""); // Clear mineral name search when filtering by space group
    setIsSearching(false); // Not needed for space group search as it's enabled by the value
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

        {/* Space Group Symbol Search */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Filter by Space Group</label>
          <Select
            value={spaceGroupSymbol}
            onValueChange={handleSpaceGroupSearch}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a space group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any space group</SelectItem>
              {spaceGroupSymbols.map(symbol => (
                <SelectItem key={symbol} value={symbol}>
                  {symbol}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
            : spaceGroupSymbol 
              ? `No minerals found with space group ${spaceGroupSymbol}` 
              : ""
          }
        </p>
      )}
      
      {mineralSearchResults?.results && mineralSearchResults.results.length > 0 && (
        <>
          <h3 className="text-lg font-semibold mb-2">Search Results</h3>
          <div className="rounded-md border overflow-x-auto mb-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mineral Name</TableHead>
                  <TableHead>Formula</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mineralSearchResults.results.map((mineral: any) => (
                  <TableRow key={mineral.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => onSelect(mineral)}>
                    <TableCell className="font-medium">{mineral.name || 'N/A'}</TableCell>
                    <TableCell dangerouslySetInnerHTML={{ __html: mineral.mindat_formula || mineral.ima_formula || 'N/A' }} />
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Space Group Information for the first result */}
          {mineralSearchResults.results.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Space Group Information</h3>

              {/* First mineral's space group information */}
              <div className="mb-4 p-4 border rounded-md bg-muted/30">
                <h4 className="text-md font-medium mb-2">
                  Space Group Information for {mineralSearchResults.results[0].name}
                </h4>
                
                {(() => {
                  const firstMineral = mineralSearchResults.results[0];
                  
                  // Log all the data for debugging
                  console.log("First mineral space group data:", {
                    name: firstMineral.name,
                    space_group: firstMineral.space_group,
                    spacegroup: firstMineral.spacegroup,
                    crystal_system: firstMineral.crystal_system || firstMineral.csystem,
                    crystal_class: firstMineral.crystal_class,
                    crystal_class_id: firstMineral.crystal_class_id,
                    // Log all properties to see what's available
                    allProps: Object.keys(firstMineral)
                  });
                  
                  // Display all available space group and crystallographic data
                  return (
                    <div className="space-y-2">
                      {/* Show all space group data */}
                      {firstMineral.space_group && (
                        <p><span className="font-medium">Space Group Symbol:</span> {firstMineral.space_group}</p>
                      )}
                      
                      {firstMineral.spacegroup && (
                        <p><span className="font-medium">Space Group ID:</span> {firstMineral.spacegroup}</p>
                      )}
                      
                      {/* Show crystal system data */}
                      {(firstMineral.crystal_system || firstMineral.csystem) && (
                        <p><span className="font-medium">Crystal System:</span> {firstMineral.crystal_system || firstMineral.csystem}</p>
                      )}
                      
                      {/* Show crystal class data if available */}
                      {firstMineral.crystal_class && (
                        <p><span className="font-medium">Crystal Class:</span> {firstMineral.crystal_class}</p>
                      )}
                      
                      {firstMineral.crystal_class_id && (
                        <p><span className="font-medium">Crystal Class ID:</span> {firstMineral.crystal_class_id}</p>
                      )}
                      
                      {/* Show unit cell data if available */}
                      {firstMineral.a && (
                        <p><span className="font-medium">Unit Cell:</span> a={firstMineral.a}, 
                        b={firstMineral.b}, c={firstMineral.c}, 
                        α={firstMineral.alpha}°, β={firstMineral.beta}°, γ={firstMineral.gamma}°</p>
                      )}
                      
                      {/* If no space group data is available */}
                      {!firstMineral.space_group && !firstMineral.spacegroup && (
                        <p className="text-amber-600">
                          <span className="font-medium">Note:</span> No space group information available for this mineral.
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Raw API Response Details Section */}
              <div>
                <h4 className="text-md font-medium mb-2">API Response Details</h4>
                <div className="p-4 border rounded-md bg-gray-50 overflow-auto max-h-64">
                  <pre className="text-xs whitespace-pre-wrap">
                    {JSON.stringify(mineralSearchResults.results[0], null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}