import re
import sys

filepath = r"c:\Users\ashir\Downloads\modern portfolio\finflow-tracker-00\src\features\invoices\CreateInvoiceDialog.tsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update imports
content = re.sub(
    r'import { Plus, Trash2, Loader2 } from "lucide-react";.*?// Removed unused imports',
    r'import { Plus, Trash2, Loader2, User, Calendar, Receipt, DollarSign, Percent, FileText } from "lucide-react";\nimport { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";',
    content,
    flags=re.DOTALL
)

# 2. Replace the return statement block
new_return = """    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[1000px] max-h-[90vh] p-0 overflow-hidden flex flex-col bg-muted/20">
                <DialogHeader className="px-6 py-4 bg-background border-b z-10">
                    <DialogTitle className="text-xl font-semibold">
                        {invoiceToEdit ? "Edit Invoice" : "Create New Invoice"}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-auto flex flex-col md:flex-row">
                    {/* MAIN CONTENT (Left Column) */}
                    <div className="flex-1 p-4 sm:p-6 space-y-6 overflow-y-auto">
                        
                        {/* Customer Details Card */}
                        <Card className="shadow-sm border-muted">
                            <CardHeader className="pb-3 border-b border-muted/50 mb-4 bg-muted/10">
                                <CardTitle className="text-base sm:text-lg flex items-center text-foreground/80 font-medium">
                                    <User className="w-4 h-4 mr-2" />
                                    Customer Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2 md:col-span-2">
                                    <Label className="text-xs font-semibold uppercase text-muted-foreground">Customer Name <span className="text-red-500">*</span></Label>
                                    <Input
                                        className="bg-background"
                                        {...register("customer_name", { required: "Customer name is required" })}
                                        placeholder="Enter customer name"
                                        list="customer-list"
                                        onChange={(e) => {
                                            register("customer_name").onChange(e);
                                            handleCustomerSelect(e.target.value);
                                        }}
                                    />
                                    <datalist id="customer-list">
                                        {parties.map((party: any) => (
                                            <option key={party.id} value={party.name} />
                                        ))}
                                    </datalist>
                                    {errors.customer_name && <span className="text-red-500 text-xs">{errors.customer_name.message}</span>}
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase text-muted-foreground">Phone</Label>
                                    <Input className="bg-background" {...register("customer_phone")} placeholder="Customer phone" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase text-muted-foreground">Email</Label>
                                    <Input className="bg-background" {...register("customer_email")} placeholder="Customer email" />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Invoice Items Card */}
                        <Card className="shadow-sm border-muted">
                            <CardHeader className="pb-3 border-b border-muted/50 bg-muted/10 flex flex-row items-center justify-between">
                                <CardTitle className="text-base sm:text-lg flex items-center text-foreground/80 font-medium">
                                    <Receipt className="w-4 h-4 mr-2" />
                                    Invoice Items
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 p-0 sm:p-4">
                                {/* Global Error for Items array */}
                                {errors.items && !Array.isArray(errors.items) && (
                                    <p className="text-red-500 text-sm mb-4 px-4 sm:px-0">{(errors.items as any).message}</p>
                                )}

                                {/* Desktop Table Header */}
                                <div className="hidden sm:grid grid-cols-12 gap-3 pb-2 mb-3 border-b text-xs font-semibold uppercase text-muted-foreground px-4 sm:px-0">
                                    <div className="col-span-5">Product/Service</div>
                                    <div className="col-span-2">Quantity</div>
                                    <div className="col-span-2">Price</div>
                                    <div className="col-span-2">Disc %</div>
                                    <div className="col-span-1 text-center">Act</div>
                                </div>

                                <div className="space-y-3 px-4 sm:px-0">
                                    {fields.map((field, index) => (
                                        <div key={field.id} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start group rounded-md">
                                            {/* Description Input */}
                                            <div className="sm:col-span-5 space-y-1">
                                                <div className="sm:hidden text-xs font-semibold text-muted-foreground uppercase mb-1">Product/Service</div>
                                                <Input
                                                    className={`bg-background ${errors.items?.[index]?.description ? "border-red-500" : ""}`}
                                                    {...register(`items.${index}.description` as const, {
                                                        required: "Product name is required"
                                                    })}
                                                    placeholder="Product Name *"
                                                    list={`products-list-${index}`}
                                                    onChange={(e) => {
                                                        register(`items.${index}.description`).onChange(e); 
                                                        handleProductSelect(index, e.target.value);
                                                    }}
                                                />
                                                <datalist id={`products-list-${index}`}>
                                                    {products.map((product: any) => (
                                                        <option key={product.id} value={product.name} />
                                                    ))}
                                                </datalist>
                                                {errors.items?.[index]?.description && (
                                                    <span className="text-red-500 text-[10px] block">{errors.items[index].description.message}</span>
                                                )}
                                            </div>

                                            {/* Quantity */}
                                            <div className="sm:col-span-2 space-y-1">
                                                <div className="sm:hidden text-xs font-semibold text-muted-foreground uppercase mb-1">Quantity</div>
                                                <Input
                                                    className="bg-background"
                                                    type="number"
                                                    {...register(`items.${index}.quantity` as const, { required: true, min: 1 })}
                                                    placeholder="Qty"
                                                    min="1"
                                                />
                                            </div>

                                            {/* Price */}
                                            <div className="sm:col-span-2 space-y-1">
                                                <div className="sm:hidden text-xs font-semibold text-muted-foreground uppercase mb-1">Price</div>
                                                <Input
                                                    type="number"
                                                    className={`bg-background ${errors.items?.[index]?.price ? "border-red-500" : ""}`}
                                                    {...register(`items.${index}.price` as const, {
                                                        required: "Required",
                                                        valueAsNumber: true,
                                                        min: { value: 0.01, message: "> 0" }
                                                    })}
                                                    placeholder="Price *"
                                                    min="0"
                                                    step="0.01"
                                                />
                                                {errors.items?.[index]?.price && (
                                                    <span className="text-red-500 text-[10px] block truncate">
                                                        {errors.items[index].price.message}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Item Discount % */}
                                            <div className="sm:col-span-2 space-y-1">
                                                <div className="sm:hidden text-xs font-semibold text-muted-foreground uppercase mb-1">Discount %</div>
                                                <Input
                                                    type="number"
                                                    className="bg-background"
                                                    {...register(`items.${index}.discount` as const)}
                                                    placeholder="Disc %"
                                                    min="0"
                                                    max="100"
                                                />
                                            </div>

                                            {/* Action */}
                                            <div className="sm:col-span-1 pt-1 sm:pt-0 pb-3 sm:pb-0 flex justify-end sm:justify-center border-b sm:border-0 border-border/50">
                                                <Button 
                                                    type="button" 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="text-destructive opacity-80 hover:opacity-100 hover:bg-destructive/10" 
                                                    onClick={() => remove(index)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-4 px-4 sm:px-0">
                                    <Button 
                                        type="button" 
                                        variant="outline" 
                                        className="w-full border-dashed border-primary/40 text-primary hover:bg-primary/5 hover:border-primary/60 transition-colors" 
                                        onClick={() => append({ description: "", quantity: 1, price: 0, discount: 0, total: 0 })}>
                                        <Plus className="w-4 h-4 mr-2" /> Add New Item
                                    </Button>
                                    <div className="text-center mt-2 pb-4 sm:pb-0">
                                         <p className="text-xs text-muted-foreground">* Scroll up to see the items if adding many</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* SIDEBAR (Right Column) */}
                    <div className="w-full md:w-[320px] lg:w-[350px] bg-background border-t md:border-t-0 md:border-l flex flex-col z-10">
                        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                            
                            {/* Document Settings */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center">
                                    <FileText className="w-4 h-4 mr-2" />
                                    Document Settings
                                </h3>

                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase text-muted-foreground">Invoice Number <span className="text-red-500">*</span></Label>
                                    <Input 
                                        {...register("invoice_number", { required: "Invoice Number is required" })} 
                                        placeholder="1" 
                                        className="bg-muted/30 font-medium"
                                    />
                                    {errors.invoice_number && <span className="text-red-500 text-xs">{errors.invoice_number.message}</span>}
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase text-muted-foreground">Date</Label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input 
                                            type="date" 
                                            {...register("date")} 
                                            className="pl-9 bg-muted/30 text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2 pt-2">
                                    <Label className="text-xs font-semibold uppercase text-muted-foreground block mb-2">Payment Status</Label>
                                    <RadioGroup
                                        defaultValue="paid"
                                        value={watch("status")}
                                        onValueChange={(val) => setValue("status", val as "paid" | "pending")}
                                        className="grid grid-cols-2 gap-3"
                                    >
                                        <div className="relative">
                                            <RadioGroupItem value="paid" id="status-paid-sidebar" className="peer sr-only" />
                                            <Label 
                                                htmlFor="status-paid-sidebar" 
                                                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-3 hover:bg-muted hover:text-accent-foreground peer-data-[state=checked]:border-green-500 peer-data-[state=checked]:bg-green-50/50 cursor-pointer transition-all"
                                            >
                                                <span className="font-semibold text-green-700">Paid</span>
                                            </Label>
                                        </div>
                                        <div className="relative">
                                            <RadioGroupItem value="pending" id="status-pending-sidebar" className="peer sr-only" />
                                            <Label 
                                                htmlFor="status-pending-sidebar" 
                                                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-3 hover:bg-muted hover:text-accent-foreground peer-data-[state=checked]:border-orange-500 peer-data-[state=checked]:bg-orange-50/50 cursor-pointer transition-all"
                                            >
                                                <span className="font-semibold text-orange-700">Pending</span>
                                            </Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                            </div>

                            <div className="h-[1px] w-full bg-border" />

                            {/* Order Summary */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center">
                                    <DollarSign className="w-4 h-4 mr-2" />
                                    Order Summary
                                </h3>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-muted-foreground">Subtotal</span>
                                        <span className="font-medium">{formatCurrency(subtotal)}</span>
                                    </div>

                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-muted-foreground">Overall Discount</span>
                                        <div className="flex items-center gap-2">
                                            <div className="relative w-16">
                                                <Input
                                                    type="number"
                                                    className="h-8 text-right pr-6 bg-muted/30"
                                                    {...register("overall_discount")}
                                                    min="0"
                                                    max="100"
                                                    placeholder="0"
                                                />
                                                <Percent className="absolute right-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
                                            </div>
                                        </div>
                                    </div>
                                    {overallDiscountAmount > 0 && (
                                        <div className="flex justify-between items-center text-xs text-muted-foreground -mt-2">
                                            <span></span>
                                            <span className="text-orange-600">-{formatCurrency(overallDiscountAmount)}</span>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-muted-foreground">Tax</span>
                                        <div className="flex items-center gap-2">
                                            <div className="relative w-16">
                                                <Input
                                                    type="number"
                                                    className="h-8 text-right pr-6 bg-muted/30"
                                                    {...register("tax_rate")}
                                                    min="0"
                                                    max="100"
                                                    placeholder="0"
                                                />
                                                <Percent className="absolute right-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
                                            </div>
                                        </div>
                                    </div>
                                    {taxAmount > 0 && (
                                        <div className="flex justify-between items-center text-xs text-muted-foreground -mt-2">
                                            <span></span>
                                            <span className="text-emerald-600">+{formatCurrency(taxAmount)}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-4 border-t mt-4">
                                    <div className="flex justify-between items-end">
                                        <span className="text-base font-semibold">Grand Total</span>
                                        <span className="text-2xl font-bold text-primary tracking-tight">
                                            {formatCurrency(totalAmount)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sidebar Footer Actions */}
                        <div className="p-4 bg-muted/20 border-t space-y-2">
                            <Button type="submit" className="w-full text-base py-5 font-semibold" disabled={createInvoiceMutation.isPending}>
                                {createInvoiceMutation.isPending && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
                                Save & Print
                            </Button>
                            <Button type="button" variant="outline" className="w-full bg-background" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                        </div>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );"""

ret_idx = content.find("    return (")
if ret_idx == -1:
    print("Could not find return statement")
    sys.exit(1)

# Find the end of the return statement (the closing bracket of Dialog before export)
end_idx = content.rfind("    );\n};")
if end_idx == -1:
    print("Could not find end of return statement")
    sys.exit(1)

# Combine parts
new_content = content[:ret_idx] + new_return + "\n};"

# also add Card imports if missing
if 'import { Card' not in new_content:
    new_content = new_content.replace('import { Button } from "@/components/ui/button";', 'import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";\nimport { Button } from "@/components/ui/button";')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("UI successfully patched")