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

// Common space groups used in mineralogy with their data
const commonSpaceGroups = [
  { number: 1, symbol: "P1", system: "Triclinic", description: "Primitive triclinic" },
  { number: 2, symbol: "P-1", system: "Triclinic", description: "Primitive triclinic with inversion" },
  { number: 5, symbol: "C2", system: "Monoclinic", description: "C-centered monoclinic" },
  { number: 9, symbol: "Cc", system: "Monoclinic", description: "C-centered monoclinic with glide plane" },
  { number: 14, symbol: "P2₁/c", system: "Monoclinic", description: "Primitive monoclinic with 2₁ screw axis and c glide" },
  { number: 15, symbol: "C2/c", system: "Monoclinic", description: "C-centered monoclinic with 2-fold axis and c glide" },
  { number: 19, symbol: "P2₁2₁2₁", system: "Orthorhombic", description: "Primitive orthorhombic with three 2₁ screw axes" },
  { number: 33, symbol: "Pna2₁", system: "Orthorhombic", description: "Primitive orthorhombic with n and a glides" },
  { number: 62, symbol: "Pnma", system: "Orthorhombic", description: "Primitive orthorhombic with n, m, and a symmetry elements" },
  { number: 88, symbol: "I4₁/a", system: "Tetragonal", description: "Body-centered tetragonal with 4₁ screw axis" },
  { number: 143, symbol: "P3", system: "Trigonal", description: "Primitive trigonal with 3-fold axis" },
  { number: 152, symbol: "P3₁21", system: "Trigonal", description: "Primitive trigonal with 3₁ screw axis" },
  { number: 166, symbol: "R-3m", system: "Trigonal", description: "Rhombohedral trigonal with inversion and mirror" },
  { number: 176, symbol: "P6₃/m", system: "Hexagonal", description: "Primitive hexagonal with 6₃ screw axis" },
  { number: 194, symbol: "P6₃/mmc", system: "Hexagonal", description: "Primitive hexagonal with 6₃ screw axis, mirrors and glides" },
  { number: 206, symbol: "Ia-3", system: "Cubic", description: "Body-centered cubic with inversion" },
  { number: 225, symbol: "Fm-3m", system: "Cubic", description: "Face-centered cubic with high symmetry" },
  { number: 227, symbol: "Fd-3m", system: "Cubic", description: "Face-centered cubic with diamond structure" },
  { number: 230, symbol: "Ia-3d", system: "Cubic", description: "Body-centered cubic with highest symmetry" },
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

  // Find the space group info for a given symbol
  const getSpaceGroupInfo = (symbol: string) => {
    return commonSpaceGroups.find(sg => sg.symbol === symbol) || null;
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
              {commonSpaceGroups.map(sg => (
                <SelectItem key={sg.symbol} value={sg.symbol}>
                  {sg.number} - {sg.symbol} ({sg.system})
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
          {mineralSearchResults.results.length > 0 && mineralSearchResults.results[0].space_group && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Space Group Information</h3>

              {/* First mineral's space group information */}
              <div className="mb-4 p-4 border rounded-md bg-muted/30">
                <h4 className="text-md font-medium mb-2">
                  Space Group Information for {mineralSearchResults.results[0].name}
                </h4>
                
                {(() => {
                  const spaceGroup = mineralSearchResults.results[0].space_group;
                  const spaceGroupInfo = getSpaceGroupInfo(spaceGroup);
                  
                  if (spaceGroupInfo) {
                    return (
                      <div className="space-y-2">
                        <p><span className="font-medium">Space Group Symbol:</span> {spaceGroup}</p>
                        <p><span className="font-medium">Space Group Number:</span> {spaceGroupInfo.number}</p>
                        <p><span className="font-medium">Crystal System:</span> {spaceGroupInfo.system}</p>
                        <p><span className="font-medium">Description:</span> {spaceGroupInfo.description}</p>
                      </div>
                    );
                  } else {
                    return (
                      <p>
                        <span className="font-medium">Space Group Symbol:</span> {spaceGroup}
                        <br />
                        <span className="text-sm text-muted-foreground">Detailed information not available for this space group in our reference table.</span>
                      </p>
                    );
                  }
                })()}
              </div>

              {/* Space Group Reference Table */}
              <div>
                <h4 className="text-md font-medium mb-2">Common Space Groups Reference</h4>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Number</TableHead>
                        <TableHead>Symbol</TableHead>
                        <TableHead>Crystal System</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {commonSpaceGroups.map((sg) => (
                        <TableRow key={sg.number} className={
                          mineralSearchResults.results[0]?.space_group === sg.symbol 
                            ? "bg-primary/20 font-medium" 
                            : ""
                        }>
                          <TableCell>{sg.number}</TableCell>
                          <TableCell className="font-mono">{sg.symbol}</TableCell>
                          <TableCell>{sg.system}</TableCell>
                          <TableCell>{sg.description}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}