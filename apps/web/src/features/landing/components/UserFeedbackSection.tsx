import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Star,
  CheckCircle2,
  Building2,
  ThumbsUp,
  MessageSquarePlus,
  Filter,
  ArrowUpRight,
  RotateCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SectionHeading } from "./shared/SectionHeading";
import { Reveal, Pull } from "@/features/landing/motion";
import { Button } from "@/components/ui/button";
import {
  FeedbackCategory,
  UserFeedbackItem,
  fetchFeedbackList,
  getFeedbackErrorMessage,
  markFeedbackHelpful,
  getLikedFeedbackIds,
} from "../lib/feedbackApi";
import { SubmitFeedbackModal } from "./SubmitFeedbackModal";

const CATEGORY_TABS: { id: FeedbackCategory; label: string }[] = [
  { id: "all", label: "All reviews" },
  { id: "pos", label: "Fast POS & billing" },
  { id: "khata", label: "Khata & WhatsApp" },
  { id: "gst", label: "GST & tax invoices" },
  { id: "inventory", label: "Stock & inventory" },
  { id: "general", label: "Daybook & daily closing" },
];

const CATEGORY_LABELS: Record<string, string> = {
  pos: "POS & billing",
  khata: "Khata & reminders",
  gst: "GST & tax invoices",
  inventory: "Stock & inventory",
  general: "Overall system",
};

/**
 * Every figure in this section is counted from the rows the server returned.
 * There is no seed list and no placeholder review: when no merchant has
 * written one yet, the section says so and asks for the first.
 */
function summarise(list: UserFeedbackItem[]) {
  const total = list.length;
  if (total === 0) {
    return { total, averageRating: 0, recommendCount: 0, topRatedCount: 0 };
  }

  const ratingSum = list.reduce((sum, item) => sum + item.rating, 0);
  return {
    total,
    averageRating: Math.round((ratingSum / total) * 10) / 10,
    recommendCount: list.filter((item) => item.recommend !== false).length,
    topRatedCount: list.filter((item) => item.rating === 5).length,
  };
}

