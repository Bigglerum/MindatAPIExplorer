
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMineralById, searchMineralsByCrystalSystem, getCrystalClasses } from "@/lib/mindat-service";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";

interface CrystalSystemSearchProps {
  onSelect: (mineral: any) => void;
}

export function CrystalSystemSearch({ onSelect }: CrystalSystemSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [crystalClassMap, setCrystalClassMap] = useState<Record<string, any>>({});

  // Query to fetch crystal classes for mapping
  const { data: crystalClasses } = useQuery({
    queryKey: ['crystal-classes-mapping'],
    queryFn: () => getCrystalClasses({ pageSize: 100 }),
    onSuccess: (data) => {
      // Create a map of crystal class IDs to their info for easy lookup
      const classMap: Record<string, any> = {};
      if (data?.results) {
        data.results.forEach(cls => {
          classMap[cls.id.toString()] = cls;
        });
      }
      setCrystalClassMap(classMap);
    }
  });

  // Query to fetch specific mineral by name
  const { data: mineralSearchResults, isLoading: isLoadingMineralSearch } = useQuery({
    queryKey: ['minerals-by-crystal-system', searchTerm],
    queryFn: async () => {
      // First search for the mineral by name
      const results = await searchMineralsByCrystalSystem({
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

  // Function to get the crystal class information
  const getCrystalClassInfo = (cclassId: string | number) => {
    if (!cclassId) return null;
    return crystalClassMap[cclassId.toString()] || null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Input
          placeholder="Enter mineral name (e.g., Liroconite)"
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
        <div>
          <h3 className="text-lg font-semibold mb-2">Search Results</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mineral Name</TableHead>
                <TableHead>Formula</TableHead>
                <TableHead>Crystal System</TableHead>
                <TableHead>Crystal Class</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mineralSearchResults.results.map((mineral: any) => {
                const crystalClass = getCrystalClassInfo(mineral.cclass);
                
                return (
                  <TableRow key={mineral.id}>
                    <TableCell className="font-medium">{mineral.name || 'N/A'}</TableCell>
                    <TableCell dangerouslySetInnerHTML={{ __html: mineral.mindat_formula || mineral.ima_formula || 'N/A' }} />
                    <TableCell>{mineral.csystem || 'N/A'}</TableCell>
                    <TableCell>
                      {crystalClass ? `${crystalClass.name} (${crystalClass.system})` : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => onSelect(mineral)}>
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* Crystal System and Class Mapping Results */}
          {mineralSearchResults.results.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Additional Mapping Information</h3>
              
              {/* Crystal System Information */}
              <div className="mb-4">
                <h4 className="text-md font-medium mb-2">Crystal System:</h4>
                <div className="bg-muted/50 p-3 rounded-md">
                  <p className="font-medium">{mineralSearchResults.results[0].csystem || 'N/A'}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {mineralSearchResults.results[0].csystem === 'Amorphous' && 'No crystalline structure'}
                    {mineralSearchResults.results[0].csystem === 'Hexagonal' && 'Six-fold symmetry with equal axes in the horizontal plane and a different vertical axis'}
                    {mineralSearchResults.results[0].csystem === 'Icosahedral' && 'Twenty-fold symmetry, typically seen in quasicrystals'}
                    {mineralSearchResults.results[0].csystem === 'Isometric' && 'Also known as cubic, with three equal axes at right angles'}
                    {mineralSearchResults.results[0].csystem === 'Monoclinic' && 'Three unequal axes with one oblique intersection'}
                    {mineralSearchResults.results[0].csystem === 'Orthorhombic' && 'Three unequal axes at right angles'}
                    {mineralSearchResults.results[0].csystem === 'Tetragonal' && 'Three axes at right angles, two of equal length'}
                    {mineralSearchResults.results[0].csystem === 'Triclinic' && 'Three unequal axes with oblique intersections'}
                    {mineralSearchResults.results[0].csystem === 'Trigonal' && 'Three equal axes inclined at angles other than 90 degrees'}
                  </p>
                </div>
              </div>
              
              {/* Crystal Class Information */}
              {mineralSearchResults.results[0].cclass && (
                <div>
                  <h4 className="text-md font-medium mb-2">Crystal Class ID: {mineralSearchResults.results[0].cclass}</h4>
                  
                  {getCrystalClassInfo(mineralSearchResults.results[0].cclass) && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>System</TableHead>
                          <TableHead>Symbol</TableHead>
                          <TableHead>Name</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(() => {
                          const classInfo = getCrystalClassInfo(mineralSearchResults.results[0].cclass);
                          if (!classInfo) return null;
                          
                          return (
                            <TableRow key={classInfo.id}>
                              <TableCell>{classInfo.id}</TableCell>
                              <TableCell>{classInfo.system}</TableCell>
                              <TableCell>{classInfo.symbol}</TableCell>
                              <TableCell>{classInfo.name}</TableCell>
                            </TableRow>
                          );
                        })()}
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
