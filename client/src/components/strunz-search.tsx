
import React, { useState } from "react";
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

  // Query to fetch minerals by Strunz classification
  const { data: mineralSearchResults, isLoading: isLoadingMineralSearch } = useQuery({
    queryKey: ['minerals-by-strunz', searchTerm],
    queryFn: () => searchMineralsByStrunzClass({
      name: searchTerm,
      limit: 10
    }),
    enabled: isSearching && searchTerm.length > 2
  });

  // Get Strunz classification data for mapping
  const { data: strunzClasses } = useQuery({
    queryKey: ['strunz-classifications-mapping'],
    queryFn: () => getStrunzClassification({ pageSize: 100 })
  });

  // Function to handle mineral search
  const handleSearch = () => {
    if (searchTerm.length > 2) {
      setIsSearching(true);
    }
  };

  // Function to lookup Strunz class info by code
  const getStrunzClassInfo = (strunzCode: string) => {
    if (!strunzClasses?.results || !strunzCode) return null;
    
    // Extract the main Strunz class (first part of the code)
    const mainClass = strunzCode.split('.')[0];
    return strunzClasses.results.find(cls => cls.code.startsWith(mainClass));
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
                <TableHead>Strunz Code</TableHead>
                <TableHead>Strunz Classification</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mineralSearchResults.results.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-4">
                    No minerals found matching "{searchTerm}"
                  </TableCell>
                </TableRow>
              ) : (
                mineralSearchResults.results.map((mineral: any) => {
                  // Lookup Strunz class in the mapping table
                  const strunzCode = mineral.strunz_code || mineral.strunz_classification;
                  const classInfo = strunzCode ? getStrunzClassInfo(strunzCode) : null;
                  
                  return (
                    <TableRow key={mineral.id} className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => onSelect(mineral)}
                    >
                      <TableCell>{mineral.name}</TableCell>
                      <TableCell>{strunzCode || "-"}</TableCell>
                      <TableCell>
                        {classInfo ? (
                          <div>
                            <div><strong>{classInfo.name}</strong></div>
                            <div>{classInfo.description || ""}</div>
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
