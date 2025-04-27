import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { searchMineralsByCrystalSystem, getCrystalClasses } from "@/lib/mindat-service";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CrystalSystemSearchProps {
  onSelect: (mineral: any) => void;
  selectedSystem?: string;
}

// Crystal system name mapping (handles different terminology)
const crystalSystemMap: Record<string, string> = {
  "isometric": "Cubic",
  "cubic": "Cubic",
  "hexagonal": "Hexagonal",
  "trigonal": "Trigonal",
  "tetragonal": "Tetragonal",
  "orthorhombic": "Orthorhombic", 
  "monoclinic": "Monoclinic",
  "triclinic": "Triclinic"
};

// Crystal class number (cclass) to name mapping
const crystalClassMap = [
  { cclass: 1, name: "Pedial", system: "Triclinic", symbol: "1" },
  { cclass: 2, name: "Pinacoidal", system: "Triclinic", symbol: "-1" },
  { cclass: 3, name: "Sphenoidal", system: "Monoclinic", symbol: "2" },
  { cclass: 4, name: "Domatic", system: "Monoclinic", symbol: "m" },
  { cclass: 5, name: "Prismatic", system: "Monoclinic", symbol: "2/m" },
  { cclass: 6, name: "Rhombic-disphenoidal", system: "Orthorhombic", symbol: "222" },
  { cclass: 7, name: "Rhombic-pyramidal", system: "Orthorhombic", symbol: "mm2" },
  { cclass: 8, name: "Rhombic-dipyramidal", system: "Orthorhombic", symbol: "mmm" },
  { cclass: 9, name: "Tetragonal-pyramidal", system: "Tetragonal", symbol: "4" },
  { cclass: 10, name: "Tetragonal-disphenoidal", system: "Tetragonal", symbol: "-4" },
  { cclass: 11, name: "Tetragonal-dipyramidal", system: "Tetragonal", symbol: "4/m" },
  { cclass: 12, name: "Tetragonal-scalenohedral", system: "Tetragonal", symbol: "422" },
  { cclass: 13, name: "Ditetragonal-pyramidal", system: "Tetragonal", symbol: "4mm" },
  { cclass: 14, name: "Tetragonal-trapezohedral", system: "Tetragonal", symbol: "-42m" },
  { cclass: 15, name: "Ditetragonal-dipyramidal", system: "Tetragonal", symbol: "4/mmm" },
  { cclass: 16, name: "Trigonal-pyramidal", system: "Trigonal", symbol: "3" },
  { cclass: 17, name: "Rhombohedral", system: "Trigonal", symbol: "-3" },
  { cclass: 18, name: "Trigonal-trapezohedral", system: "Trigonal", symbol: "32" },
  { cclass: 19, name: "Ditrigonal-pyramidal", system: "Trigonal", symbol: "3m" },
  { cclass: 20, name: "Ditrigonal-scalenohedral", system: "Trigonal", symbol: "-3m" },
  { cclass: 21, name: "Hexagonal-pyramidal", system: "Hexagonal", symbol: "6" },
  { cclass: 22, name: "Trigonal-dipyramidal", system: "Hexagonal", symbol: "-6" },
  { cclass: 23, name: "Hexagonal-dipyramidal", system: "Hexagonal", symbol: "6/m" },
  { cclass: 24, name: "Hexagonal-trapezohedral", system: "Hexagonal", symbol: "622" },
  { cclass: 25, name: "Dihexagonal-pyramidal", system: "Hexagonal", symbol: "6mm" },
  { cclass: 26, name: "Ditrigonal-dipyramidal", system: "Hexagonal", symbol: "-62m" },
  { cclass: 27, name: "Dihexagonal-dipyramidal", system: "Hexagonal", symbol: "6/mmm" },
  { cclass: 28, name: "Tetartoidal", system: "Cubic", symbol: "23" },
  { cclass: 29, name: "Diploidal", system: "Cubic", symbol: "m-3" },
  { cclass: 30, name: "Gyroidal", system: "Cubic", symbol: "432" },
  { cclass: 31, name: "Hextetrahedral", system: "Cubic", symbol: "-43m" },
  { cclass: 32, name: "Hexoctahedral", system: "Cubic", symbol: "m-3m" }
];

