import {
  initPricingBrowserTweaks,
  PricingHeader,
  PricingFooter,
  PaymentSuccessModal,
  PricingPlanCards,
  PricingCheckoutCard,
  PricingTermsSection,
  usePricingState,
} from "./pricing/index";

// Initialize canvas / preload optimizations
initPricingBrowserTweaks();

export default function Pricing() {
  const {
    user,
    paymentMethod,
    setPaymentMethod,
    name,
    setName,
    phone,
    setPhone,
    isProcessing,
    isPaymentSuccess,
    paidPaymentId,
    paidDateTime,
    paymentError,
    authMode,
    setAuthMode,
    authEmail,
    setAuthEmail,
    authPassword,
    setAuthPassword,
    authName,
    setAuthName,
    authLoading,
    authError,
    termsAccepted,
    setTermsAccepted,
    isSubLoading,
    trialDaysLeft,
    isTrialActive,
    isPaidSubscriber,
    displayTotal,
    handleDownloadVerifiedBill,
    handleInlineAuth,
    handleSubscribe,
  } = usePricingState();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors duration-200">
      <PricingHeader user={user} />

      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-8">
        {/* Payment Success Overlay */}
        {isPaymentSuccess && (
          <PaymentSuccessModal
            paidPaymentId={paidPaymentId}
            paidDateTime={paidDateTime}
            onDownloadBill={handleDownloadVerifiedBill}
          />
        )}

        {/* Plans Overview */}
        <PricingPlanCards user={user} />

        {/* Focused Single Checkout Card */}
        <PricingCheckoutCard
          user={user}
          isTrialActive={isTrialActive}
          trialDaysLeft={trialDaysLeft}
          isPaidSubscriber={isPaidSubscriber}
          name={name}
          setName={setName}
          phone={phone}
          setPhone={setPhone}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          termsAccepted={termsAccepted}
          setTermsAccepted={setTermsAccepted}
          paymentError={paymentError}
          isProcessing={isProcessing}
          isSubLoading={isSubLoading}
          displayTotal={displayTotal}
          onSubscribe={handleSubscribe}
          onDownloadBill={handleDownloadVerifiedBill}
          authMode={authMode}
          setAuthMode={setAuthMode}
          authName={authName}
          setAuthName={setAuthName}
          authEmail={authEmail}
          setAuthEmail={setAuthEmail}
          authPassword={authPassword}
          setAuthPassword={setAuthPassword}
          authLoading={authLoading}
          authError={authError}
          onAuthSubmit={handleInlineAuth}
        />

        {/* Dedicated Terms & Conditions Section */}
        <PricingTermsSection />
      </main>

      <PricingFooter />
    </div>
  );
}