import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { searchMineralsBySystem } from '@/lib/mindat-service';

interface CrystalSystemMineralSearchProps {
  system?: string;
  class?: string;
  onSelect: (mineral: any) => void;
}

export default function CrystalSystemMineralSearch({ 
  system, 
  class: crystalClass,
  onSelect 
}: CrystalSystemMineralSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Query for minerals matching the search term and crystal system/class
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['minerals-by-crystal-system', searchTerm, system, crystalClass],
    queryFn: () => searchMineralsBySystem({ 
      name: searchTerm, 
      crystal_system: system, 
      crystal_class: crystalClass 
    }),
    enabled: isSearching,
  });

  const handleSearch = () => {
    setIsSearching(true);
    refetch();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Search for minerals by name (e.g., Quartz, Galena)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={handleKeyPress}
          className="flex-grow"
        />
        <Button onClick={handleSearch}>Search</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-4">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="text-sm text-destructive">
          Error fetching minerals. Please try again.
        </div>
      ) : data && isSearching ? (
        <div className="rounded border overflow-x-auto max-h-[300px]">
          <Table className="min-w-full">
            <TableHeader>
              <TableRow>
                <TableHead>Mineral Name</TableHead>
                <TableHead>Crystal System</TableHead>
                <TableHead>Crystal Class</TableHead>
                <TableHead>Formula</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.results.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4">
                    No minerals found matching "{searchTerm}" in this crystal system/class.
                  </TableCell>
                </TableRow>
              ) : (
                data.results.map((mineral: any) => (
                  <TableRow 
                    key={mineral.id} 
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() => onSelect(mineral)}
                  >
                    <TableCell>{mineral.name}</TableCell>
                    <TableCell>{mineral.crystal_system || '—'}</TableCell>
                    <TableCell>{mineral.crystal_class || '—'}</TableCell>
                    <TableCell className="font-mono">{mineral.formula || mineral.ima_formula || '—'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      ) : null}
      
      {isSearching && data && data.count > 0 && (
        <div className="text-sm text-muted-foreground text-right">
          Showing {Math.min(data.results.length, data.count)} of {data.count} minerals
        </div>
      )}
    </div>
  );
}