export function CrystalSystemSearch({ onSelect, selectedSystem }: CrystalSystemSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [classNumberSearch, setClassNumberSearch] = useState<string>("");

  // Query to fetch minerals by crystal system or class number
  const { data: mineralSearchResults, isLoading: isLoadingMineralSearch } = useQuery({
    queryKey: ['minerals-by-crystal-system', searchTerm, classNumberSearch, selectedSystem],
    queryFn: async () => {
      // If using the class number search
      if (classNumberSearch) {
        const cclassNum = parseInt(classNumberSearch);
        console.log(`Searching for minerals with crystal class number: ${cclassNum}`);
        return await searchMineralsByCrystalSystem({
          crystal_class_number: cclassNum, // This is converted to 'cclass' in the API call
          crystal_system: selectedSystem === 'all' ? undefined : selectedSystem,
          limit: 10
        });
      } 
      // If using the mineral name search
      return await searchMineralsByCrystalSystem({
        name: searchTerm,
        crystal_system: selectedSystem === 'all' ? undefined : selectedSystem,
        limit: 10
      });
    },
    enabled: (isSearching && searchTerm.length > 2) || (classNumberSearch !== "")
  });

  // Function to handle mineral search by name
  const handleSearch = () => {
    if (searchTerm.length > 2) {
      setClassNumberSearch(""); // Clear class number search when searching by name
      setIsSearching(true);
    }
  };

  // Function to handle search by crystal class number
  const handleClassNumberSearch = (value: string) => {
    // If "0" is selected, treat it as "Any crystal class" (empty string)
    if (value === "0") {
      setClassNumberSearch("");
      return;
    }
    
    setClassNumberSearch(value);
    setSearchTerm(""); // Clear mineral name search when searching by class number
    setIsSearching(false); // Not needed for class number search as it's enabled by the value
  };

  // Helper function to normalize crystal system names
  const normalizeCrystalSystem = (systemName: string): string => {
    if (!systemName) return "";
    
    // Trim and convert to lowercase for case-insensitive comparison
    const lowercaseSystem = systemName.trim().toLowerCase();
    
    // Direct mapping match first
    if (crystalSystemMap[lowercaseSystem]) {
      return crystalSystemMap[lowercaseSystem];
    }
    
    // Try partial matches
    for (const [key, value] of Object.entries(crystalSystemMap)) {
      if (lowercaseSystem.includes(key)) {
        console.log(`Mapped crystal system name from "${systemName}" to "${value}" based on partial match with "${key}"`);
        return value;
      }
    }
    
    // Special case for common variants
    if (lowercaseSystem.includes("cubic") || lowercaseSystem.includes("isometric")) {
      return "Cubic";
    }
    
    // If no mapping found, return the original with first letter capitalized
    const normalizedName = systemName.charAt(0).toUpperCase() + systemName.slice(1).toLowerCase();
    console.log(`No mapping found for crystal system name "${systemName}", using normalized format: "${normalizedName}"`);
    return normalizedName;
  };

  // Find the crystal class info for a given cclass value
  const getCrystalClassInfo = (cclass: number) => {
    // Convert string to number if necessary
    const cclassNum = typeof cclass === 'string' ? parseInt(cclass as string) : cclass;
    
    // Find the class in our mapping
    const classInfo = crystalClassMap.find(cls => cls.cclass === cclassNum);
    
    if (classInfo) {
      console.log(`Found crystal class info for cclass ${cclassNum}:`, classInfo);
      return classInfo;
    }
    
    console.log(`No crystal class info found for cclass ${cclassNum} in our mapping table`);
    return null;
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

        {/* Crystal Class Number Search */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Search by Crystal Class Number (1-32)</label>
          <Select
            value={classNumberSearch}
            onValueChange={handleClassNumberSearch}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a crystal class number" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Any crystal class</SelectItem>
              {crystalClassMap.map(cls => (
                <SelectItem key={cls.cclass} value={cls.cclass.toString()}>
                  {cls.cclass} - {cls.symbol} - {cls.name}
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
            : classNumberSearch 
              ? `No minerals found with crystal class ${classNumberSearch}` 
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

          {/* Crystal Class Information for the first result */}
          {mineralSearchResults.results.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Crystal Class Information</h3>

              {/* First mineral's crystal class information */}
              <div className="mb-4 p-4 border rounded-md bg-muted/30">
                <h4 className="text-md font-medium mb-2">
                  Crystal Class Information for {mineralSearchResults.results[0].name}
                </h4>
                
                {(() => {
                  const firstMineral = mineralSearchResults.results[0];
                  const cclass = firstMineral.cclass;
                  
                  console.log("First mineral data:", {
                    name: firstMineral.name,
                    cclass: cclass,
                    crystal_system: firstMineral.crystal_system,
                    crystal_class: firstMineral.crystal_class
                  });
                  
                  // First try to get system from crystal class if available
                  let derivedSystem = 'Not specified';
                  
                  // If we have a crystal class number, derive the crystal system from it
                  if (cclass) {
                    const classInfo = getCrystalClassInfo(cclass);
                    if (classInfo) {
                      derivedSystem = classInfo.system;
                      console.log(`Derived crystal system "${derivedSystem}" from crystal class number ${cclass}`);
                    }
                  }
                  
                  // If API provides crystal_system, normalize it
                  const normalizedSystem = firstMineral.crystal_system 
                    ? normalizeCrystalSystem(firstMineral.crystal_system)
                    : derivedSystem;
                    
                  console.log(`Original system: ${firstMineral.crystal_system}, Normalized: ${normalizedSystem}`);
                  
                  if (cclass) {
                    const classInfo = getCrystalClassInfo(cclass);
                    
                    if (classInfo) {
                      return (
                        <div className="space-y-2">
                          <p><span className="font-medium">Crystal Class Number:</span> {cclass}</p>
                          <p><span className="font-medium">Crystal Class Name:</span> {classInfo.name}</p>
                          <p><span className="font-medium">Crystal System:</span> {classInfo.system}</p>
                          <p><span className="font-medium">Hermann-Mauguin Symbol:</span> {classInfo.symbol}</p>
                          {firstMineral.crystal_system && normalizedSystem !== classInfo.system ? (
                            <p className="text-yellow-600">
                              <span className="font-medium">Note:</span> API reports crystal system as "{firstMineral.crystal_system}" which is equivalent to {classInfo.system}.
                            </p>
                          ) : !firstMineral.crystal_system && (
                            <p className="text-green-600">
                              <span className="font-medium">Note:</span> Crystal system derived from class number {cclass}.
                            </p>
                          )}
                        </div>
                      );
                    } else {
                      return (
                        <div className="space-y-2">
                          <p><span className="font-medium">Crystal Class Number:</span> {cclass}</p>
                          <p><span className="font-medium">Crystal System:</span> {normalizedSystem}</p>
                          <p className="text-amber-600">
                            <span className="font-medium">Note:</span> Class number {cclass} corresponds to a {normalizedSystem} crystal system.
                            See the reference table below for all crystal classes.
                          </p>
                        </div>
                      );
                    }
                  } else {
                    // No cclass information, show what we have
                    return (
                      <div className="space-y-2">
                        <p><span className="font-medium">Crystal System:</span> {normalizedSystem}</p>
                        <p><span className="font-medium">Crystal Class:</span> {firstMineral.crystal_class || 'Not specified'}</p>
                        <p className="text-amber-600">
                          <span className="font-medium">Note:</span> Crystal class number information not available for this mineral.
                          The table below shows all 32 crystal classes grouped by crystal system.
                        </p>
                      </div>
                    );
                  }
                })()}
              </div>

              {/* Crystal Class Number Mapping Table */}
              <div>
                <h4 className="text-md font-medium mb-2">Crystal Class Number Reference</h4>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Class #</TableHead>
                        <TableHead>Hermann-Mauguin Symbol</TableHead>
                        <TableHead>Class Name</TableHead>
                        <TableHead>Crystal System</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {crystalClassMap.map((cls) => (
                        <TableRow key={cls.cclass} className={
                          mineralSearchResults.results[0]?.cclass === cls.cclass 
                            ? "bg-primary/20 font-medium" 
                            : ""
                        }>
                          <TableCell>{cls.cclass}</TableCell>
                          <TableCell className="font-mono">{cls.symbol}</TableCell>
                          <TableCell>{cls.name}</TableCell>
                          <TableCell>{cls.system}</TableCell>
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