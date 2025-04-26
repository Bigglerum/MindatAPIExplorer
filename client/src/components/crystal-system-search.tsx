import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchMineralsByCrystalSystem, getCrystalClasses, getCrystalClassById } from "@/lib/mindat-service";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";

interface CrystalSystemSearchProps {
  onSelect: (mineral: any) => void;
  selectedSystem?: string;
}

export function CrystalSystemSearch({ onSelect, selectedSystem = "" }: CrystalSystemSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Query to fetch minerals by crystal system/class
  const { data: mineralSearchResults, isLoading: isLoadingMineralSearch } = useQuery({
    queryKey: ['minerals-by-crystal', searchTerm, selectedSystem],
    queryFn: () => searchMineralsByCrystalSystem({
      name: searchTerm,
      crystal_system: selectedSystem === 'all' ? undefined : selectedSystem,
      limit: 10
    }),
    enabled: isSearching && searchTerm.length > 2
  });

  // Get all available crystal classes for mapping
  const { data: crystalClasses } = useQuery({
    queryKey: ['crystal-classes-mapping'],
    queryFn: () => getCrystalClasses({ pageSize: 100 })
  });

  // Function to handle mineral search
  const handleSearch = () => {
    if (searchTerm.length > 2) {
      setIsSearching(true);
    }
  };

  // Function to lookup crystal class info by ID
  const getCrystalClassInfo = (classId: number | string) => {
    if (!crystalClasses?.results) return null;
    return crystalClasses.results.find(cls => cls.id === Number(classId));
  };

  if (isLoadingMineralSearch) {
    return (
      <div className="flex items-center space-x-2 py-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Searching minerals...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Enter mineral name (e.g., Quartz, Calcite)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSearch();
            }
          }}
        />
        <Button type="button" onClick={handleSearch}>
          Search
        </Button>
      </div>

      {isSearching && mineralSearchResults && (
        <div className="rounded border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Crystal System</TableHead>
                <TableHead>Crystal Class</TableHead>
                <TableHead>Class Info</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mineralSearchResults.results.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4">
                    No minerals found matching "{searchTerm}"
                  </TableCell>
                </TableRow>
              ) : (
                mineralSearchResults.results.map((mineral: any) => {
                  // Lookup crystal class in the mapping table
                  const crystalClassId = mineral.crystal_class || null;
                  const classInfo = crystalClassId ? getCrystalClassInfo(crystalClassId) : null;
                  
                  return (
                    <TableRow key={mineral.id} className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => onSelect(mineral)}
                    >
                      <TableCell>{mineral.name}</TableCell>
                      <TableCell>{mineral.crystal_system || "-"}</TableCell>
                      <TableCell>{mineral.crystal_class || "-"}</TableCell>
                      <TableCell>
                        {classInfo ? (
                          <div>
                            <div><strong>System:</strong> {classInfo.system}</div>
                            <div><strong>Symbol:</strong> {classInfo.symbol}</div>
                            <div><strong>Name:</strong> {classInfo.name}</div>
                          </div>
                        ) : "-"}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}