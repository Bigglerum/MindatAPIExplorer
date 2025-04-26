import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, MessageCircle } from "lucide-react";
import Layout from "@/components/layout";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiStatusIndicator } from "@/components/ui/api-status-indicator";
import { 
  getCrystalClasses, 
  getSpaceGroups,
  getDanaClassification,
  getStrunzClassification,
  type CrystalClass,
  type SpaceGroup,
  type DanaClass,
  type StrunzClass
} from "@/lib/mindat-service";

// Helper function for page navigation
function calculatePageIndicators(page: number, total: number, pageSize: number) {
  const startItem = Math.min((page - 1) * pageSize + 1, total);
  const endItem = Math.min(page * pageSize, total);
  const totalPages = Math.ceil(total / pageSize);
  return { startItem, endItem, totalPages };
}

// Main component
export default function MineralReference() {
  return (
    <Layout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Mineralogical Reference Data</h1>
        
        {/* API Status Indicator */}
        <div className="mb-6">
          <ApiStatusIndicator />
        </div>
        
        <Tabs defaultValue="crystal-classes">
          <TabsList className="mb-4">
            <TabsTrigger value="crystal-classes">Crystal Classes</TabsTrigger>
            <TabsTrigger value="space-groups">Space Groups</TabsTrigger>
            <TabsTrigger value="dana">Dana Classification</TabsTrigger>
            <TabsTrigger value="strunz">Strunz Classification</TabsTrigger>
          </TabsList>
          
          <TabsContent value="crystal-classes">
            <CrystalClassesTab />
          </TabsContent>
          
          <TabsContent value="space-groups">
            <SpaceGroupsTab />
          </TabsContent>
          
          <TabsContent value="dana">
            <DanaClassificationTab />
          </TabsContent>
          
          <TabsContent value="strunz">
            <StrunzClassificationTab />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

// Crystal Classes Tab Component
function CrystalClassesTab() {
  const [system, setSystem] = useState("all");
  const [symbol, setSymbol] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

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

  // Check if we can go to the next/previous page
  const canPrevPage = page > 1;
  const canNextPage = data ? (page * pageSize) < data.count : false;

  // Handle pagination
  const goToPrevPage = () => setPage((prev) => Math.max(prev - 1, 1));
  const goToNextPage = () => setPage((prev) => prev + 1);

  return (
    <div>
      {/* Filters */}
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
    </div>
  );
}

// Space Groups Tab Component
function SpaceGroupsTab() {
  const [system, setSystem] = useState("all");
  const [symbol, setSymbol] = useState("");
  const [number, setNumber] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Crystal system options
  const CrystalSystemOptions = [
    { value: "all", label: "All Crystal Systems" },
    { value: "Cubic", label: "Cubic" },
    { value: "Hexagonal", label: "Hexagonal" },
    { value: "Monoclinic", label: "Monoclinic" },
    { value: "Orthorhombic", label: "Orthorhombic" },
    { value: "Tetragonal", label: "Tetragonal" },
    { value: "Triclinic", label: "Triclinic" },
    { value: "Trigonal", label: "Trigonal" },
  ];

  // Query to fetch space groups list
  const { data, isLoading, error } = useQuery({
    queryKey: ['spaceGroups', system, symbol, number, page, pageSize],
    queryFn: () => getSpaceGroups({ 
      system: system === 'all' ? '' : system, 
      symbol_h_m: symbol,
      number: number ? parseInt(number) : undefined,
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

  // Check if we can go to the next/previous page
  const canPrevPage = page > 1;
  const canNextPage = data ? (page * pageSize) < data.count : false;

  // Handle pagination
  const goToPrevPage = () => setPage((prev) => Math.max(prev - 1, 1));
  const goToNextPage = () => setPage((prev) => prev + 1);

  return (
    <div>
      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filter Space Groups</CardTitle>
          <CardDescription>
            Use these filters to narrow down your search
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                value={symbol}
                onChange={(e) => {
                  setSymbol(e.target.value);
                  setPage(1); // Reset to first page on filter change
                }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Space Group Number</label>
              <Input
                placeholder="Filter by number (e.g., 14)"
                value={number}
                onChange={(e) => {
                  // Only allow numeric input
                  if (/^\d*$/.test(e.target.value) || e.target.value === '') {
                    setNumber(e.target.value);
                    setPage(1); // Reset to first page on filter change
                  }
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
            <Table className="min-w-[750px]">
              <TableCaption>Space groups from the Mindat API</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">ID</TableHead>
                  <TableHead>Number</TableHead>
                  <TableHead>System</TableHead>
                  <TableHead>H-M Symbol</TableHead>
                  <TableHead>Schoenflies</TableHead>
                  <TableHead>Name</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    <div className="flex items-center justify-center space-x-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Loading space groups...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : data?.results.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
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
                    <TableCell>{spaceGroup.number}</TableCell>
                    <TableCell>{spaceGroup.system}</TableCell>
                    <TableCell className="font-mono">{spaceGroup.symbol_h_m}</TableCell>
                    <TableCell className="font-mono">{spaceGroup.symbol_schoenflies}</TableCell>
                    <TableCell>{spaceGroup.name}</TableCell>
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
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">ID</h4>
                  <p>{groupDetails.id}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Number</h4>
                  <p>{groupDetails.number}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">System</h4>
                  <p>{groupDetails.system}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">H-M Symbol</h4>
                  <p className="font-mono text-lg">{groupDetails.symbol_h_m}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Schoenflies</h4>
                  <p className="font-mono text-lg">{groupDetails.symbol_schoenflies}</p>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Name</h4>
                <p className="text-lg">{groupDetails.name}</p>
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
    </div>
  );
}

// Dana Classification Tab Component
function DanaClassificationTab() {
  const [classNumber, setClassNumber] = useState("");
  const [className, setClassName] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Query to fetch Dana classification list
  const { data, isLoading, error } = useQuery({
    queryKey: ['danaClassification', classNumber, className, page, pageSize],
    queryFn: () => getDanaClassification({ 
      code: classNumber, 
      name: className,
      page, 
      pageSize 
    }),
  });
  
  // Query to fetch details of a selected Dana class
  const { data: classDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['danaClass', selectedClassId],
    queryFn: () => selectedClassId ? getDanaClassById(selectedClassId) : null,
    enabled: !!selectedClassId && dialogOpen,
  });

  // Check if we can go to the next/previous page
  const canPrevPage = page > 1;
  const canNextPage = data ? (page * pageSize) < data.count : false;

  // Handle pagination
  const goToPrevPage = () => setPage((prev) => Math.max(prev - 1, 1));
  const goToNextPage = () => setPage((prev) => prev + 1);

  return (
    <div>
      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filter Dana Classification</CardTitle>
          <CardDescription>
            Use these filters to narrow down your search
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Dana Class Number</label>
              <Input
                placeholder="Filter by Dana number (e.g., '8.2.1')"
                value={classNumber}
                onChange={(e) => {
                  setClassNumber(e.target.value);
                  setPage(1); // Reset to first page on filter change
                }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Class Name</label>
              <Input
                placeholder="Filter by name (e.g., 'Silicates')"
                value={className}
                onChange={(e) => {
                  setClassName(e.target.value);
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
            {data ? `Showing ${Math.min((page - 1) * pageSize + 1, data.count)} - ${Math.min(page * pageSize, data.count)} of ${data.count} Dana classes` : "Loading Dana classification..."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded border overflow-x-auto">
            <Table className="min-w-[700px]">
              <TableCaption>Dana classification system from the Mindat API</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">ID</TableHead>
                  <TableHead>Number</TableHead>
                  <TableHead>Primary Classification</TableHead>
                  <TableHead>Name</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10">
                    <div className="flex items-center justify-center space-x-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Loading Dana classification...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : data?.results.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10">
                    No Dana classes found with the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                data?.results.map((danaClass: DanaClass) => (
                  <TableRow key={danaClass.id} className="hover:bg-muted/50 cursor-pointer" 
                    onClick={() => {
                      // Show Dana class details in dialog
                      setSelectedClassId(danaClass.id);
                      setDialogOpen(true);
                    }}
                  >
                    <TableCell>{danaClass.id}</TableCell>
                    <TableCell className="font-mono">{danaClass.code}</TableCell>
                    <TableCell>{danaClass.name.split(' - ')[0]}</TableCell>
                    <TableCell>{danaClass.name.split(' - ')[1] || danaClass.name}</TableCell>
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

      {/* Dana Class Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Dana Class Details</DialogTitle>
            <DialogDescription>
              Information about the selected Dana classification
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
                  <h4 className="text-sm font-medium text-muted-foreground">Number</h4>
                  <p className="font-mono">{classDetails.number}</p>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Primary Classification</h4>
                <p>{classDetails.primary_classification}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Name</h4>
                <p className="text-lg">{classDetails.name}</p>
              </div>
              
              {classDetails.description && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Description</h4>
                  <p>{classDetails.description}</p>
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
                    if (selectedClassId) {
                      window.open(`https://api.mindat.org/dana-8/${selectedClassId}/`, '_blank');
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
    </div>
  );
}

// Strunz Classification Tab Component
function StrunzClassificationTab() {
  const [classNumber, setClassNumber] = useState("");
  const [className, setClassName] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Query to fetch Strunz classification list
  const { data, isLoading, error } = useQuery({
    queryKey: ['strunzClassification', classNumber, className, page, pageSize],
    queryFn: () => getStrunzClassification({ 
      code: classNumber, 
      name: className,
      page, 
      pageSize 
    }),
  });
  
  // Query to fetch details of a selected Strunz class
  const { data: classDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['strunzClass', selectedClassId],
    queryFn: () => selectedClassId ? getStrunzClassById(selectedClassId) : null,
    enabled: !!selectedClassId && dialogOpen,
  });

  // Check if we can go to the next/previous page
  const canPrevPage = page > 1;
  const canNextPage = data ? (page * pageSize) < data.count : false;

  // Handle pagination
  const goToPrevPage = () => setPage((prev) => Math.max(prev - 1, 1));
  const goToNextPage = () => setPage((prev) => prev + 1);

  return (
    <div>
      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filter Strunz Classification</CardTitle>
          <CardDescription>
            Use these filters to narrow down your search
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Strunz Class Number</label>
              <Input
                placeholder="Filter by Strunz number (e.g., '9.B')"
                value={classNumber}
                onChange={(e) => {
                  setClassNumber(e.target.value);
                  setPage(1); // Reset to first page on filter change
                }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Class Name</label>
              <Input
                placeholder="Filter by name (e.g., 'Silicates')"
                value={className}
                onChange={(e) => {
                  setClassName(e.target.value);
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
              : "An error occurred while fetching Strunz classification from the Mindat API."}
          </AlertDescription>
        </Alert>
      )}

      {/* Results table */}
      <Card>
        <CardHeader>
          <CardTitle>Strunz Classification</CardTitle>
          <CardDescription>
            {data ? `Showing ${Math.min((page - 1) * pageSize + 1, data.count)} - ${Math.min(page * pageSize, data.count)} of ${data.count} Strunz classes` : "Loading Strunz classification..."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded border overflow-x-auto">
            <Table className="min-w-[700px]">
              <TableCaption>Strunz classification system from the Mindat API</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">ID</TableHead>
                  <TableHead>Number</TableHead>
                  <TableHead>Primary Classification</TableHead>
                  <TableHead>Name</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10">
                    <div className="flex items-center justify-center space-x-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Loading Strunz classification...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : data?.results.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10">
                    No Strunz classes found with the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                data?.results.map((strunzClass: StrunzClass) => (
                  <TableRow key={strunzClass.id} className="hover:bg-muted/50 cursor-pointer" 
                    onClick={() => {
                      // Show Strunz class details in dialog
                      setSelectedClassId(strunzClass.id);
                      setDialogOpen(true);
                    }}
                  >
                    <TableCell>{strunzClass.id}</TableCell>
                    <TableCell className="font-mono">{strunzClass.number}</TableCell>
                    <TableCell>{strunzClass.primary_classification}</TableCell>
                    <TableCell>{strunzClass.name}</TableCell>
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

      {/* Strunz Class Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Strunz Class Details</DialogTitle>
            <DialogDescription>
              Information about the selected Strunz classification
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
                  <h4 className="text-sm font-medium text-muted-foreground">Number</h4>
                  <p className="font-mono">{classDetails.number}</p>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Primary Classification</h4>
                <p>{classDetails.primary_classification}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Name</h4>
                <p className="text-lg">{classDetails.name}</p>
              </div>
              
              {classDetails.description && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Description</h4>
                  <p>{classDetails.description}</p>
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
                    if (selectedClassId) {
                      window.open(`https://api.mindat.org/nickel-strunz-10/${selectedClassId}/`, '_blank');
                    }
                  }}
                >
                  View in API
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center p-4 text-muted-foreground">
              No details available for this Strunz class.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper functions to fetch specific details
async function getCrystalClassById(id: number) {
  const response = await fetch(`/api/proxy?url=https://api.mindat.org/crystalclasses/${id}/`);
  if (!response.ok) {
    throw new Error('Failed to fetch crystal class details');
  }
  const data = await response.json();
  return data;
}

async function getSpaceGroupById(id: number) {
  const response = await fetch(`/api/proxy?url=https://api.mindat.org/spacegroups/${id}/`);
  if (!response.ok) {
    throw new Error('Failed to fetch space group details');
  }
  const data = await response.json();
  return data;
}

async function getDanaClassById(id: number) {
  const response = await fetch(`/api/proxy?url=https://api.mindat.org/dana-8/${id}/`);
  if (!response.ok) {
    throw new Error('Failed to fetch Dana class details');
  }
  const data = await response.json();
  return data;
}

async function getStrunzClassById(id: number) {
  const response = await fetch(`/api/proxy?url=https://api.mindat.org/nickel-strunz-10/${id}/`);
  if (!response.ok) {
    throw new Error('Failed to fetch Strunz class details');
  }
  const data = await response.json();
  return data;
}