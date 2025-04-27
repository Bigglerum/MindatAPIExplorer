import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchMineralsByStrunzClass, getStrunzClassification } from "@/lib/mindat-service";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";

interface StrunzSearchProps {
  onSelect: (mineral: any) => void;
}

export function StrunzSearch({ onSelect }: StrunzSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [strunzClassMap, setStrunzClassMap] = useState<Record<string, any>>({});

  // Query to fetch Strunz classifications for mapping
  const { data: strunzClasses } = useQuery({
    queryKey: ['strunz-classifications-mapping'],
    queryFn: () => getStrunzClassification({ pageSize: 100 }),
    onSuccess: (data) => {
      // Create a map of Strunz class codes to their info for easy lookup
      const classMap: Record<string, any> = {};
      if (data?.results) {
        data.results.forEach(cls => {
          classMap[cls.code] = cls;
        });
      }
      setStrunzClassMap(classMap);
    }
  });

  // Query to fetch minerals by Strunz classification
  const { data: mineralSearchResults, isLoading: isLoadingMineralSearch } = useQuery({
    queryKey: ['minerals-by-strunz', searchTerm],
    queryFn: () => searchMineralsByStrunzClass({
      name: searchTerm,
      limit: 10
    }),
    enabled: isSearching && searchTerm.length > 2
  });

  // Function to handle mineral search
  const handleSearch = () => {
    if (searchTerm.length > 2) {
      setIsSearching(true);
    }
  };

  // Function to get Strunz class info by code
  const getStrunzClassInfo = (strunzCode: string) => {
    if (!strunzCode || !strunzClassMap[strunzCode]) {
      // Try to find a matching prefix
      const prefix = strunzCode?.split('.')[0];
      if (prefix) {
        for (const code in strunzClassMap) {
          if (code.startsWith(prefix)) {
            return strunzClassMap[code];
          }
        }
      }
      return null;
    }
    return strunzClassMap[strunzCode];
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Input
          placeholder="Enter mineral name (e.g., Galena)"
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
                <TableHead>Strunz Code</TableHead>
                <TableHead>Strunz Classification</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mineralSearchResults.results.map((mineral: any) => {
                const strunzInfo = getStrunzClassInfo(mineral.strunz_code);

                return (
                  <TableRow key={mineral.id}>
                    <TableCell className="font-medium">{mineral.name || 'N/A'}</TableCell>
                    <TableCell dangerouslySetInnerHTML={{ __html: mineral.mindat_formula || mineral.ima_formula || 'N/A' }} />
                    <TableCell>{mineral.strunz_code || 'N/A'}</TableCell>
                    <TableCell>
                      {strunzInfo ? `${strunzInfo.name}` : 'N/A'}
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

          {/* Strunz Classification Mapping Results */}
          {mineralSearchResults.results.length > 0 && mineralSearchResults.results[0].strunz_code && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Additional Mapping Information</h3>

              {/* Strunz Classification Information */}
              <div className="mb-4">
                <h4 className="text-md font-medium mb-2">Strunz Classification:</h4>
                <div className="bg-muted/50 p-3 rounded-md">
                  <p className="font-medium">Strunz Code: {mineralSearchResults.results[0].strunz_code}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Full Strunz Classification: {mineralSearchResults.results[0].strunz_classification || mineralSearchResults.results[0].strunz_code || 'N/A'}
                  </p>
                </div>
              </div>

              {getStrunzClassInfo(mineralSearchResults.results[0].strunz_code) && (
                <div>
                  <h4 className="text-md font-medium mb-2">Strunz Class Mapping:</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        const classInfo = getStrunzClassInfo(mineralSearchResults.results[0].strunz_code);
                        if (!classInfo) return null;

                        return (
                          <TableRow key={classInfo.code}>
                            <TableCell className="font-medium">{classInfo.code}</TableCell>
                            <TableCell>{classInfo.name}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {classInfo.description || 'No additional description available'}
                            </TableCell>
                          </TableRow>
                        );
                      })()}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}