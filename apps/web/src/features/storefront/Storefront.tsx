import { useCurrency } from "@/core/contexts/CurrencyContext";
import { CartDrawer } from "./CartDrawer";
import { OrdersDrawer } from "./OrdersDrawer";
import { PaymentPortal } from "./components/PaymentPortal";
import {
    StorefrontHeader,
    StorefrontBanner,
    StorefrontProductGrid,
    StorefrontOrderTracking,
    StorefrontMobileBar,
    StorefrontLoadingState,
    StorefrontNotFound,
} from "./components/customer";
import { useStorefrontData } from "./hooks/useStorefrontData";

export function Storefront() {
    const { formatCurrency } = useCurrency();
    const {
        storeSlug,
        storeProfile,
        isLoadingStore,
        isStoreFetched,
        storeError,
        storeId,
        merchantProfile,
        brandingData,
        businessName,
        businessLogo,
        products,
        isLoadingProducts,
        cart,
        handleAdd,
        handleRemove,
        handleClear,
        canAddOne,
        cartTotal,
        cartCount,
        deliveryChargeRaw,
        freeDeliveryThreshold,
        effectiveDeliveryCharge,
        submitOrder,
        isSubmitting,
        orderComplete,
        setOrderComplete,
        setTrackedOrderId,
        orderStatus,
        submittedName,
        customerOrderIds,
        isCartOpen,
        setIsCartOpen,
        isOrdersOpen,
        setIsOrdersOpen,
        isPaymentPortalOpen,
        setIsPaymentPortalOpen,
        selectedOrderForPayment,
        setSelectedOrderForPayment,
        handlePaymentClose,
        handlePaymentSuccess,
        search,
        setSearch,
        filteredProducts,
        isAiSearching,
        aiSearchResult,
    } = useStorefrontData();

    // Loading
    if (isLoadingStore) {
        return <StorefrontLoadingState />;
    }

    // Store not found
    if (storeError || (isStoreFetched && !storeProfile)) {
        return <StorefrontNotFound error={storeError} />;
    }

    // Order success & live tracking
    if (orderComplete) {
        return (
            <StorefrontOrderTracking
                orderStatus={orderStatus}
                submittedName={submittedName}
                onClose={() => {
                    setOrderComplete(false);
                    setTrackedOrderId(null);
                }}
            />
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <StorefrontHeader
                businessName={businessName}
                businessLogo={businessLogo}
                products={products}
                cartCount={cartCount}
                cartTotal={cartTotal}
                effectiveDeliveryCharge={effectiveDeliveryCharge}
                formatCurrency={formatCurrency}
                onOpenOrders={() => setIsOrdersOpen(true)}
                onOpenCart={() => setIsCartOpen(true)}
            />

            {/* Banner with search */}
            <StorefrontBanner
                businessName={businessName}
                search={search}
                onSearchChange={setSearch}
            />

            {/* Product Grid */}
            <StorefrontProductGrid
                filteredProducts={filteredProducts}
                isLoadingProducts={isLoadingProducts}
                search={search}
                isAiSearching={isAiSearching}
                aiSearchResult={aiSearchResult}
                cart={cart}
                cartCount={cartCount}
                cartTotal={cartTotal}
                effectiveDeliveryCharge={effectiveDeliveryCharge}
                formatCurrency={formatCurrency}
                onOpenCart={() => setIsCartOpen(true)}
                onAdd={handleAdd}
                onRemove={handleRemove}
                canAddOne={canAddOne}
            />

            {/* Mobile floating bar */}
            <StorefrontMobileBar
                cartCount={cartCount}
                cartTotal={cartTotal}
                effectiveDeliveryCharge={effectiveDeliveryCharge}
                formatCurrency={formatCurrency}
                onOpenOrders={() => setIsOrdersOpen(true)}
                onOpenCart={() => setIsCartOpen(true)}
            />

            {/* Cart Drawer */}
            <CartDrawer
                open={isCartOpen}
                onClose={() => setIsCartOpen(false)}
                cart={cart}
                products={products}
                cartTotal={cartTotal}
                cartCount={cartCount}
                deliveryCharge={effectiveDeliveryCharge}
                baseDeliveryCharge={deliveryChargeRaw}
                freeDeliveryThreshold={freeDeliveryThreshold}
                formatCurrency={formatCurrency}
                onRemoveOne={handleRemove}
                onAddOne={handleAdd}
                canAddOne={canAddOne}
                onClearItem={handleClear}
                onSubmit={submitOrder}
                isSubmitting={isSubmitting}
                onlinePaymentEnabled={brandingData?.online_payment_enabled === true}
            />

            {/* Orders Drawer */}
            <OrdersDrawer
                open={isOrdersOpen}
                onClose={() => setIsOrdersOpen(false)}
                formatCurrency={formatCurrency}
                storeId={storeId}
                savedOrderIds={customerOrderIds}
                merchantProfile={merchantProfile}
                onPayOrder={(order) => {
                    setSelectedOrderForPayment({
                        id: order.id,
                        total_amount: order.total_amount,
                        customer_name: order.customer_name,
                        customer_phone: order.customer_phone,
                    });
                    setIsOrdersOpen(false);
                    setIsPaymentPortalOpen(true);
                }}
            />

            {/* Payment Portal Modal */}
            {selectedOrderForPayment && (
                <PaymentPortal
                    isOpen={isPaymentPortalOpen}
                    onClose={handlePaymentClose}
                    orderId={selectedOrderForPayment.id}
                    amount={selectedOrderForPayment.total_amount}
                    currency="INR"
                    storeName={businessName}
                    customerName={selectedOrderForPayment.customer_name}
                    customerPhone={selectedOrderForPayment.customer_phone}
                    storeUpiId={brandingData?.upi_id || undefined}
                    onPaymentSuccess={handlePaymentSuccess}
                />
            )}
        </div>
    );
}

export default Storefront;