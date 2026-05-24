import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { XCircle, ShoppingBag, RefreshCw, AlertCircle } from "lucide-react";

export default function PaymentFailure() {
  const { storeSlug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get("orderId");
  const errorMsg = searchParams.get("message") || "The bank declined the transaction or payment timed out.";

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-card border rounded-3xl shadow-2xl p-8 text-center space-y-6 animate-scale-in">
        {/* Failure icon */}
        <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <XCircle className="w-12 h-12 text-destructive" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black text-foreground">Payment Failed</h1>
          <p className="text-sm text-muted-foreground">
            We couldn't process your transaction. No money was deducted.
          </p>
        </div>

        {/* Error Details */}
        <div className="p-5 border border-dashed rounded-2xl bg-destructive/5 text-left flex gap-3">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold text-destructive uppercase tracking-wider">Failure Reason</div>
            <div className="text-sm text-foreground/80 mt-1 leading-relaxed">{errorMsg}</div>
          </div>
        </div>

        {/* Action button triggers */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            onClick={() => navigate(`/store/${storeSlug}?retryOrder=${orderId}`)}
            variant="outline"
            className="flex-1 rounded-2xl h-12 border-primary/30 text-primary hover:bg-primary/5"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry Payment
          </Button>
          <Button
            onClick={() => navigate(`/store/${storeSlug}`)}
            className="flex-1 rounded-2xl h-12 shadow-lg"
          >
            <ShoppingBag className="w-4 h-4 mr-2" />
            Store Catalog
          </Button>
        </div>
      </div>
    </div>
  );
}