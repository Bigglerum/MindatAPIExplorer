import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { searchMineralSpecies } from '@/lib/mindat-service';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MineralSpeciesSearchProps {
  onSelect?: (mineral: any) => void;
  showDetails?: boolean;
}

export function MineralSpeciesSearch({ onSelect, showDetails = true }: MineralSpeciesSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    
    setIsSearching(true);
    setSearchError(null);
    
    try {
      const response = await searchMineralSpecies(searchTerm);
      setSearchResults(response.results || []);
      
      if (response.results?.length === 0) {
        setSearchError(`No minerals found matching "${searchTerm}"`);
      }
    } catch (error) {
      console.error('Error searching minerals:', error);
      setSearchError('Failed to search minerals. Please try again.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="w-full">
      <div className="flex gap-2 mb-4">
        <Input
          placeholder="Search mineral species..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1"
        />
        <Button onClick={handleSearch} disabled={isSearching || !searchTerm.trim()}>
          {isSearching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
          Search
        </Button>
      </div>

      {searchError && (
        <div className="text-sm text-red-500 mb-2">{searchError}</div>
      )}

      {searchResults.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Search Results</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <ScrollArea className="h-[300px]">
              <div className="w-full overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Formula</TableHead>
                      {showDetails && <TableHead>System</TableHead>}
                      {showDetails && <TableHead>Class</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchResults.map((mineral) => (
                      <TableRow 
                        key={mineral.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => onSelect && onSelect(mineral)}
                      >
                        <TableCell className="font-medium">{mineral.name}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {mineral.mindat_formula || mineral.ima_formula || mineral.formula || '-'}
                        </TableCell>
                        {showDetails && (
                          <TableCell>{mineral.crystal_system || '-'}</TableCell>
                        )}
                        {showDetails && (
                          <TableCell>{mineral.crystal_class || '-'}</TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </CardContent>
          <CardFooter className="pt-2">
            <div className="text-sm text-muted-foreground">
              Found {searchResults.length} mineral{searchResults.length !== 1 ? 's' : ''}
            </div>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}