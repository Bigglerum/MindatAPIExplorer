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

import { CrystalSystemSearch } from "@/components/crystal-system-search";
import { 
  getCrystalClasses, 
  getCrystalClassById,
  getMineralById,
  type CrystalClass
} from "@/lib/mindat-service";

// Crystal class number (cclass) to name mapping
const crystalClassMap = [
  { cclass: 1, name: "Pedial", system: "Triclinic", symbol: "1" },
  { cclass: 2, name: "Pinacoidal", system: "Triclinic", symbol: "-1" },
  { cclass: 3, name: "Sphenoidal", system: "Monoclinic", symbol: "2" },
  { cclass: 4, name: "Domatic", system: "Monoclinic", symbol: "m" },
  { cclass: 5, name: "Prismatic", system: "Monoclinic", symbol: "2/m" },
  { cclass: 6, name: "Rhombic-disphenoidal", system: "Orthorhombic", symbol: "222" },
  { cclass: 7, name: "Rhombic-pyramidal", system: "Orthorhombic", symbol: "mm2" },
  { cclass: 8, name: "Rhombic-dipyramidal", system: "Orthorhombic", symbol: "mmm" },
  { cclass: 9, name: "Tetragonal-pyramidal", system: "Tetragonal", symbol: "4" },
  { cclass: 10, name: "Tetragonal-disphenoidal", system: "Tetragonal", symbol: "-4" },
  { cclass: 11, name: "Tetragonal-dipyramidal", system: "Tetragonal", symbol: "4/m" },
  { cclass: 12, name: "Tetragonal-scalenohedral", system: "Tetragonal", symbol: "422" },
  { cclass: 13, name: "Ditetragonal-pyramidal", system: "Tetragonal", symbol: "4mm" },
  { cclass: 14, name: "Tetragonal-trapezohedral", system: "Tetragonal", symbol: "-42m" },
  { cclass: 15, name: "Ditetragonal-dipyramidal", system: "Tetragonal", symbol: "4/mmm" },
  { cclass: 16, name: "Trigonal-pyramidal", system: "Trigonal", symbol: "3" },
  { cclass: 17, name: "Rhombohedral", system: "Trigonal", symbol: "-3" },
  { cclass: 18, name: "Trigonal-trapezohedral", system: "Trigonal", symbol: "32" },
  { cclass: 19, name: "Ditrigonal-pyramidal", system: "Trigonal", symbol: "3m" },
  { cclass: 20, name: "Ditrigonal-scalenohedral", system: "Trigonal", symbol: "-3m" },
  { cclass: 21, name: "Hexagonal-pyramidal", system: "Hexagonal", symbol: "6" },
  { cclass: 22, name: "Trigonal-dipyramidal", system: "Hexagonal", symbol: "-6" },
  { cclass: 23, name: "Hexagonal-dipyramidal", system: "Hexagonal", symbol: "6/m" },
  { cclass: 24, name: "Hexagonal-trapezohedral", system: "Hexagonal", symbol: "622" },
  { cclass: 25, name: "Dihexagonal-pyramidal", system: "Hexagonal", symbol: "6mm" },
  { cclass: 26, name: "Ditrigonal-dipyramidal", system: "Hexagonal", symbol: "-62m" },
  { cclass: 27, name: "Dihexagonal-dipyramidal", system: "Hexagonal", symbol: "6/mmm" },
  { cclass: 28, name: "Tetartoidal", system: "Cubic", symbol: "23" },
  { cclass: 29, name: "Diploidal", system: "Cubic", symbol: "m-3" },
  { cclass: 30, name: "Gyroidal", system: "Cubic", symbol: "432" },
  { cclass: 31, name: "Hextetrahedral", system: "Cubic", symbol: "-43m" },
  { cclass: 32, name: "Hexoctahedral", system: "Cubic", symbol: "m-3m" }
];

