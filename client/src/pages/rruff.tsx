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
import { Search, Database, Filter, ExternalLink } from "lucide-react";

// Types for IMA minerals
interface UnitCell {
  a?: number;
  b?: number;
  c?: number;
  alpha?: number;
  beta?: number;
  gamma?: number;
  z?: number;
  volume?: number;
}

interface RruffMineral {
  id: number;
  rruffId: string;
  mineralName: string;
  chemicalFormula?: string;
  imaStatus?: string;
  crystalSystem?: string;
  crystalClass?: string;
  spaceGroup?: string;
  unitCell?: UnitCell;
  color?: string;
  density?: string;
  hardness?: string;
  yearFirstPublished?: number;
  elementComposition?: string[];
  comments?: string;
  url?: string;
}

export default function RruffPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [crystalSystem, setCrystalSystem] = useState("");
  const [searchResults, setSearchResults] = useState<RruffMineral[]>([]);
  const [selectedMineral, setSelectedMineral] = useState<RruffMineral | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    try {
      // Construct query parameters
      const params = new URLSearchParams();
      if (searchTerm) params.append("name", searchTerm);
      if (crystalSystem && crystalSystem !== "any") params.append("crystalSystem", crystalSystem);
      
      const response = await fetch(`/api/rruff/minerals?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch data");
      
      const data = await response.json();
      setSearchResults(data.minerals || []);
      setSelectedMineral(null);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMineralSelect = async (mineralId: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/rruff/minerals/${mineralId}`);
      if (!response.ok) throw new Error("Failed to fetch mineral details");
      
      const data = await response.json();
      setSelectedMineral(data.mineral);
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
          the RRUFF Project's IMA mineral list. Search for minerals by name or crystal system.
        </p>
        
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Mineral Name</Label>
                    <Input 
                      id="name" 
                      placeholder="e.g. Quartz, Calcite" 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="crystal-system">Crystal System</Label>
                    <Select value={crystalSystem} onValueChange={setCrystalSystem}>
                      <SelectTrigger>
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
                  
                  <div className="flex items-end">
                    <Button 
                      className="w-full" 
                      onClick={handleSearch}
                      disabled={loading}
                    >
                      <Search className="mr-2 h-4 w-4" />
                      Search
                    </Button>
                  </div>
                </div>
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
                          {selectedMineral.elementComposition && selectedMineral.elementComposition.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {selectedMineral.elementComposition.map((element, idx) => (
                                <span 
                                  key={idx} 
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
                                onClick={() => window.open(selectedMineral.url, '_blank')}
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