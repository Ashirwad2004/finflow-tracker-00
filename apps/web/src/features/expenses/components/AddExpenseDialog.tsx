import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  AddExpenseDialogProps,
  Category,
  ExpenseRow,
  expenseSchema,
  useAddExpenseDialog,
  ExpenseItemSidebar,
  ExpenseFormFields,
  AddExpenseDialogFooter,
} from "./add-expense";

export { expenseSchema };
export type { Category, AddExpenseDialogProps, ExpenseRow };

export const AddExpenseDialog = ({
  open,
  onOpenChange,
  categories,
  userId,
}: AddExpenseDialogProps) => {
  const {
    currency,
    isBusinessMode,
    historicalExpenses,
    activeTab,
    setActiveTab,
    expenses,
    currentExpense,
    isValidRow,
    addRow,
    removeRow,
    updateExpense,
    handleSmartParse,
    handleBillData,
    handleFileUpload,
    handleClearFile,
    handleSubmit,
    isPending,
  } = useAddExpenseDialog(categories, userId, onOpenChange);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full w-full h-[100dvh] sm:h-[650px] sm:max-w-[900px] p-0 gap-0 flex flex-col sm:flex-row rounded-none sm:rounded-2xl border-0 sm:border shadow-none sm:shadow-2xl bg-background overflow-hidden">
        {/* Left Sidebar / Items List */}
        <ExpenseItemSidebar
          expenses={expenses}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isValidRow={isValidRow}
          addRow={addRow}
          removeRow={removeRow}
          currencySymbol={currency.symbol}
          onClose={() => onOpenChange(false)}
        />

        {/* Right Panel (Active Form) */}
        <div className="flex-1 flex flex-col min-w-0 bg-background h-full overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <ExpenseFormFields
              currentExpense={currentExpense}
              categories={categories}
              historicalExpenses={historicalExpenses}
              isBusinessMode={isBusinessMode}
              currencySymbol={currency.symbol}
              onSmartParse={handleSmartParse}
              onUpdateExpense={updateExpense}
              onBillData={handleBillData}
              onFileUpload={handleFileUpload}
              onClearFile={handleClearFile}
            />
          </div>

          <AddExpenseDialogFooter
            expensesCount={expenses.length}
            isPending={isPending}
            onCancel={() => onOpenChange(false)}
            onRemoveCurrent={(e) => removeRow(e, activeTab)}
            onAddRow={addRow}
            onSubmit={handleSubmit}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddExpenseDialog;