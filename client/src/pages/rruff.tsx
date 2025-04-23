import { useState } from "react";
import Layout from "../components/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Search, Database, Filter, ExternalLink, AlertCircle, Loader2 } from "lucide-react";
import { searchRruffMinerals, searchRruffByKeyword, getRruffMineralById, RruffMineral } from "../lib/rruff-service";

export default function RruffPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [crystalSystem, setCrystalSystem] = useState("");
  const [elements, setElements] = useState("");
  const [searchResults, setSearchResults] = useState<RruffMineral[]>([]);
  const [selectedMineral, setSelectedMineral] = useState<RruffMineral | null>(null);
  const [loading, setLoading] = useState(false);
  const [noResults, setNoResults] = useState(false);

  const handleSearch = async () => {
    if (!searchTerm && !elements && (!crystalSystem || crystalSystem === "any")) {
      // Don't allow empty searches, need at least one search parameter
      return;
    }
    
    setLoading(true);
    setNoResults(false);
    
    try {
      console.log("Searching for:", {
        searchTerm,
        crystalSystem,
        elements
      });
      
      const result = await searchRruffMinerals({
        name: searchTerm,
        crystalSystem: crystalSystem !== "any" ? crystalSystem : undefined,
        elements: elements ? elements : undefined,
        page: 1,
        limit: 20
      });
      
      console.log("Search results:", result);
      setSearchResults(result.minerals || []);
      setSelectedMineral(null);
      
      // Set the no results state based on search results
      setNoResults(result.minerals.length === 0);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
      setNoResults(true);
    } finally {
      setLoading(false);
    }
  };
  
  // Quick search only uses the keyword search endpoint
  const handleKeywordSearch = async () => {
    if (!searchTerm) return;
    
    setLoading(true);
    try {
      console.log("Keyword searching for:", searchTerm);
      
      const result = await searchRruffByKeyword(searchTerm);
      
      console.log("Keyword search results:", result);
      setSearchResults(result.minerals || []);
      setSelectedMineral(null);
    } catch (error) {
      console.error("Keyword search error:", error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMineralSelect = async (mineralId: number) => {
    setLoading(true);
    try {
      const result = await getRruffMineralById(mineralId);
      setSelectedMineral(result.mineral);
    } catch (error) {
      console.error("Error fetching mineral details:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container py-6">
        <div className="flex items-center mb-6">
          <Database className="mr-2 h-6 w-6" />
          <h1 className="text-3xl font-bold">IMA Minerals Database</h1>
        </div>
        
        <p className="text-muted-foreground mb-6">
          This database contains IMA-approved minerals and their properties. Data is sourced from 
          the RRUFF Project's IMA mineral list. Search for minerals by name, crystal system, or element composition.
        </p>
        
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6 flex items-start">
          <div className="text-blue-500 mr-3 mt-0.5">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
          <div>
            <h3 className="text-blue-800 font-medium">Database Loading in Progress</h3>
            <p className="text-blue-700 text-sm">
              The full mineral database is currently being populated in the background. Common minerals 
              like quartz, calcite, and actinolite should be available now. If you don't find a specific 
              mineral, please try again in a few minutes.
            </p>
          </div>
        </div>
        
        <Tabs defaultValue="search">
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="search">Search Minerals</TabsTrigger>
          </TabsList>
          
          <TabsContent value="search" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Search IMA Minerals</CardTitle>
                <CardDescription>
                  Search for IMA-approved minerals by name or crystal system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Mineral Name</Label>
                    <div className="flex gap-2">
                      <Input 
                        id="name" 
                        placeholder="e.g. Quartz, Calcite" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      <Button
                        variant="outline"
                        onClick={handleKeywordSearch}
                        disabled={loading || !searchTerm}
                        className="whitespace-nowrap"
                      >
                        Quick Search
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="crystal-system">Crystal System</Label>
                    <Select value={crystalSystem} onValueChange={setCrystalSystem}>
                      <SelectTrigger id="crystal-system">
                        <SelectValue placeholder="Any crystal system" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any</SelectItem>
                        <SelectItem value="cubic">Cubic</SelectItem>
                        <SelectItem value="tetragonal">Tetragonal</SelectItem>
                        <SelectItem value="hexagonal">Hexagonal</SelectItem>
                        <SelectItem value="trigonal">Trigonal</SelectItem>
                        <SelectItem value="orthorhombic">Orthorhombic</SelectItem>
                        <SelectItem value="monoclinic">Monoclinic</SelectItem>
                        <SelectItem value="triclinic">Triclinic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="elements">Elements (comma separated)</Label>
                    <Input 
                      id="elements"
                      placeholder="e.g. Si,O,Al"
                      value={elements}
                      onChange={(e) => setElements(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Search for minerals containing specific elements</p>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button 
                    className="w-full md:w-1/3" 
                    onClick={handleSearch}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" />
                        Advanced Search
                      </>
                    )}
                  </Button>
                </div>
                
                {noResults && (
                  <div className="mt-4 p-4 border border-yellow-200 bg-yellow-50 rounded-md flex items-center text-yellow-800">
                    <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                    <span>No minerals found matching your search criteria. Try adjusting your filters.</span>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="h-[600px]">
                <CardHeader>
                  <CardTitle>Results</CardTitle>
                  <CardDescription>
                    {searchResults.length} minerals found
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px] pr-4">
                    {searchResults.length > 0 ? (
                      <div className="space-y-2">
                        {searchResults.map((mineral) => (
                          <div 
                            key={mineral.id}
                            className="p-3 border rounded-md cursor-pointer hover:bg-accent transition-colors"
                            onClick={() => handleMineralSelect(mineral.id)}
                          >
                            <h3 className="font-medium">{mineral.mineralName}</h3>
                            <p className="text-sm text-muted-foreground">{mineral.chemicalFormula}</p>
                            <p className="text-xs">Crystal System: {mineral.crystalSystem || "Unknown"}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        {loading ? "Loading..." : "No results found. Try a different search."}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
              
              <Card className="h-[600px]">
                <CardHeader>
                  <CardTitle>Mineral Details</CardTitle>
                  <CardDescription>
                    {selectedMineral ? selectedMineral.mineralName : "Select a mineral to view details"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px] pr-4">
                    {selectedMineral ? (
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-lg font-bold">{selectedMineral.mineralName}</h3>
                          <p className="text-muted-foreground">{selectedMineral.chemicalFormula}</p>
                        </div>
                        
                        <Separator />
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Crystal System</Label>
                            <p>{selectedMineral.crystalSystem || "Unknown"}</p>
                          </div>
                          <div>
                            <Label className="text-xs">Crystal Class</Label>
                            <p>{selectedMineral.crystalClass || "Unknown"}</p>
                          </div>
                          <div>
                            <Label className="text-xs">Space Group</Label>
                            <p>{selectedMineral.spaceGroup || "Unknown"}</p>
                          </div>
                          <div>
                            <Label className="text-xs">Hardness</Label>
                            <p>{selectedMineral.hardness || "Unknown"}</p>
                          </div>
                          <div>
                            <Label className="text-xs">Density</Label>
                            <p>{selectedMineral.density || "Unknown"}</p>
                          </div>
                          <div>
                            <Label className="text-xs">Color</Label>
                            <p>{selectedMineral.color || "Unknown"}</p>
                          </div>
                        </div>
                        
                        <Separator />
                        
                        <div>
                          <h4 className="font-medium mb-2">Unit Cell Parameters</h4>
                          {selectedMineral.unitCell ? (
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs">a</Label>
                                <p>{selectedMineral.unitCell.a || "Unknown"}</p>
                              </div>
                              <div>
                                <Label className="text-xs">b</Label>
                                <p>{selectedMineral.unitCell.b || "Unknown"}</p>
                              </div>
                              <div>
                                <Label className="text-xs">c</Label>
                                <p>{selectedMineral.unitCell.c || "Unknown"}</p>
                              </div>
                              <div>
                                <Label className="text-xs">alpha</Label>
                                <p>{selectedMineral.unitCell.alpha || "Unknown"}</p>
                              </div>
                              <div>
                                <Label className="text-xs">beta</Label>
                                <p>{selectedMineral.unitCell.beta || "Unknown"}</p>
                              </div>
                              <div>
                                <Label className="text-xs">gamma</Label>
                                <p>{selectedMineral.unitCell.gamma || "Unknown"}</p>
                              </div>
                            </div>
                          ) : (
                            <p className="text-muted-foreground">No unit cell data available</p>
                          )}
                        </div>
                        
                        <Separator />
                        
                        <div>
                          <h4 className="font-medium mb-2">Elements</h4>
                          {selectedMineral.elementComposition && typeof selectedMineral.elementComposition === 'object' ? (
                            <div className="flex flex-wrap gap-1">
                              {Object.keys(selectedMineral.elementComposition).map((element: string) => (
                                <span 
                                  key={element} 
                                  className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-xs"
                                >
                                  {element}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-muted-foreground">No element data available</p>
                          )}
                        </div>
                        
                        <Separator />
                        
                        <div>
                          <h4 className="font-medium mb-2">RRUFF Database Reference</h4>
                          {selectedMineral.url ? (
                            <div className="mt-2">
                              <Button 
                                variant="outline"
                                className="w-full justify-between"
                                onClick={() => window.open(selectedMineral.url || 'https://rruff.info', '_blank')}
                              >
                                <span>View on RRUFF.info</span>
                                <ExternalLink className="h-4 w-4 ml-2" />
                              </Button>
                              <p className="text-xs text-muted-foreground mt-2">
                                Visit the RRUFF project website for additional data on this mineral, 
                                including spectral information, references, and related samples.
                              </p>
                            </div>
                          ) : (
                            <p className="text-muted-foreground">No RRUFF reference available</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        Select a mineral from the results to view detailed information
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}