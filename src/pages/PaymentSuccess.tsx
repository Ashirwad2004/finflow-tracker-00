import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/core/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Download, ShoppingBag, ArrowRight, Loader2 } from "lucide-react";
import { generateInvoicePDF } from "@/core/utils/invoiceGenerator";
import { useToast } from "@/core/hooks/use-toast";

export default function PaymentSuccess() {
  const { storeSlug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const paymentId = searchParams.get("paymentId");
  const orderId = searchParams.get("orderId");

  const [loading, setLoading] = useState(true);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");

  useEffect(() => {
    async function fetchPaymentDetails() {
      if (!paymentId) {
        setLoading(false);
        return;
      }

      try {
        // Fetch payment and associated online order details
        const { data, error } = await supabase
          .from("payments")
          .select(`
            *,
            online_orders (
              *,
              online_order_items (
                quantity,
                price_at_time,
                products ( name )
              )
            ),
            invoices ( invoice_number )
          `)
          .eq("id", paymentId)
          .single();

        if (error) throw error;
        setPaymentData(data);
        
        if (data.invoices && data.invoices.length > 0) {
          setInvoiceNumber(data.invoices[0].invoice_number);
        } else {
          setInvoiceNumber(`INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
        }
      } catch (err) {
        console.error("Error loading payment for success screen:", err);
        toast({
          title: "Loading issue",
          description: "Could not fetch details, but payment was recorded.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    }

    fetchPaymentDetails();
  }, [paymentId, toast]);

  const handleDownloadInvoice = () => {
    if (!paymentData || !paymentData.online_orders) return;

    const order = paymentData.online_orders;
    const items = order.online_order_items.map((item: any) => ({
      name: item.products?.name ?? "Product Item",
      quantity: item.quantity,
      price: Number(item.price_at_time)
    }));

    generateInvoicePDF({
      invoiceNumber: invoiceNumber,
      date: new Date(paymentData.created_at).toLocaleDateString(),
      storeName: "FinFlow Storefront",
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
      customerAddress: order.customer_address,
      items: items,
      subtotal: Number(order.total_amount) - Number(order.delivery_charge || 0),
      deliveryCharge: Number(order.delivery_charge || 0),
      totalAmount: Number(order.total_amount),
      paymentMethod: paymentData.payment_method || "Online",
      status: paymentData.status
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm font-medium">Verifying receipt details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-card border rounded-3xl shadow-2xl p-8 text-center space-y-6 animate-scale-in">
        {/* Success checkmark */}
        <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-950/30 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 className="w-12 h-12 text-emerald-500" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black text-foreground">Order Placed Successfully!</h1>
          <p className="text-sm text-muted-foreground">
            Thank you! Your payment has been received and verified.
          </p>
        </div>

        {/* Invoice Summary Card */}
        {paymentData && (
          <div className="border rounded-2xl p-5 bg-background text-left space-y-3 divide-y divide-border/60">
            <div className="flex justify-between items-center text-sm pb-2">
              <span className="text-muted-foreground">Transaction ID:</span>
              <span className="font-semibold text-foreground truncate max-w-[180px]">
                {paymentData.gateway_payment_id || paymentData.gateway_order_id}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm py-2">
              <span className="text-muted-foreground">Invoice No:</span>
              <span className="font-semibold text-foreground">{invoiceNumber}</span>
            </div>
            <div className="flex justify-between items-center text-sm py-2">
              <span className="text-muted-foreground">Payment Method:</span>
              <span className="font-semibold text-foreground uppercase">
                {paymentData.payment_method || "online"}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm pt-2">
              <span className="font-bold text-foreground">Amount Paid:</span>
              <span className="font-black text-primary text-base">
                INR {Number(paymentData.amount).toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Action button triggers */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            onClick={handleDownloadInvoice}
            variant="outline"
            className="flex-1 rounded-2xl h-12 border-primary/30 text-primary hover:bg-primary/5"
            disabled={!paymentData}
          >
            <Download className="w-4 h-4 mr-2" />
            Invoice PDF
          </Button>
          <Button
            onClick={() => navigate(`/store/${storeSlug}`)}
            className="flex-1 rounded-2xl h-12 shadow-lg"
          >
            <ShoppingBag className="w-4 h-4 mr-2" />
            Store Home
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
