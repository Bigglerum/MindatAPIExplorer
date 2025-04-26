import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";

import { SpaceGroupSearch } from "@/components/space-group-search";
import { 
  getSpaceGroups, 
  getSpaceGroupById, 
  getMineralById,
  type SpaceGroup
} from "@/lib/mindat-service";

export function SpaceGroupsTab() {
  const [system, setSystem] = useState("all");
  const [symbolHM, setSymbolHM] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Mineral display state
  const [selectedMineral, setSelectedMineral] = useState<any>(null);
  const [mineralDialogOpen, setMineralDialogOpen] = useState(false);
  
  // Crystal system options
  const CrystalSystemOptions = [
    { value: "all", label: "All Crystal Systems" },
    { value: "Cubic", label: "Cubic (Isometric)" },
    { value: "Hexagonal", label: "Hexagonal" },
    { value: "Monoclinic", label: "Monoclinic" },
    { value: "Orthorhombic", label: "Orthorhombic" },
    { value: "Tetragonal", label: "Tetragonal" },
    { value: "Triclinic", label: "Triclinic" },
    { value: "Trigonal", label: "Trigonal" },
  ];

  // Query to fetch space groups list
  const { data, isLoading, error } = useQuery({
    queryKey: ['spaceGroups', system, symbolHM, page, pageSize],
    queryFn: () => getSpaceGroups({ 
      system: system === 'all' ? '' : system, 
      symbol_h_m: symbolHM, 
      page, 
      pageSize 
    }),
  });
  
  // Query to fetch details of a selected space group
  const { data: groupDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['spaceGroup', selectedGroupId],
    queryFn: () => selectedGroupId ? getSpaceGroupById(selectedGroupId) : null,
    enabled: !!selectedGroupId && dialogOpen,
  });

  // Query to fetch details of a selected mineral
  const { data: mineralDetails, isLoading: isLoadingMineralDetails } = useQuery({
    queryKey: ['mineral', selectedMineral?.id],
    queryFn: () => selectedMineral?.id ? getMineralById(selectedMineral.id) : null,
    enabled: !!selectedMineral?.id && mineralDialogOpen,
  });

  // Check if we can go to the next/previous page
  const canPrevPage = page > 1;
  const canNextPage = data ? (page * pageSize) < data.count : false;

  // Handle pagination
  const goToPrevPage = () => setPage((prev) => Math.max(prev - 1, 1));
  const goToNextPage = () => setPage((prev) => prev + 1);

  return (
    <div>
      {/* Space Group Mineral Search Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Search Minerals by Space Group</CardTitle>
          <CardDescription>
            Find minerals and view their space group information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SpaceGroupSearch 
            onSelect={(mineral) => {
              setSelectedMineral(mineral);
              setMineralDialogOpen(true);
            }}
            selectedSystem={system}
          />
        </CardContent>
      </Card>

      {/* Space Groups Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filter Space Groups</CardTitle>
          <CardDescription>
            Use these filters to narrow down your search
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Crystal System</label>
              <Select
                value={system}
                onValueChange={(value) => {
                  setSystem(value);
                  setPage(1); // Reset to first page on filter change
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Crystal System" />
                </SelectTrigger>
                <SelectContent>
                  {CrystalSystemOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Hermann-Mauguin Symbol</label>
              <Input
                placeholder="Filter by symbol (e.g., 'P21/c')"
                value={symbolHM}
                onChange={(e) => {
                  setSymbolHM(e.target.value);
                  setPage(1); // Reset to first page on filter change
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error state */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error instanceof Error 
              ? error.message 
              : "An error occurred while fetching space groups from the Mindat API."}
          </AlertDescription>
        </Alert>
      )}

      {/* Results table */}
      <Card>
        <CardHeader>
          <CardTitle>Space Groups</CardTitle>
          <CardDescription>
            {data ? `Showing ${Math.min((page - 1) * pageSize + 1, data.count)} - ${Math.min(page * pageSize, data.count)} of ${data.count} space groups` : "Loading space groups..."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded border overflow-x-auto">
            <Table className="min-w-[650px]">
              <TableCaption>Space groups from the Mindat API</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">ID</TableHead>
                  <TableHead>System</TableHead>
                  <TableHead>Number</TableHead>
                  <TableHead>H-M Symbol</TableHead>
                  <TableHead>Schoenflies</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10">
                      <div className="flex items-center justify-center space-x-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Loading space groups...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : data?.results.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10">
                      No space groups found with the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.results.map((spaceGroup: SpaceGroup) => (
                    <TableRow key={spaceGroup.id} className="hover:bg-muted/50 cursor-pointer" 
                      onClick={() => {
                        // Show space group details in dialog
                        setSelectedGroupId(spaceGroup.id);
                        setDialogOpen(true);
                      }}
                    >
                      <TableCell>{spaceGroup.id}</TableCell>
                      <TableCell>{spaceGroup.system}</TableCell>
                      <TableCell>{spaceGroup.number || '-'}</TableCell>
                      <TableCell className="font-mono">{spaceGroup.symbol_h_m || '-'}</TableCell>
                      <TableCell className="font-mono">{spaceGroup.symbol_schoenflies || '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline" 
            disabled={!canPrevPage} 
            onClick={goToPrevPage}
          >
            Previous
          </Button>
          <div className="text-sm text-muted-foreground">
            Page {page} of {data ? Math.ceil(data.count / pageSize) : 1}
          </div>
          <Button 
            variant="outline" 
            disabled={!canNextPage} 
            onClick={goToNextPage}
          >
            Next
          </Button>
        </CardFooter>
      </Card>

      {/* Space Group Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Space Group Details</DialogTitle>
            <DialogDescription>
              Information about the selected space group
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingDetails ? (
            <div className="flex items-center justify-center p-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : groupDetails ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">ID</h4>
                  <p>{groupDetails.id}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">System</h4>
                  <p>{groupDetails.system}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Number</h4>
                  <p>{groupDetails.number || 'Not specified'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Setting</h4>
                  <p>{groupDetails.setting || 'Not specified'}</p>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Hermann-Mauguin Symbol</h4>
                <p className="font-mono text-lg">{groupDetails.symbol_h_m || 'Not specified'}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Schoenflies Symbol</h4>
                <p className="font-mono">{groupDetails.symbol_schoenflies || 'Not specified'}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Hall Symbol</h4>
                <p className="font-mono">{groupDetails.symbol_hall || 'Not specified'}</p>
              </div>
              
              <div className="pt-4 flex justify-between">
                <Button 
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Close
                </Button>
                <Button
                  variant="default"
                  onClick={() => {
                    if (selectedGroupId) {
                      window.open(`https://api.mindat.org/spacegroups/${selectedGroupId}/`, '_blank');
                    }
                  }}
                >
                  View in API
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center p-4 text-muted-foreground">
              No details available for this space group.
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Mineral Details Dialog */}
      <Dialog open={mineralDialogOpen} onOpenChange={setMineralDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Mineral Details</DialogTitle>
            <DialogDescription>
              Information about the selected mineral species
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingMineralDetails ? (
            <div className="flex items-center justify-center p-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : mineralDetails ? (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Mineral Name</h4>
                <p className="text-lg font-bold">{mineralDetails.name}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Chemical Formula</h4>
                <p className="font-mono">{mineralDetails.formula || mineralDetails.ima_formula || mineralDetails.mindat_formula || 'Not available'}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Crystal System</h4>
                  <p>{mineralDetails.crystal_system || 'Not specified'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Space Group</h4>
                  <p className="font-mono">{mineralDetails.space_group || 'Not specified'}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">IMA Status</h4>
                  <p>{mineralDetails.ima_status || 'Not specified'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Year First Published</h4>
                  <p>{mineralDetails.year_first_published || 'Not specified'}</p>
                </div>
              </div>
              
              {mineralDetails.description && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Description</h4>
                  <p className="text-sm">{mineralDetails.description}</p>
                </div>
              )}
              
              <div className="pt-4 flex justify-between">
                <Button 
                  variant="outline"
                  onClick={() => setMineralDialogOpen(false)}
                >
                  Close
                </Button>
                <Button
                  variant="default"
                  onClick={() => {
                    if (selectedMineral?.id) {
                      window.open(`https://www.mindat.org/min-${selectedMineral.id}.html`, '_blank');
                    }
                  }}
                >
                  View on Mindat.org
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center p-4 text-muted-foreground">
              No details available for this mineral.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}