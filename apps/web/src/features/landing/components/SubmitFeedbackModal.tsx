import React, { useId, useState } from "react";
import {
  Star,
  CheckCircle2,
  Sparkles,
  Loader2,
  ThumbsUp,
  Store,
  MapPin,
  User,
  MessageSquare,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  SubmitFeedbackPayload,
  UserFeedbackItem,
  getFeedbackErrorMessage,
  submitUserFeedback,
} from "../lib/feedbackApi";

interface SubmitFeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFeedbackSubmitted?: (feedback: UserFeedbackItem) => void;
}

const RATING_LABELS: Record<number, string> = {
  1: "1 Star — Needs Improvement",
  2: "2 Stars — Fair",
  3: "3 Stars — Good & Working",
  4: "4 Stars — Great Experience!",
  5: "5 Stars — Outstanding & Loved!",
};

const CATEGORIES: { id: "pos" | "inventory" | "gst" | "khata" | "general"; label: string }[] = [
  { id: "pos", label: "POS & Billing" },
  { id: "inventory", label: "Stock & Inventory" },
  { id: "gst", label: "GST & Tax Invoices" },
  { id: "khata", label: "Khata & Reminders" },
  { id: "general", label: "Overall System" },
];

const TRADE_TYPES = [
  "Grocery & Kirana",
  "Garments & Apparel",
  "Electronics & Mobile",
  "Hardware & Electrical",
  "Pharmacy & Medical",
  "Automotive Spares",
  "Cafe & Restaurant",
  "Wholesale & Distributor",
  "Other Retail Shop",
];

const INPUT_CLASS =
  "mt-1.5 w-full rounded-xl border border-[hsl(var(--lp-rule-strong))] bg-background px-3.5 py-2.5 text-sm text-[hsl(var(--lp-ink))] outline-none transition placeholder:text-muted-foreground/60 hover:border-[hsl(var(--lp-ink)/0.45)] focus:border-[hsl(var(--lp-ink))] focus:ring-1 focus:ring-[hsl(var(--lp-ink))]";