export const UserFeedbackSection: React.FC = () => {
  const navigate = useNavigate();
  const [feedbackList, setFeedbackList] = useState<UserFeedbackItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<FeedbackCategory>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadFeedback = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const items = await fetchFeedbackList("all");
      setFeedbackList(items);
    } catch (error) {
      setFeedbackList([]);
      setLoadError(getFeedbackErrorMessage(error, "Could not load reviews right now."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setLikedIds(new Set(getLikedFeedbackIds()));
    void loadFeedback();
  }, [loadFeedback]);

  const handleHelpfulClick = async (item: UserFeedbackItem) => {
    if (likedIds.has(item.id)) return;

    // Show the vote immediately, then undo it if the server did not take it.
    setLikedIds((prev) => new Set(prev).add(item.id));
    setFeedbackList((prev) =>
      prev.map((f) => (f.id === item.id ? { ...f, helpful_count: f.helpful_count + 1 } : f))
    );

    const recorded = await markFeedbackHelpful(item.id);
    if (!recorded) {
      setLikedIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
      setFeedbackList((prev) =>
        prev.map((f) =>
          f.id === item.id ? { ...f, helpful_count: Math.max(0, f.helpful_count - 1) } : f
        )
      );
    }
  };

  const handleNewFeedback = (newFeedback: UserFeedbackItem) => {
    setFeedbackList((prev) => [newFeedback, ...prev.filter((f) => f.id !== newFeedback.id)]);
    setLoadError(null);
  };

  const stats = useMemo(() => summarise(feedbackList), [feedbackList]);
  const hasReviews = stats.total > 0;

  const filteredList = useMemo(() => {
    if (activeCategory === "all") return feedbackList;
    return feedbackList.filter((item) => item.category === activeCategory);
  }, [feedbackList, activeCategory]);

  return (
    <section
      id="feedback"
      className="border-b border-[hsl(var(--lp-rule))] bg-muted/15 py-16 sm:py-24"
    >
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          label="Merchant reviews"
          figure={
            hasReviews
              ? `${stats.averageRating.toFixed(1)} ★ from ${stats.total} ${
                  stats.total === 1 ? "review" : "reviews"
                }`
              : undefined
          }
          title="What shop owners write when the ledger closes"
          description="Every review here was submitted by a merchant using RupeeBill at their own counter. Nothing on this wall is written by us."
          className="mb-10"
        />

        {/* Scorecard — shown only once there are reviews to count. */}
        {hasReviews && (
          <Reveal move="lift" className="mb-12">
            <div className="rounded-2xl border border-[hsl(var(--lp-rule-strong))] bg-background p-6 shadow-sm sm:p-8">
              <div className="grid gap-6 lg:grid-cols-[1.2fr_1.8fr] lg:gap-10">
                <div className="flex flex-col justify-between border-b border-[hsl(var(--lp-rule))] pb-6 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-8">
                  <div>
                    <div className="text-xs font-bold text-[hsl(var(--lp-red))]">
                      Average rating across every submitted review
                    </div>
                    <div className="mt-3 flex items-baseline gap-3">
                      <span className="lp-shout text-[3.6rem] text-[hsl(var(--lp-ink))] sm:text-[4.2rem]">
                        {stats.averageRating.toFixed(1)}
                      </span>
                      <span className="text-xl font-bold text-muted-foreground sm:text-2xl">
                        / 5.0
                      </span>
                    </div>

                    <div className="mt-2 flex items-center gap-1.5 text-amber-500">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-5 w-5 ${
                            i < Math.round(stats.averageRating)
                              ? "fill-amber-400 text-amber-400"
                              : "text-muted-foreground/30"
                          }`}
                        />
                      ))}
                      <span className="ml-2 text-xs font-bold text-[hsl(var(--lp-ink))]">
                        {stats.total} {stats.total === 1 ? "review" : "reviews"} so far
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <Pull travel={2}>
                      <Button
                        onClick={() => setModalOpen(true)}
                        className="lp-btn h-10 gap-2 rounded-xl px-4 text-xs font-bold sm:text-sm"
                      >
                        <MessageSquarePlus className="h-4 w-4 text-amber-300" />
                        Write a review
                      </Button>
                    </Pull>
                    <span className="text-[11px] text-muted-foreground">
                      Takes 30 seconds · No login required
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:gap-6">
                  <div className="border-l border-[hsl(var(--lp-rule))] pl-4">
                    <div className="lp-figure text-2xl font-extrabold text-[hsl(var(--lp-ink))] sm:text-3xl">
                      {stats.recommendCount} of {stats.total}
                    </div>
                    <div className="mt-1 text-xs font-semibold text-muted-foreground">
                      Would recommend RupeeBill to another merchant
                    </div>
                  </div>

                  <div className="border-l border-[hsl(var(--lp-rule))] pl-4">
                    <div className="lp-figure text-2xl font-extrabold text-[hsl(var(--lp-ink))] sm:text-3xl">
                      {stats.topRatedCount} of {stats.total}
                    </div>
                    <div className="mt-1 text-xs font-semibold text-muted-foreground">
                      Rated the system five stars
                    </div>
                  </div>

                  <div className="col-span-2 rounded-xl bg-[hsl(var(--lp-paper-sunk))] p-3.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-[hsl(var(--lp-ink))]">
                      <CheckCircle2 className="h-4 w-4 text-[hsl(var(--lp-green))]" />
                      <span>Submitted by merchants, published unedited</span>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Reviews arrive through the form on this page and appear exactly as written.
                      A green tick marks a store we have confirmed is billing on RupeeBill.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        )}

        {/* Category filter. A row of zero-counts is not worth showing. */}
        {hasReviews && (
          <div className="mb-8 flex items-center justify-between gap-4 border-b border-[hsl(var(--lp-rule))] pb-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
              {CATEGORY_TABS.map((tab) => {
                const active = activeCategory === tab.id;
                const count =
                  tab.id === "all"
                    ? feedbackList.length
                    : feedbackList.filter((f) => f.category === tab.id).length;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveCategory(tab.id)}
                    /* `--lp-ink` is the page's foreground, so it inverts with
                       the theme: in dark mode this chip was a near-white block
                       carrying white text, and the selected filter became the
                       only unreadable one. `--lp-paper` inverts with it, so the
                       pair stays legible in both themes — the same pairing the
                       feature tab bar and the trade chips already use. */
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 ${
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "border border-border/80 bg-background text-muted-foreground hover:border-border hover:text-foreground"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                        active
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setModalOpen(true)}
              className="hidden shrink-0 items-center gap-1 text-xs font-bold text-[hsl(var(--lp-red))] hover:underline md:inline-flex"
            >
              <span>Write a review</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {isLoading && (
          <div className="rounded-2xl border border-dashed border-[hsl(var(--lp-rule-strong))] p-10 text-center">
            <p className="text-sm text-muted-foreground">Loading reviews…</p>
          </div>
        )}

        {/* The wall could not be read. Say so; do not fill it in. */}
        {!isLoading && loadError && (
          <div className="rounded-2xl border border-[hsl(var(--lp-rule-strong))] bg-background p-8 text-center sm:p-10">
            <p className="text-sm font-semibold text-foreground">{loadError}</p>
            <p className="mx-auto mt-2 max-w-[48ch] text-xs text-muted-foreground">
              Reviews load from our servers, so this section stays empty rather than showing
              anything a merchant did not write.
            </p>
            <Button
              onClick={() => void loadFeedback()}
              variant="outline"
              className="mt-5 gap-2 border-[hsl(var(--lp-rule-strong))] bg-background text-xs font-bold text-foreground hover:bg-muted"
            >
              <RotateCw className="h-3.5 w-3.5" />
              Try again
            </Button>
          </div>
        )}

        {/* Nobody has written one yet. */}
        {!isLoading && !loadError && !hasReviews && (
          <Reveal move="lift">
            <div className="rounded-2xl border border-[hsl(var(--lp-rule-strong))] bg-background p-8 text-center sm:p-12">
              <div className="lp-display text-2xl text-[hsl(var(--lp-ink))] sm:text-3xl">
                No reviews on the wall yet
              </div>
              <p className="lp-prose mx-auto mt-3 max-w-[48ch] text-sm leading-relaxed text-muted-foreground">
                This page carries real merchant reviews only, so it stays empty until the first
                shop owner writes one. If you bill on RupeeBill, that can be you.
              </p>
              <Pull travel={2}>
                <Button
                  onClick={() => setModalOpen(true)}
                  className="lp-btn mt-6 h-11 gap-2 rounded-xl px-5 text-xs font-bold sm:text-sm"
                >
                  <MessageSquarePlus className="h-4 w-4 text-amber-300" />
                  Write the first review
                </Button>
              </Pull>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Takes 30 seconds · No login required
              </p>
            </div>
          </Reveal>
        )}

        {!isLoading && !loadError && hasReviews && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredList.map((item, index) => {
              const hasLiked = likedIds.has(item.id);

              return (
                <Reveal
                  as="article"
                  move="lift"
                  key={item.id}
                  index={index % 6}
                  /* The transition is named down to the two properties the
                     hover actually changes. Tailwind's bare `transition`
                     includes `transform` and `opacity`, which are exactly what
                     `Reveal` is animating from JS — so every card's arrival was
                     being run twice, by the compositor and by Framer at once,
                     and landed with a visible stutter. */
                  className="flex flex-col justify-between rounded-2xl border border-[hsl(var(--lp-rule))] bg-background p-5 text-left shadow-sm transition-[border-color,box-shadow] duration-200 hover:border-[hsl(var(--lp-rule-strong))] hover:shadow-md sm:p-6"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 border-b border-[hsl(var(--lp-rule))] pb-3">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < item.rating
                                ? "fill-amber-400 text-amber-400"
                                : "text-muted-foreground/30"
                            }`}
                          />
                        ))}
                      </div>

                      <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        {CATEGORY_LABELS[item.category] || item.category}
                      </span>
                    </div>

                    <blockquote className="lp-prose mt-3 text-sm leading-relaxed text-foreground/90">
                      &ldquo;{item.feedback_text}&rdquo;
                    </blockquote>
                  </div>

                  <div className="mt-6 border-t border-[hsl(var(--lp-rule))] pt-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="lp-figure flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[hsl(var(--lp-rule-strong))] bg-[hsl(var(--lp-paper-sunk))] text-xs font-bold text-[hsl(var(--lp-ink))]">
                          {item.author_name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </span>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-xs font-bold text-foreground">
                              {item.author_name}
                            </span>
                            {/* A lucide icon forwards no `title`, so the tick
                                carried no tooltip and no accessible name at
                                all — it was a green shape with no meaning. The
                                wrapper holds both. */}
                            {item.is_verified && (
                              <span
                                className="inline-flex shrink-0"
                                title="Confirmed RupeeBill store"
                              >
                                <CheckCircle2
                                  aria-label="Confirmed RupeeBill store"
                                  role="img"
                                  className="h-3.5 w-3.5 text-[hsl(var(--lp-green))]"
                                />
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                            <Building2 className="h-3 w-3 shrink-0" />
                            <span className="truncate">
                              {item.business_name}
                              {item.city ? `, ${item.city}` : ""}
                            </span>
                          </div>
                          {item.business_type && (
                            <span className="mt-0.5 inline-block text-[10px] font-medium text-muted-foreground/80">
                              {item.business_type}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleHelpfulClick(item)}
                        disabled={hasLiked}
                        className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition ${
                          hasLiked
                            ? "border-[hsl(var(--lp-green)/0.4)] bg-[hsl(var(--lp-green)/0.08)] text-[hsl(var(--lp-green))]"
                            : "border-[hsl(var(--lp-rule))] bg-background text-muted-foreground hover:border-[hsl(var(--lp-ink)/0.4)] hover:text-foreground"
                        }`}
                        title={hasLiked ? "You found this helpful" : "Helpful review"}
                        aria-label="Mark helpful"
                      >
                        <ThumbsUp className={`h-3 w-3 ${hasLiked ? "fill-current" : ""}`} />
                        <span className="lp-figure">{item.helpful_count}</span>
                      </button>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        )}

        {/* A chosen category with nothing in it yet. */}
        {!isLoading && !loadError && hasReviews && filteredList.length === 0 && (
          <div className="my-10 rounded-2xl border border-dashed border-[hsl(var(--lp-rule-strong))] p-10 text-center">
            <p className="text-sm text-muted-foreground">
              No reviews in this category yet. Be the first to write one.
            </p>
            <Button
              onClick={() => setModalOpen(true)}
              className="lp-btn mt-4 rounded-xl px-4 text-xs font-bold"
            >
              Write a review
            </Button>
          </div>
        )}

        <div className="mt-12 flex flex-col items-center justify-between gap-4 rounded-2xl border border-[hsl(var(--lp-rule))] bg-background p-6 sm:flex-row sm:p-8">
          <div>
            <div className="text-base font-bold text-foreground">
              Run a shop or wholesale business in India?
            </div>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Try RupeeBill free for counter billing, stock tracking, and customer khata. We build
              features from what merchants write here.
            </p>
          </div>
          <div className="flex shrink-0 gap-3">
            <Button
              onClick={() => setModalOpen(true)}
              variant="outline"
              className="border-[hsl(var(--lp-rule-strong))] bg-background text-xs font-bold text-foreground hover:bg-muted"
            >
              Write a review
            </Button>
            {/* `navigate`, not a bare `<a href>`. This is the only CTA on the
                page that was a real link, so it tore the SPA down and reloaded
                the whole bundle to reach a route the router already has. */}
            <Button
              onClick={() => navigate("/auth?mode=signup")}
              className="lp-btn rounded-xl text-xs font-bold"
            >
              Start free
            </Button>
          </div>
        </div>
      </div>

      <SubmitFeedbackModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onFeedbackSubmitted={handleNewFeedback}
      />
    </section>
  );
};
