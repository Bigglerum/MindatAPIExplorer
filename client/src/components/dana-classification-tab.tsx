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

import { DanaSearch } from "@/components/dana-search";
import { 
  getDanaClassification, 
  getDanaClassById, 
  getMineralById,
  type DanaClass
} from "@/lib/mindat-service";

export function DanaClassificationTab() {
  const [codeFilter, setCodeFilter] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [selectedDanaId, setSelectedDanaId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Mineral display state
  const [selectedMineral, setSelectedMineral] = useState<any>(null);
  const [mineralDialogOpen, setMineralDialogOpen] = useState(false);

  // Query to fetch Dana classes list
  const { data, isLoading, error } = useQuery({
    queryKey: ['danaClasses', codeFilter, nameFilter, page, pageSize],
    queryFn: () => getDanaClassification({ 
      code: codeFilter, 
      name: nameFilter, 
      page, 
      pageSize 
    }),
  });
  
  // Query to fetch details of a selected Dana class
  const { data: danaDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['danaClass', selectedDanaId],
    queryFn: () => selectedDanaId ? getDanaClassById(selectedDanaId) : null,
    enabled: !!selectedDanaId && dialogOpen,
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
      {/* Dana Classification Mineral Search Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Search Minerals by Dana Classification</CardTitle>
          <CardDescription>
            Find minerals and view their Dana classification information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DanaSearch 
            onSelect={(mineral) => {
              setSelectedMineral(mineral);
              setMineralDialogOpen(true);
            }}
          />
        </CardContent>
      </Card>

      {/* Dana Classification Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filter Dana Classes</CardTitle>
          <CardDescription>
            Use these filters to narrow down your search
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Dana Code</label>
              <Input
                placeholder="Filter by code (e.g., '01.01.01')"
                value={codeFilter}
                onChange={(e) => {
                  setCodeFilter(e.target.value);
                  setPage(1); // Reset to first page on filter change
                }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Class Name</label>
              <Input
                placeholder="Filter by name"
                value={nameFilter}
                onChange={(e) => {
                  setNameFilter(e.target.value);
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
              : "An error occurred while fetching Dana classification from the Mindat API."}
          </AlertDescription>
        </Alert>
      )}

      {/* Results table */}
      <Card>
        <CardHeader>
          <CardTitle>Dana Classification</CardTitle>
          <CardDescription>
            {data ? `Showing ${Math.min((page - 1) * pageSize + 1, data.count)} - ${Math.min(page * pageSize, data.count)} of ${data.count} Dana classes` : "Loading Dana classes..."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded border overflow-x-auto">
            <Table className="min-w-[650px]">
              <TableCaption>Dana classification from the Mindat API</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">ID</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-10">
                      <div className="flex items-center justify-center space-x-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Loading Dana classes...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : data?.results.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-10">
                      No Dana classes found with the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.results.map((danaClass: DanaClass) => (
                    <TableRow key={danaClass.id} className="hover:bg-muted/50 cursor-pointer" 
                      onClick={() => {
                        // Show Dana class details in dialog
                        setSelectedDanaId(danaClass.id);
                        setDialogOpen(true);
                      }}
                    >
                      <TableCell>{danaClass.id}</TableCell>
                      <TableCell className="font-mono">{danaClass.code}</TableCell>
                      <TableCell>{danaClass.name}</TableCell>
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

      {/* Dana Classification Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Dana Classification Details</DialogTitle>
            <DialogDescription>
              Information about the selected Dana class
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingDetails ? (
            <div className="flex items-center justify-center p-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : danaDetails ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">ID</h4>
                  <p>{danaDetails.id}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Code</h4>
                  <p className="font-mono">{danaDetails.code}</p>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Name</h4>
                <p className="text-lg">{danaDetails.name}</p>
              </div>
              
              {danaDetails.description && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Description</h4>
                  <p>{danaDetails.description}</p>
                </div>
              )}
              
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
                    if (selectedDanaId) {
                      window.open(`https://api.mindat.org/dana-8/${selectedDanaId}/`, '_blank');
                    }
                  }}
                >
                  View in API
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center p-4 text-muted-foreground">
              No details available for this Dana class.
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
                  <h4 className="text-sm font-medium text-muted-foreground">Dana Classification</h4>
                  <p className="font-mono">{mineralDetails.dana_classification || 'Not specified'}</p>
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