export const SubmitFeedbackModal: React.FC<SubmitFeedbackModalProps> = ({
  open,
  onOpenChange,
  onFeedbackSubmitted,
}) => {
  const uid = useId();

  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [category, setCategory] = useState<"pos" | "inventory" | "gst" | "khata" | "general">("pos");
  const [recommend, setRecommend] = useState<boolean>(true);
  const [authorName, setAuthorName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState(TRADE_TYPES[0]);
  const [city, setCity] = useState("");
  const [feedbackText, setFeedbackText] = useState("");
  const [honeypot, setHoneypot] = useState("");

  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedItem, setSubmittedItem] = useState<UserFeedbackItem | null>(null);

  const resetForm = () => {
    setRating(5);
    setCategory("pos");
    setRecommend(true);
    setAuthorName("");
    setBusinessName("");
    setCity("");
    setFeedbackText("");
    setErrorMessage(null);
    setStatus("idle");
    setSubmittedItem(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "submitting") return;

    if (!authorName.trim()) {
      setErrorMessage("Please enter your name.");
      return;
    }
    if (!businessName.trim()) {
      setErrorMessage("Please enter your shop or business name.");
      return;
    }
    if (feedbackText.trim().length < 15) {
      setErrorMessage("Please write at least 15 characters of feedback.");
      return;
    }

    setErrorMessage(null);
    setStatus("submitting");

    const payload: SubmitFeedbackPayload = {
      author_name: authorName.trim(),
      business_name: businessName.trim(),
      business_type: businessType,
      city: city.trim() || undefined,
      rating,
      category,
      recommend,
      feedback_text: feedbackText.trim(),
      website_honeypot: honeypot,
    };

    try {
      const result = await submitUserFeedback(payload);
      if (result.feedback) {
        setSubmittedItem(result.feedback);
        onFeedbackSubmitted?.(result.feedback);
      }
      setStatus("success");
    } catch (error) {
      // The review is not kept locally and never shown as published unless the
      // server stored it, so a failure has to be reported as a failure.
      setErrorMessage(
        getFeedbackErrorMessage(
          error,
          "Could not save your review right now. Please try again."
        )
      );
      setStatus("idle");
    }
  };

  const activeRating = hoverRating ?? rating;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          resetForm();
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="lp max-h-[92vh] w-[calc(100%-1.5rem)] max-w-xl overflow-y-auto rounded-2xl border border-[hsl(var(--lp-rule-strong))] bg-[hsl(var(--lp-paper))] p-0 text-[hsl(var(--lp-ink))] shadow-2xl">
        {status === "success" ? (
          <div className="flex flex-col items-center justify-center px-6 py-12 text-center sm:px-10">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[hsl(var(--lp-green)/0.14)] text-[hsl(var(--lp-green))] shadow-inner">
              <CheckCircle2 className="h-9 w-9" />
            </div>

            <div className="lp-stamp lp-stamp-in mt-6">Review published</div>

            <DialogHeader className="mt-4 items-center text-center">
              <DialogTitle className="lp-title text-2xl text-[hsl(var(--lp-ink))] sm:text-3xl">
                Thank you, {submittedItem?.author_name || "Merchant"}!
              </DialogTitle>
              <DialogDescription className="lp-prose max-w-md pt-2 text-sm leading-relaxed text-muted-foreground">
                Your feedback for{" "}
                <span className="font-bold text-foreground">
                  {submittedItem?.business_name || "your shop"}
                </span>{" "}
                has been submitted and published to our community reviews wall.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 flex items-center justify-center gap-1 text-amber-500">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-5 w-5 ${
                    i < (submittedItem?.rating || 5)
                      ? "fill-amber-400 text-amber-400"
                      : "text-muted-foreground/30"
                  }`}
                />
              ))}
            </div>

            <p className="mt-3 max-w-md text-xs italic text-muted-foreground">
              &ldquo;{submittedItem?.feedback_text}&rdquo;
            </p>

            <div className="mt-8 flex gap-3">
              <Button
                onClick={() => {
                  onOpenChange(false);
                  resetForm();
                }}
                className="lp-btn h-10 px-6 text-xs sm:text-sm"
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Modal Header */}
            <div className="border-b border-[hsl(var(--lp-rule))] bg-[hsl(var(--lp-paper-sunk))] px-5 py-5 sm:px-7 sm:py-6">
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <span className="lp-stamp">Merchant Voice</span>
                  <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    Help other shop owners choose
                  </div>
                </div>
                <DialogTitle className="lp-title mt-2 text-2xl text-[hsl(var(--lp-ink))] sm:text-3xl">
                  Share Your RupeeBill Experience
                </DialogTitle>
                <DialogDescription className="lp-prose text-xs text-muted-foreground sm:text-sm">
                  Tell us how RupeeBill impacts your daily counter billing, credit recovery, or stock control.
                </DialogDescription>
              </DialogHeader>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} noValidate className="space-y-5 px-5 py-5 sm:px-7 sm:py-6">
              {/* Star Rating Selector */}
              <div className="rounded-xl border border-[hsl(var(--lp-rule))] bg-background p-4 text-center">
                <span className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Overall Rating
                </span>
                <div
                  className="mt-2.5 flex items-center justify-center gap-2"
                  onMouseLeave={() => setHoverRating(null)}
                >
                  {[1, 2, 3, 4, 5].map((starValue) => {
                    const isFilled = starValue <= activeRating;
                    return (
                      <button
                        type="button"
                        key={starValue}
                        onClick={() => setRating(starValue)}
                        onMouseEnter={() => setHoverRating(starValue)}
                        className="group p-1 transition-transform hover:scale-125 focus:outline-none"
                        aria-label={`Rate ${starValue} star`}
                      >
                        <Star
                          className={`h-7 w-7 transition-colors sm:h-8 sm:w-8 ${
                            isFilled
                              ? "fill-amber-400 text-amber-500 drop-shadow-[0_2px_8px_rgba(245,158,11,0.35)]"
                              : "text-muted-foreground/30 group-hover:text-amber-300"
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 text-xs font-semibold text-[hsl(var(--lp-ink))]">
                  {RATING_LABELS[activeRating] || "Rate your experience"}
                </div>
              </div>

              {/* Category Chips */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Which feature helped you most?
                </label>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {CATEGORIES.map((cat) => {
                    const selected = category === cat.id;
                    return (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => setCategory(cat.id)}
                        /* `text-white` on an `--lp-ink` fill is white-on-white
                           once the theme flips, because `--lp-ink` is the
                           foreground colour. `--lp-paper` is its counterpart
                           and inverts with it. */
                        className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                          selected
                            ? "border-primary bg-primary text-primary-foreground shadow-sm"
                            : "border-border bg-background text-foreground hover:border-border/80"
                        }`}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Recommendation Switch */}
              <div className="flex items-center justify-between rounded-xl border border-border bg-background p-3.5">
                <div className="flex items-center gap-2">
                  <ThumbsUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-semibold text-foreground">
                    Would you recommend RupeeBill to another merchant?
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setRecommend(true)}
                    className={`rounded-md px-2.5 py-1 text-xs font-bold transition-colors ${
                      recommend
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecommend(false)}
                    className={`rounded-md px-2.5 py-1 text-xs font-bold transition ${
                      !recommend
                        ? "bg-[hsl(var(--lp-red-btn))] text-white"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>

              {/* Merchant Details Grid */}
              <div className="grid gap-3.5 sm:grid-cols-2">
                <label htmlFor={`${uid}-author`} className="block text-xs font-semibold text-[hsl(var(--lp-ink))]">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3 text-muted-foreground" /> Your Name *
                  </span>
                  <input
                    id={`${uid}-author`}
                    type="text"
                    required
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="Your full name"
                    maxLength={100}
                    className={INPUT_CLASS}
                  />
                </label>

                <label htmlFor={`${uid}-business`} className="block text-xs font-semibold text-[hsl(var(--lp-ink))]">
                  <span className="flex items-center gap-1">
                    <Store className="h-3 w-3 text-muted-foreground" /> Shop / Business Name *
                  </span>
                  <input
                    id={`${uid}-business`}
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Name on your shop board"
                    maxLength={120}
                    className={INPUT_CLASS}
                  />
                </label>
              </div>

              <div className="grid gap-3.5 sm:grid-cols-2">
                <label htmlFor={`${uid}-trade`} className="block text-xs font-semibold text-[hsl(var(--lp-ink))]">
                  Trade / Store Type
                  <select
                    id={`${uid}-trade`}
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                    className={INPUT_CLASS}
                  >
                    {TRADE_TYPES.map((trade) => (
                      <option key={trade} value={trade}>
                        {trade}
                      </option>
                    ))}
                  </select>
                </label>

                <label htmlFor={`${uid}-city`} className="block text-xs font-semibold text-[hsl(var(--lp-ink))]">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-muted-foreground" /> City, State
                  </span>
                  <input
                    id={`${uid}-city`}
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Jaipur, Rajasthan"
                    maxLength={80}
                    className={INPUT_CLASS}
                  />
                </label>
              </div>

              {/* Review Text */}
              <label htmlFor={`${uid}-feedback`} className="block text-xs font-semibold text-[hsl(var(--lp-ink))]">
                <span className="flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3 text-muted-foreground" /> Your Review / Feedback *
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {feedbackText.length}/1000
                  </span>
                </span>
                <textarea
                  id={`${uid}-feedback`}
                  rows={4}
                  required
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Share details on how RupeeBill helped your checkout speed, inventory counts, GSTR-1 filing, or udhar recovery..."
                  maxLength={1000}
                  className={`${INPUT_CLASS} resize-y leading-relaxed`}
                />
              </label>

              {/* Honeypot for spam bots */}
              <div className="absolute left-[-9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
                <label htmlFor={`${uid}-honeypot`}>Leave this empty</label>
                <input
                  id={`${uid}-honeypot`}
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div
                  role="alert"
                  className="rounded-lg bg-[hsl(var(--lp-red)/0.09)] px-3.5 py-2.5 text-xs font-medium text-[hsl(var(--lp-red))]"
                >
                  {errorMessage}
                </div>
              )}

              {/* Modal Footer Actions */}
              <div className="flex flex-col-reverse items-center justify-between gap-3 pt-2 sm:flex-row">
                <p className="text-center text-[11px] text-muted-foreground sm:text-left">
                  Your feedback helps real shop owners make informed choices.
                </p>
                <Button
                  type="submit"
                  disabled={status === "submitting"}
                  className="lp-btn h-11 w-full rounded-xl px-6 text-xs font-bold sm:w-auto sm:text-sm"
                >
                  {status === "submitting" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4 text-amber-300" />
                      Submit Review
                    </>
                  )}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
