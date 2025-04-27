import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { searchMineralsByCrystalSystem } from "@/lib/mindat-service";

interface CrystalSystemSearchProps {
  onSelect: (mineral: any) => void;
}

export function CrystalSystemSearch({ onSelect }: CrystalSystemSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Query to fetch minerals by crystal system
  const { data: mineralSearchResults, isLoading: isLoadingMineralSearch } = useQuery({
    queryKey: ['minerals-by-crystal-system', searchTerm],
    queryFn: async () => {
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
                  <TableHead>Crystal System</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mineralSearchResults.results.map((mineral: any) => (
                  <TableRow key={mineral.id}>
                    <TableCell className="font-medium">{mineral.name || 'N/A'}</TableCell>
                    <TableCell dangerouslySetInnerHTML={{ __html: mineral.mindat_formula || mineral.ima_formula || 'N/A' }} />
                    <TableCell>{mineral.crystal_system || 'N/A'}</TableCell>
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

          {/* Crystal System and Class Mapping Results */}
          {mineralSearchResults.results.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Crystal System Information</h3>

              <div className="mb-4">
                <h4 className="text-md font-medium mb-2">Crystal System: {mineralSearchResults.results[0].crystal_system || 'N/A'}</h4>
                <div className="bg-muted/50 p-3 rounded-md">
                  <p className="text-sm text-muted-foreground">
                    Crystal systems are a way of classifying crystals according to their atomic arrangement.
                  </p>
                </div>
              </div>

              {/* Crystal System Table */}
              <div>
                <h4 className="text-md font-medium mb-2">Crystal Systems Overview</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>System</TableHead>
                      <TableHead>Characteristics</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Triclinic</TableCell>
                      <TableCell>Three unequal axes, all intersecting at oblique angles.</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Monoclinic</TableCell>
                      <TableCell>Three unequal axes, one perpendicular to the other two.</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Orthorhombic</TableCell>
                      <TableCell>Three unequal axes, all perpendicular to each other.</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Tetragonal</TableCell>
                      <TableCell>Three axes, two equal and one different, all perpendicular.</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Hexagonal</TableCell>
                      <TableCell>Four axes, three equal and coplanar at 120°, fourth axis perpendicular.</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Trigonal/Rhombohedral</TableCell>
                      <TableCell>Three equal axes, all intersecting at equal oblique angles.</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Cubic/Isometric</TableCell>
                      <TableCell>Three equal axes, all perpendicular to each other.</TableCell>
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