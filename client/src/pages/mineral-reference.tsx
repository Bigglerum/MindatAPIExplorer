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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiStatusIndicator } from "@/components/ui/api-status-indicator";
import { ScrollArea } from "@/components/ui/scroll-area";
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

export default function MineralReference() {
  const [activeTab, setActiveTab] = useState("crystal-classes");
  
  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Mineral Reference Data</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Explore mineral classification systems and crystallographic data from the Mindat database
          </p>
        </div>
        <ApiStatusIndicator />
      </div>

      <Tabs defaultValue="crystal-classes" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="crystal-classes">Crystal Classes</TabsTrigger>
          <TabsTrigger value="space-groups">Space Groups</TabsTrigger>
          <TabsTrigger value="dana">Dana</TabsTrigger>
          <TabsTrigger value="strunz">Strunz</TabsTrigger>
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
    { value: "Amorphous", label: "Amorphous" },
    { value: "Hexagonal", label: "Hexagonal" },
    { value: "Icosahedral", label: "Icosahedral" },
    { value: "Isometric", label: "Isometric (Cubic)" },
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
              <p className="text-xs text-muted-foreground mt-1">Note: The cubic crystal system is called "Isometric" in crystallography.</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Symbol</label>
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
          <div className="rounded border">
            <ScrollArea className="w-full overflow-auto">
              <Table>
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
            </ScrollArea>
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
          <div className="rounded border">
            <ScrollArea className="w-full overflow-auto">
              <Table>
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
                      <TableCell>{spaceGroup.number || "-"}</TableCell>
                      <TableCell>{spaceGroup.system}</TableCell>
                      <TableCell className="font-mono">{spaceGroup.symbol_h_m || "-"}</TableCell>
                      <TableCell className="font-mono">{spaceGroup.symbol_schoenflies || "-"}</TableCell>
                      <TableCell>{spaceGroup.name || "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </ScrollArea>
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
                  <h4 className="text-sm font-medium text-muted-foreground">Number</h4>
                  <p>{groupDetails.number || "-"}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">System</h4>
                  <p>{groupDetails.system}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Setting</h4>
                  <p>{groupDetails.setting || "-"}</p>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Hermann-Mauguin Symbol</h4>
                <p className="font-mono text-lg">{groupDetails.symbol_h_m || "-"}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Schoenflies Symbol</h4>
                  <p className="font-mono">{groupDetails.symbol_schoenflies || "-"}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Hall Symbol</h4>
                  <p className="font-mono">{groupDetails.symbol_hall || "-"}</p>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Name</h4>
                <p className="text-lg">{groupDetails.name || "-"}</p>
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
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Query to fetch Dana Classification list
  const { data, isLoading, error } = useQuery({
    queryKey: ['danaClassification', code, name, page, pageSize],
    queryFn: () => getDanaClassification({ 
      code,
      name,
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
            Use these filters to search within Dana's System of Mineralogy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Classification Code</label>
              <Input
                placeholder="Filter by code (e.g., '01.03.01')"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setPage(1); // Reset to first page on filter change
                }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                placeholder="Filter by name (e.g., 'Silicates')"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
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
              : "An error occurred while fetching Dana Classification data from the Mindat API."}
          </AlertDescription>
        </Alert>
      )}

      {/* Results table */}
      <Card>
        <CardHeader>
          <CardTitle>Dana Classification</CardTitle>
          <CardDescription>
            {data ? `Showing ${Math.min((page - 1) * pageSize + 1, data.count)} - ${Math.min(page * pageSize, data.count)} of ${data.count} Dana classes` : "Loading Dana Classification..."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded border">
            <ScrollArea className="w-full overflow-auto">
              <Table>
                <TableCaption>Dana Classification from the Mindat API</TableCaption>
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
                        <span>Loading Dana Classification data...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : data?.results.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-10">
                      No Dana Classification data found with the current filters.
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
                      <TableCell>{danaClass.name}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </ScrollArea>
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
            <DialogTitle>Dana Classification Details</DialogTitle>
            <DialogDescription>
              Information about the selected Dana class
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
                  <h4 className="text-sm font-medium text-muted-foreground">Code</h4>
                  <p className="font-mono">{classDetails.code}</p>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Name</h4>
                <p className="text-lg">{classDetails.name}</p>
              </div>
              
              {classDetails.description && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Description</h4>
                  <p className="text-gray-700 dark:text-gray-300">{classDetails.description}</p>
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

// Nickel-Strunz Classification Tab Component
function StrunzClassificationTab() {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Query to fetch Strunz Classification list
  const { data, isLoading, error } = useQuery({
    queryKey: ['strunzClassification', code, name, page, pageSize],
    queryFn: () => getStrunzClassification({ 
      code,
      name,
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
          <CardTitle>Filter Nickel-Strunz Classification</CardTitle>
          <CardDescription>
            Use these filters to search within the Nickel-Strunz mineralogical system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Classification Code</label>
              <Input
                placeholder="Filter by code (e.g., '9.B')"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setPage(1); // Reset to first page on filter change
                }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                placeholder="Filter by name (e.g., 'Silicates')"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
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
              : "An error occurred while fetching Nickel-Strunz Classification data from the Mindat API."}
          </AlertDescription>
        </Alert>
      )}

      {/* Results table */}
      <Card>
        <CardHeader>
          <CardTitle>Nickel-Strunz Classification</CardTitle>
          <CardDescription>
            {data ? `Showing ${Math.min((page - 1) * pageSize + 1, data.count)} - ${Math.min(page * pageSize, data.count)} of ${data.count} Strunz classes` : "Loading Nickel-Strunz Classification..."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded border">
            <ScrollArea className="w-full overflow-auto">
              <Table>
                <TableCaption>Nickel-Strunz Classification from the Mindat API</TableCaption>
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
                        <span>Loading Nickel-Strunz Classification data...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : data?.results.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-10">
                      No Nickel-Strunz Classification data found with the current filters.
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
                      <TableCell className="font-mono">{strunzClass.code}</TableCell>
                      <TableCell>{strunzClass.name}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </ScrollArea>
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
            <DialogTitle>Nickel-Strunz Classification Details</DialogTitle>
            <DialogDescription>
              Information about the selected Strunz class
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
                  <h4 className="text-sm font-medium text-muted-foreground">Code</h4>
                  <p className="font-mono">{classDetails.code}</p>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Name</h4>
                <p className="text-lg">{classDetails.name}</p>
              </div>
              
              {classDetails.description && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Description</h4>
                  <p className="text-gray-700 dark:text-gray-300">{classDetails.description}</p>
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

// Function to get crystal class by ID (had to define inside the file due to scope)
async function getCrystalClassById(id: number) {
  try {
    const response = await apiRequest('POST', '/api/proxy', {
      path: `/crystalclasses/${id}/`,
      method: 'GET',
      parameters: {}
    });

    const data = await response.json();
    
    // Return the crystal class data
    if (data?.data) {
      return data.data;
    }
    
    throw new Error(`Crystal class with ID ${id} not found`);
  } catch (error) {
    console.error(`Error fetching crystal class #${id}:`, error);
    throw error;
  }
}

// Function to get space group by ID
async function getSpaceGroupById(id: number) {
  try {
    const response = await apiRequest('POST', '/api/proxy', {
      path: `/spacegroups/${id}/`,
      method: 'GET',
      parameters: {}
    });

    const data = await response.json();
    
    // Return the space group data
    if (data?.data) {
      return data.data;
    }
    
    throw new Error(`Space group with ID ${id} not found`);
  } catch (error) {
    console.error(`Error fetching space group #${id}:`, error);
    throw error;
  }
}

// Function to get Dana class by ID
async function getDanaClassById(id: number) {
  try {
    const response = await apiRequest('POST', '/api/proxy', {
      path: `/dana-8/${id}/`,
      method: 'GET',
      parameters: {}
    });

    const data = await response.json();
    
    if (data?.data) {
      return data.data;
    }
    
    throw new Error(`Dana class with ID ${id} not found`);
  } catch (error) {
    console.error(`Error fetching Dana class #${id}:`, error);
    throw error;
  }
}

// Function to get Strunz class by ID
async function getStrunzClassById(id: number) {
  try {
    const response = await apiRequest('POST', '/api/proxy', {
      path: `/nickel-strunz-10/${id}/`,
      method: 'GET',
      parameters: {}
    });

    const data = await response.json();
    
    if (data?.data) {
      return data.data;
    }
    
    throw new Error(`Strunz class with ID ${id} not found`);
  } catch (error) {
    console.error(`Error fetching Strunz class #${id}:`, error);
    throw error;
  }
}

import { apiRequest } from '@/lib/queryClient';