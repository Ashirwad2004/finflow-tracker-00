import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { User, Loader2 } from "lucide-react";
import { StoreSalesman } from "../types";

interface SalesmenTabProps {
  salesmen: StoreSalesman[];
  isLoadingSalesmen: boolean;
  newSalesmanOrders: boolean;
  setNewSalesmanOrders: (val: boolean) => void;
  newSalesmanReturns: boolean;
  setNewSalesmanReturns: (val: boolean) => void;
  onAddSalesman: (data: {
    name: string;
    email: string;
    phone?: string;
    can_manage_orders?: boolean;
    can_manage_returns?: boolean;
  }) => void;
  isAddingSalesman: boolean;
  onUpdateSalesmanSettings: (data: {
    id: string;
    is_active?: boolean;
    can_manage_orders?: boolean;
    can_manage_returns?: boolean;
  }) => void;
  isUpdatingSalesman: boolean;
  onRemoveSalesman: (id: string) => void;
  isRemovingSalesman: boolean;
}

export function SalesmenTab({
  salesmen,
  isLoadingSalesmen,
  newSalesmanOrders,
  setNewSalesmanOrders,
  newSalesmanReturns,
  setNewSalesmanReturns,
  onAddSalesman,
  isAddingSalesman,
  onUpdateSalesmanSettings,
  isUpdatingSalesman,
  onRemoveSalesman,
  isRemovingSalesman,
}: SalesmenTabProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Add Salesman Form */}
        <div className="bg-card border rounded-xl shadow-sm p-6 h-fit space-y-4">
          <div>
            <h3 className="text-lg font-bold">Add New Salesman</h3>
            <p className="text-xs text-muted-foreground">
              Assign a salesman by their email to grant order completion access
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              const name = formData.get("name") as string;
              const email = formData.get("email") as string;
              const phone = formData.get("phone") as string;
              onAddSalesman({
                name,
                email,
                phone,
                can_manage_orders: newSalesmanOrders,
                can_manage_returns: newSalesmanReturns,
              });
              (e.target as HTMLFormElement).reset();
              setNewSalesmanOrders(true);
              setNewSalesmanReturns(true);
            }}
            className="space-y-3.5"
          >
            <div className="space-y-1.5">
              <Label htmlFor="salesman-name">
                Full Name <span className="text-red-400">*</span>
              </Label>
              <Input id="salesman-name" name="name" placeholder="John Doe" required className="h-10 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="salesman-email">
                Email Address <span className="text-red-400">*</span>
              </Label>
              <Input
                id="salesman-email"
                name="email"
                type="email"
                placeholder="john@example.com"
                required
                className="h-10 rounded-xl"
              />
              <p className="text-[10px] text-muted-foreground">The salesman will use this email address to log in.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="salesman-phone">Phone Number</Label>
              <Input id="salesman-phone" name="phone" placeholder="+91 98765 43210" className="h-10 rounded-xl" />
            </div>
            <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Default Permissions
              </Label>
              <div className="flex items-center justify-between p-2.5 rounded-xl border bg-slate-50/50 dark:bg-slate-900/40">
                <div className="space-y-0.5">
                  <Label htmlFor="new-can-orders" className="text-xs font-bold cursor-pointer">
                    Manage Orders
                  </Label>
                  <p className="text-[10px] text-muted-foreground">Allow processing delivery orders</p>
                </div>
                <Switch
                  id="new-can-orders"
                  checked={newSalesmanOrders}
                  onCheckedChange={setNewSalesmanOrders}
                />
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl border bg-slate-50/50 dark:bg-slate-900/40">
                <div className="space-y-0.5">
                  <Label htmlFor="new-can-returns" className="text-xs font-bold cursor-pointer">
                    Manage Returns
                  </Label>
                  <p className="text-[10px] text-muted-foreground">Allow processing return requests</p>
                </div>
                <Switch
                  id="new-can-returns"
                  checked={newSalesmanReturns}
                  onCheckedChange={setNewSalesmanReturns}
                />
              </div>
            </div>
            <Button type="submit" className="w-full h-10 rounded-xl font-semibold mt-2" disabled={isAddingSalesman}>
              {isAddingSalesman ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Adding...
                </>
              ) : (
                "Grant Access"
              )}
            </Button>
          </form>
        </div>

        {/* Right: Active Salesmen List */}
        <div className="lg:col-span-2 bg-card border rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">Active Salesmen</h3>
              <p className="text-xs text-muted-foreground">
                List of authorized salesmen who can process and complete delivery orders
              </p>
            </div>
            <Badge variant="secondary" className="px-2.5 py-0.5 rounded-full">
              {salesmen.length} active
            </Badge>
          </div>

          {isLoadingSalesmen ? (
            <div className="flex items-center justify-center py-20 flex-1">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : salesmen.length === 0 ? (
            <div className="text-center py-24 px-4 flex-1">
              <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-6 h-6 text-muted-foreground" />
              </div>
              <h4 className="text-sm font-bold mb-1">No salesmen assigned yet</h4>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Use the form on the left to add a salesman and give them access to order fulfillment.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border flex-1">
              {salesmen.map((slm: any) => (
                <div
                  key={slm.id}
                  className="flex flex-col md:flex-row md:items-center justify-between p-5 hover:bg-muted/10 gap-4 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground">{slm.salesman_name}</span>
                      {slm.is_active === false ? (
                        <Badge variant="destructive" className="text-[9px] px-1.5 py-0">
                          Suspended
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1.5 py-0 border-emerald-500/30 text-emerald-600 bg-emerald-500/5"
                        >
                          Active
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono">{slm.salesman_email}</span>
                      {slm.salesman_phone && (
                        <>
                          <span className="text-border">·</span>
                          <span>{slm.salesman_phone}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 md:gap-6 bg-slate-50/50 dark:bg-slate-900/30 p-2 px-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <Switch
                        id={`active-toggle-${slm.id}`}
                        checked={slm.is_active !== false}
                        disabled={isUpdatingSalesman}
                        onCheckedChange={(checked) => {
                          onUpdateSalesmanSettings({ id: slm.id, is_active: checked });
                        }}
                      />
                      <Label htmlFor={`active-toggle-${slm.id}`} className="text-xs font-semibold cursor-pointer">
                        Status
                      </Label>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        id={`orders-toggle-${slm.id}`}
                        checked={slm.can_manage_orders !== false}
                        disabled={isUpdatingSalesman || slm.is_active === false}
                        onCheckedChange={(checked) => {
                          onUpdateSalesmanSettings({ id: slm.id, can_manage_orders: checked });
                        }}
                      />
                      <Label htmlFor={`orders-toggle-${slm.id}`} className="text-xs font-semibold cursor-pointer">
                        Orders
                      </Label>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        id={`returns-toggle-${slm.id}`}
                        checked={slm.can_manage_returns !== false}
                        disabled={isUpdatingSalesman || slm.is_active === false}
                        onCheckedChange={(checked) => {
                          onUpdateSalesmanSettings({ id: slm.id, can_manage_returns: checked });
                        }}
                      />
                      <Label htmlFor={`returns-toggle-${slm.id}`} className="text-xs font-semibold cursor-pointer">
                        Returns
                      </Label>
                    </div>

                    <div className="h-4 w-px bg-slate-200 dark:bg-slate-850 hidden sm:block" />

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 border-rose-200 text-rose-650 hover:bg-rose-55 hover:text-rose-700 bg-rose-50/10 rounded-lg text-xs"
                      onClick={() => onRemoveSalesman(slm.id)}
                      disabled={isRemovingSalesman}
                    >
                      Revoke Access
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
