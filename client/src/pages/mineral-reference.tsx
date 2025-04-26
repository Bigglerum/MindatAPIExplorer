import React from "react";
import Layout from "@/components/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiStatusIndicator } from "@/components/ui/api-status-indicator";
import { CrystalClassesTab } from "@/components/crystal-classes-tab";
import { SpaceGroupsTab } from "@/components/space-groups-tab";
import { DanaClassificationTab } from "@/components/dana-classification-tab";
import { StrunzClassificationTab } from "@/components/strunz-classification-tab";

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
          <TabsList className="mb-4 flex flex-wrap">
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