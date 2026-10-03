import { AppLayout } from "@/components/layout/AppLayout";
import { POSStationHeader, POSCatalogGrid, POSCart } from "../../components";
import { usePOSPageState } from "./usePOSPageState";
import { POSShiftClosedBanner } from "./POSShiftClosedBanner";
import { POSMobileNav, POSMobileFloatingBar } from "./POSMobileNav";
import { POSPageModals } from "./POSPageModals";

export default function POSPage() {
  const {
    user,
    currentStore,
    isOnline,
    isFullscreen,
    toggleFullscreen,
    // Modals
    isPaymentOpen,
    setIsPaymentOpen,
    isReceiptOpen,
    setIsReceiptOpen,
    isShiftOpen,
    setIsShiftOpen,
    isHoldResumeOpen,
    setIsHoldResumeOpen,
    isReturnOpen,
    setIsReturnOpen,
    isCustomerModalOpen,
    setIsCustomerModalOpen,
    isShortcutsOpen,
    setIsShortcutsOpen,
    lastCompletedSale,
    // Catalog & Filter
    products,
    isProductsLoading,
    categories,
    selectedCategory,
    setSelectedCategory,
    productGridSearch,
    setProductGridSearch,
    filteredGridProducts,
    visibleGridProducts,
    handleBarcodeNotFound,
    // Viewport
    mobileTab,
    setMobileTab,
    // Cart
    cartItems,
    customerName,
    setCustomerName,
    customerPhone,
    setCustomerPhone,
    overallDiscountAmount,
    setOverallDiscountAmount,
    heldBills,
    subtotal,
    taxAmount,
    totalAmount,
    handleAddToCart,
    handleUpdateQuantity,
    handleUpdatePrice,
    handleUpdateDiscount,
    handleRemoveItem,
    handleClearCart,
    handleResumeBill,
    handleDeleteHeldBill,
    // Shift & Sale
    activeShift,
    shiftSummary,
    handleOpenShift,
    handleCloseShift,
    handleRecordCashMovement,
    handleCompleteSale,
    handleReturnSuccess,
    formatCurrency,
  } = usePOSPageState();

  return (
    <AppLayout>
      <div className="h-full flex flex-col bg-background text-foreground animate-fade-in font-display overflow-hidden select-none">
        {/* Top Station Control Bar */}
        <POSStationHeader
          currentStoreName={currentStore?.name}
          userEmail={user?.email}
          isOnline={isOnline}
          activeShift={activeShift}
          shiftSummary={shiftSummary}
          heldBillsCount={heldBills.length}
          formatCurrency={formatCurrency}
          onOpenShift={() => setIsShiftOpen(true)}
          onOpenHoldResume={() => setIsHoldResumeOpen(true)}
          onOpenReturn={() => setIsReturnOpen(true)}
          onOpenShortcuts={() => setIsShortcutsOpen(true)}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
        />

        {/* Shift Closed Callout Banner */}
        {!activeShift && (
          <POSShiftClosedBanner onOpenShift={() => setIsShiftOpen(true)} />
        )}

        {/* Mobile Viewport Toggle */}
        <POSMobileNav
          mobileTab={mobileTab}
          onTabChange={setMobileTab}
          filteredProductsCount={filteredGridProducts.length}
          cartItemsCount={cartItems.length}
          totalAmount={totalAmount}
          formatCurrency={formatCurrency}
        />

        {/* Main Workstation Screen: 2 Columns */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Left Column: Catalog & Barcode Scanner */}
          <div
            className={`lg:col-span-7 xl:col-span-8 flex flex-col h-full min-h-0 border-r border-border/80 overflow-hidden bg-muted/20 relative ${
              mobileTab === "catalog" ? "flex" : "hidden lg:flex"
            }`}
          >
            <POSCatalogGrid
              products={products}
              isProductsLoading={isProductsLoading}
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              searchQuery={productGridSearch}
              onSearchChange={setProductGridSearch}
              filteredProducts={filteredGridProducts}
              visibleProducts={visibleGridProducts}
              formatCurrency={formatCurrency}
              onAddToCart={handleAddToCart}
              onBarcodeNotFound={handleBarcodeNotFound}
            />

            {/* Mobile Catalog Floating Bottom Bar when Cart has items */}
            <POSMobileFloatingBar
              cartItemsCount={cartItems.length}
              totalAmount={totalAmount}
              formatCurrency={formatCurrency}
              onOpenCart={() => setMobileTab("cart")}
            />
          </div>

          {/* Right Column: POS Cart & Docked Pay Action */}
          <div
            className={`lg:col-span-5 xl:col-span-4 flex flex-col h-full min-h-0 bg-card/60 overflow-hidden ${
              mobileTab === "cart" ? "flex" : "hidden lg:flex"
            }`}
          >
            <POSCart
              items={cartItems}
              customerName={customerName}
              customerPhone={customerPhone}
              onOpenCustomerSelect={() => setIsCustomerModalOpen(true)}
              onUpdateQuantity={handleUpdateQuantity}
              onUpdatePrice={handleUpdatePrice}
              onUpdateDiscount={handleUpdateDiscount}
              onRemoveItem={handleRemoveItem}
              onClearCart={handleClearCart}
              overallDiscountAmount={overallDiscountAmount}
              onUpdateOverallDiscount={setOverallDiscountAmount}
              subtotal={subtotal}
              taxAmount={taxAmount}
              totalAmount={totalAmount}
              onPay={() => setIsPaymentOpen(true)}
            />
          </div>
        </div>
      </div>

      {/* POS Modals */}
      <POSPageModals
        isCustomerModalOpen={isCustomerModalOpen}
        setIsCustomerModalOpen={setIsCustomerModalOpen}
        customerName={customerName}
        customerPhone={customerPhone}
        onApplyCustomer={(name, phone) => {
          setCustomerName(name);
          setCustomerPhone(phone);
        }}
        isShortcutsOpen={isShortcutsOpen}
        setIsShortcutsOpen={setIsShortcutsOpen}
        isPaymentOpen={isPaymentOpen}
        setIsPaymentOpen={setIsPaymentOpen}
        totalAmount={totalAmount}
        currentStore={currentStore}
        handleCompleteSale={handleCompleteSale}
        isReceiptOpen={isReceiptOpen}
        setIsReceiptOpen={setIsReceiptOpen}
        lastCompletedSale={lastCompletedSale}
        handleClearCart={handleClearCart}
        isShiftOpen={isShiftOpen}
        setIsShiftOpen={setIsShiftOpen}
        activeShift={activeShift}
        shiftSummary={shiftSummary}
        cashierName={
          shiftSummary?.cashier_snapshot_name ||
          user?.email?.split("@")[0] ||
          "Cashier"
        }
        handleOpenShift={handleOpenShift}
        handleCloseShift={handleCloseShift}
        handleRecordCashMovement={handleRecordCashMovement}
        isHoldResumeOpen={isHoldResumeOpen}
        setIsHoldResumeOpen={setIsHoldResumeOpen}
        heldBills={heldBills}
        handleResumeBill={(bill) => handleResumeBill(bill, () => setIsHoldResumeOpen(false))}
        handleDeleteHeldBill={handleDeleteHeldBill}
        isReturnOpen={isReturnOpen}
        setIsReturnOpen={setIsReturnOpen}
        handleReturnSuccess={handleReturnSuccess}
      />
    </AppLayout>
  );
}
