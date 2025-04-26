import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchMineralsByStrunzClass, getStrunzClassById } from "@/lib/mindat-service";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";

interface StrunzSearchProps {
  onSelect: (mineral: any) => void;
  selectedStrunzClass?: string;
}

export function StrunzSearch({ onSelect, selectedStrunzClass = "" }: StrunzSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Query to fetch minerals by Strunz classification
  const { data: mineralSearchResults, isLoading: isLoadingMineralSearch } = useQuery({
    queryKey: ['minerals-by-strunz', searchTerm, selectedStrunzClass],
    queryFn: () => searchMineralsByStrunzClass({
      name: searchTerm,
      strunz_class: selectedStrunzClass || undefined,
      limit: 10
    }),
    enabled: isSearching && searchTerm.length > 2
  });

  // Query to fetch mapped data
  const { data: mappedData, isLoading: isLoadingMappedData } = useQuery({
    queryKey: ['mapped-data', mineralSearchResults?.results?.map(mineral => mineral.id)],
    queryFn: () => {
      if (!mineralSearchResults || !mineralSearchResults.results) return {};
      return Promise.all(mineralSearchResults.results.map(mineral => getStrunzClassById(mineral.id)))
        .then(results => results.reduce((acc, curr) => ({...acc, [curr.id]: curr.strunz_class}), {}));
    },
    enabled: !!mineralSearchResults && mineralSearchResults.results.length > 0
  })


  // Function to handle mineral search
  const handleSearch = () => {
    if (searchTerm.length > 2) {
      setIsSearching(true);
    }
  };

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

      {isLoadingMineralSearch && (
        <div className="flex items-center space-x-2 py-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Searching minerals...</span>
        </div>
      )}

      {isSearching && mineralSearchResults && (
        <div className="rounded border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Strunz Classification</TableHead>
                <TableHead>Crystal System</TableHead>
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
                mineralSearchResults.results.map((mineral: any) => (
                  <TableRow key={mineral.id} className="hover:bg-muted/50 cursor-pointer"
                    onClick={() => onSelect(mineral)}
                  >
                    <TableCell>{mineral.name}</TableCell>
                    <TableCell>{mappedData?.[mineral.id] || mineral.strunz_class || "-"}</TableCell>
                    <TableCell>{mineral.crystal_system || "-"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}