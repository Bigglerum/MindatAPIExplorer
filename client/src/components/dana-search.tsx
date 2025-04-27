
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchMineralsByDanaClass, getDanaClassification } from "@/lib/mindat-service";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";

interface DanaSearchProps {
  onSelect: (mineral: any) => void;
}

export function DanaSearch({ onSelect }: DanaSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [danaClassMap, setDanaClassMap] = useState<Record<string, any>>({});

  // Query to fetch Dana classifications for mapping
  const { data: danaClasses } = useQuery({
    queryKey: ['dana-classifications-mapping'],
    queryFn: () => getDanaClassification({ pageSize: 100 }),
    onSuccess: (data) => {
      // Create a map of Dana class codes to their info for easy lookup
      const classMap: Record<string, any> = {};
      if (data?.results) {
        data.results.forEach(cls => {
          classMap[cls.code] = cls;
        });
      }
      setDanaClassMap(classMap);
    }
  });

  // Query to fetch minerals by Dana classification
  const { data: mineralSearchResults, isLoading: isLoadingMineralSearch } = useQuery({
    queryKey: ['minerals-by-dana', searchTerm],
    queryFn: () => searchMineralsByDanaClass({
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

  // Function to get Dana class info by code
  const getDanaClassInfo = (danaCode: string) => {
    if (!danaCode || !danaClassMap[danaCode]) {
      // Try to find a matching prefix
      const prefix = danaCode?.split('.')[0];
      if (prefix) {
        for (const code in danaClassMap) {
          if (code.startsWith(prefix)) {
            return danaClassMap[code];
          }
        }
      }
      return null;
    }
    return danaClassMap[danaCode];
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
        <div>
          <h3 className="text-lg font-semibold mb-2">Search Results</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mineral Name</TableHead>
                <TableHead>Formula</TableHead>
                <TableHead>Dana Code</TableHead>
                <TableHead>Dana Classification</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mineralSearchResults.results.map((mineral: any) => {
                const danaInfo = getDanaClassInfo(mineral.dana_code);
                
                return (
                  <TableRow key={mineral.id}>
                    <TableCell className="font-medium">{mineral.name || 'N/A'}</TableCell>
                    <TableCell>{mineral.mindat_formula || mineral.ima_formula || 'N/A'}</TableCell>
                    <TableCell>{mineral.dana_code || 'N/A'}</TableCell>
                    <TableCell>
                      {danaInfo ? `${danaInfo.name}` : 'N/A'}
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

          {/* Dana Mapping Results */}
          {mineralSearchResults.results.length > 0 && mineralSearchResults.results[0].dana_code && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Dana Classification Mapping</h3>
              <p className="mb-2">
                Dana Code: {mineralSearchResults.results[0].dana_code}
              </p>
              
              {getDanaClassInfo(mineralSearchResults.results[0].dana_code) && (
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
                      const classInfo = getDanaClassInfo(mineralSearchResults.results[0].dana_code);
                      if (!classInfo) return null;
                      
                      return (
                        <TableRow key={classInfo.id}>
                          <TableCell>{classInfo.code}</TableCell>
                          <TableCell>{classInfo.name}</TableCell>
                          <TableCell>{classInfo.description || 'N/A'}</TableCell>
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
  );
}
