import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReceiptIndianRupee, TrendingUp, Calculator as CalcIcon } from "lucide-react";
import { GstStudioTab } from "./GstStudioTab";
import { MarginPlannerTab } from "./MarginPlannerTab";
import { StandardCalculatorTab } from "./StandardCalculatorTab";

export * from "./calculatorUtils";
export * from "./GstStudioTab";
export * from "./MarginPlannerTab";
export * from "./StandardCalculatorTab";

export const Calculator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"gst" | "margin" | "standard">("gst");

  return (
    <div className="w-full flex flex-col gap-4 text-foreground">
      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-muted/60 p-1 rounded-xl h-11">
          <TabsTrigger
            value="gst"
            className="flex items-center gap-1.5 font-bold text-xs sm:text-sm rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-sm"
          >
            <ReceiptIndianRupee className="w-4 h-4" />
            <span>GST Studio</span>
          </TabsTrigger>
          <TabsTrigger
            value="margin"
            className="flex items-center gap-1.5 font-bold text-xs sm:text-sm rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-sm"
          >
            <TrendingUp className="w-4 h-4" />
            <span>Margin & MRP</span>
          </TabsTrigger>
          <TabsTrigger
            value="standard"
            className="flex items-center gap-1.5 font-bold text-xs sm:text-sm rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-sm"
          >
            <CalcIcon className="w-4 h-4" />
            <span>Standard + GST</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gst">
          <GstStudioTab />
        </TabsContent>
        <TabsContent value="margin">
          <MarginPlannerTab />
        </TabsContent>
        <TabsContent value="standard">
          <StandardCalculatorTab isActive={activeTab === "standard"} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Calculator;