export function CrystalClassesTab() {
  const [system, setSystem] = useState("all");
  const [symbol, setSymbol] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
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

  // Query to fetch crystal classes list
  const { data, isLoading, error } = useQuery({
    queryKey: ['crystalClasses', system, symbol, page, pageSize],
    queryFn: () => getCrystalClasses({ 
      system: system === 'all' ? '' : system, 
      symbol, 
      page, 
      pageSize 
    }),
  });
  
  // Query to fetch details of a selected crystal class
  const { data: classDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['crystalClass', selectedClassId],
    queryFn: () => selectedClassId ? getCrystalClassById(selectedClassId) : null,
    enabled: !!selectedClassId && dialogOpen,
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
      {/* Crystal System Mineral Search Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Search Minerals by Crystal System</CardTitle>
          <CardDescription>
            Find minerals and view their crystal system information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CrystalSystemSearch 
            onSelect={(mineral) => {
              setSelectedMineral(mineral);
              setMineralDialogOpen(true);
            }}
            selectedSystem={system}
          />
        </CardContent>
      </Card>

      {/* Crystal Classes Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filter Crystal Classes</CardTitle>
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
                placeholder="Filter by symbol (e.g., '2/m')"
                value={symbol}
                onChange={(e) => {
                  setSymbol(e.target.value);
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
              : "An error occurred while fetching crystal classes from the Mindat API."}
          </AlertDescription>
        </Alert>
      )}

      {/* Results table */}
      <Card>
        <CardHeader>
          <CardTitle>Crystal Classes</CardTitle>
          <CardDescription>
            {data ? `Showing ${Math.min((page - 1) * pageSize + 1, data.count)} - ${Math.min(page * pageSize, data.count)} of ${data.count} crystal classes` : "Loading crystal classes..."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded border overflow-x-auto">
            <Table className="min-w-[650px]">
              <TableCaption>Crystal classes from the Mindat API</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">ID</TableHead>
                  <TableHead>Crystal System</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Name</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10">
                      <div className="flex items-center justify-center space-x-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Loading crystal classes...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : data?.results.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10">
                      No crystal classes found with the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.results.map((crystalClass: CrystalClass) => (
                    <TableRow key={crystalClass.id} className="hover:bg-muted/50 cursor-pointer" 
                      onClick={() => {
                        // Show crystal class details in dialog
                        setSelectedClassId(crystalClass.id);
                        setDialogOpen(true);
                      }}
                    >
                      <TableCell>{crystalClass.id}</TableCell>
                      <TableCell>{crystalClass.system}</TableCell>
                      <TableCell className="font-mono">{crystalClass.symbol}</TableCell>
                      <TableCell>{crystalClass.name}</TableCell>
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

      {/* Crystal Class Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Crystal Class Details</DialogTitle>
            <DialogDescription>
              Information about the selected crystal class
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingDetails ? (
            <div className="flex items-center justify-center p-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : classDetails ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">ID</h4>
                  <p>{classDetails.id}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">System</h4>
                  <p>{classDetails.system}</p>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Symbol</h4>
                <p className="font-mono text-lg">{classDetails.symbol}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Name</h4>
                <p className="text-lg">{classDetails.name}</p>
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
                    if (selectedClassId) {
                      window.open(`https://api.mindat.org/crystalclasses/${selectedClassId}/`, '_blank');
                    }
                  }}
                >
                  View in API
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center p-4 text-muted-foreground">
              No details available for this crystal class.
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
                  <h4 className="text-sm font-medium text-muted-foreground">Crystal Class</h4>
                  <p>{mineralDetails.crystal_class || 'Not specified'}</p>
                </div>
              </div>
              
              {mineralDetails.cclass && (
                <div className="p-3 bg-muted/30 rounded-md mt-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Crystal Class Number</h4>
                  <p className="font-medium">{mineralDetails.cclass} 
                    {(() => {
                      const cclass = mineralDetails.cclass;
                      const classInfo = crystalClassMap.find(cls => cls.cclass === cclass);
                      return classInfo ? ` - ${classInfo.symbol} (${classInfo.name})` : '';
                    })()}
                  </p>
                </div>
              )}
              
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