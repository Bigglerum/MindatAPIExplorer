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
        return await searchMineralsByCrystalSystem({
          crystal_class_number: cclassNum,
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

  // Find the crystal class info for a given cclass value
  const getCrystalClassInfo = (cclass: number) => {
    return crystalClassMap.find(cls => cls.cclass === cclass) || null;
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
              {mineralSearchResults.results[0].cclass && (
                <div className="mb-4 p-4 border rounded-md bg-muted/30">
                  <h4 className="text-md font-medium mb-2">
                    Crystal Class Information for {mineralSearchResults.results[0].name}
                  </h4>
                  
                  {(() => {
                    const cclass = mineralSearchResults.results[0].cclass;
                    const classInfo = getCrystalClassInfo(cclass);
                    
                    if (classInfo) {
                      return (
                        <div className="space-y-2">
                          <p><span className="font-medium">Crystal Class Number:</span> {cclass}</p>
                          <p><span className="font-medium">Crystal Class Name:</span> {classInfo.name}</p>
                          <p><span className="font-medium">Crystal System:</span> {classInfo.system}</p>
                          <p><span className="font-medium">Hermann-Mauguin Symbol:</span> {classInfo.symbol}</p>
                        </div>
                      );
                    } else {
                      return (
                        <p>Crystal class information not available for class number {cclass}.</p>
                      );
                    }
                  })()}
                </div>
              )}

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