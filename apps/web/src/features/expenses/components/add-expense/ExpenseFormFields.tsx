import { Wand2, Receipt, Building2, FileText, Tag, CalendarDays } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { SmartExpenseInput } from "@/features/expenses/components/SmartExpenseInput";
import { BillUpload } from "@/features/expenses/components/BillUpload";
import { Category, ExpenseRow } from "./types";

interface ExpenseFormFieldsProps {
  currentExpense: ExpenseRow;
  categories: Category[];
  historicalExpenses: any[];
  isBusinessMode: boolean;
  currencySymbol: string;
  onSmartParse: (data: { amount: string; description: string; categoryName?: string }) => void;
  onUpdateExpense: (field: keyof ExpenseRow, value: any) => void;
  onBillData: (data: any) => void;
  onFileUpload: (file: File, preview: string) => void;
  onClearFile: () => void;
}

export const ExpenseFormFields = ({
  currentExpense,
  categories,
  historicalExpenses,
  isBusinessMode,
  currencySymbol,
  onSmartParse,
  onUpdateExpense,
  onBillData,
  onFileUpload,
  onClearFile,
}: ExpenseFormFieldsProps) => {
  return (
    <div
      className="max-w-md mx-auto space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-right-4 duration-300"
      key={currentExpense.id}
    >
      <div className="mb-4">
        <Label className="text-xs font-semibold text-violet-500 mb-1.5 flex items-center gap-1 uppercase tracking-wide">
          <Wand2 className="w-3 h-3" /> AI Smart Fill
        </Label>
        <SmartExpenseInput
          onParse={onSmartParse}
          categories={categories}
          expenses={historicalExpenses}
        />
        <p className="text-[10px] text-muted-foreground mt-1.5 ml-1">
          Try typing: "Lunch 250" or "Taxi 400"
        </p>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground font-semibold">
            Or fill details manually
          </span>
        </div>
      </div>

      <div className="space-y-4 text-center mt-2 sm:mt-0">
        <Label className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
          Expense Amount
        </Label>
        <div className="relative inline-block w-full">
          <span className="absolute left-0 top-1/2 -translate-y-1/2 text-2xl sm:text-3xl font-bold text-muted-foreground/50 w-8 text-center bg-transparent">
            {currencySymbol}
          </span>
          <Input
            type="number"
            step="0.01"
            placeholder="0.00"
            className="text-center text-4xl sm:text-5xl font-bold h-16 sm:h-20 border-0 border-b-2 border-muted focus-visible:ring-0 focus-visible:border-primary rounded-none px-8 placeholder:text-muted-foreground/20 bg-transparent"
            value={currentExpense.amount}
            onChange={(e) => onUpdateExpense("amount", e.target.value)}
            autoFocus
          />
        </div>
      </div>

      <div className="grid gap-4 sm:gap-5">
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-2">
            <Receipt className="w-3.5 h-3.5" /> Description
          </Label>
          <Input
            placeholder="What is this for?"
            className="bg-muted/10 h-12"
            value={currentExpense.description}
            onChange={(e) => onUpdateExpense("description", e.target.value)}
          />
        </div>

        {isBusinessMode && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5" /> Vendor
              </Label>
              <Input
                placeholder="Vendor Name"
                className="bg-muted/10 h-12"
                value={currentExpense.vendorName}
                onChange={(e) => onUpdateExpense("vendorName", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" /> Invoice #
              </Label>
              <Input
                placeholder="INV-001"
                className="bg-muted/10 h-12"
                value={currentExpense.invoiceNumber}
                onChange={(e) => onUpdateExpense("invoiceNumber", e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-2">
              <Tag className="w-3.5 h-3.5" /> Category
            </Label>
            <Select
              value={currentExpense.categoryId}
              onValueChange={(val) => onUpdateExpense("categoryId", val)}
            >
              <SelectTrigger className="bg-muted/10 h-12">
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                      {c.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-2">
              <CalendarDays className="w-3.5 h-3.5" /> Date
            </Label>
            <Input
              type="date"
              className="bg-muted/10 h-12 block w-full"
              value={currentExpense.date}
              onChange={(e) => onUpdateExpense("date", e.target.value)}
            />
          </div>
        </div>

        {isBusinessMode && (
          <div className="flex items-center justify-between gap-4 p-4 rounded-lg bg-muted/20 border border-muted/50 animate-fade-in">
            <div className="space-y-2 flex-1">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">
                Tax Amount
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  {currencySymbol}
                </span>
                <Input
                  type="number"
                  placeholder="0.00"
                  className="pl-8 bg-background"
                  value={currentExpense.taxAmount}
                  onChange={(e) => onUpdateExpense("taxAmount", e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-6">
              <Checkbox
                id="reimbursable"
                checked={currentExpense.isReimbursable}
                onCheckedChange={(checked) => onUpdateExpense("isReimbursable", checked as boolean)}
              />
              <Label htmlFor="reimbursable" className="cursor-pointer font-medium">
                Reimbursable
              </Label>
            </div>
          </div>
        )}
      </div>

      <Separator />
      <div className="pb-4">
        <Label className="text-xs font-semibold text-muted-foreground uppercase mb-3 block">
          Attachment
        </Label>
        <BillUpload
          onDataExtracted={onBillData}
          onFileUploaded={onFileUpload}
          uploadedPreview={currentExpense.billPreview}
          onClearFile={onClearFile}
        />
      </div>
    </div>
  );
};
