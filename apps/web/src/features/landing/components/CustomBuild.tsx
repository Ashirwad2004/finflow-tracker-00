import React, { useId, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Check,
  CheckCircle2,
  Database,
  Layers,
  Link2,
  Loader2,
  Lock,
  MessageCircle,
  Settings,
  Smartphone,
  Sparkles,
  TrendingUp,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/features/landing/motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  BuildType,
  describeSubmitError,
  submitCustomBuild,
} from "../lib/customBuildApi";

const SERVICE_OPTIONS: {
  value: BuildType;
  title: string;
  icon: LucideIcon;
}[] = [
  { value: "custom_app", title: "B2B / Mobile App", icon: Smartphone },
  { value: "feature", title: "Custom Module", icon: Settings },
  { value: "integration", title: "Tally / ERP Sync", icon: Link2 },
  { value: "report", title: "BI Dashboard", icon: BarChart3 },
];

const WHATSAPP_LINK =
  "https://wa.me/918102545007?text=Hi%20RupeeBill%2C%20I%20want%20to%20discuss%20a%20custom%20software%20project.";

const INPUT_CLASS =
  "mt-1.5 w-full rounded-xl border border-border bg-muted/40 px-3.5 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/60 hover:border-foreground/30 focus:border-primary focus:ring-1 focus:ring-primary";

export const CustomBuild: React.FC = () => {
  const uid = useId();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    business_name: "",
    contact_name: "",
    contact_phone: "",
    build_type: "custom_app" as BuildType,
    description: "",
  });
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState("");

  const set =
    (key: keyof typeof form) =>
    (
      event: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) => {
      setForm((previous) => ({ ...previous, [key]: event.target.value }));
      if (error) setError(null);
    };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (status === "sending") return;

    if (!form.contact_name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!form.business_name.trim()) {
      setError("Please enter your business or project name.");
      return;
    }
    if (!form.contact_phone.trim()) {
      setError("Please enter a phone or WhatsApp number.");
      return;
    }
    if (form.description.trim().length < 20) {
      setError("Please tell us a little more about your idea.");
      return;
    }

    setStatus("sending");
    setError(null);

    try {
      const result = await submitCustomBuild({
        business_name: form.business_name.trim(),
        contact_name: form.contact_name.trim(),
        contact_phone: form.contact_phone.trim(),
        build_type: form.build_type,
        description: form.description.trim(),
        company_website: honeypot,
      });
      setReference(result.reference);
      setStatus("sent");
    } catch (submissionError) {
      setError(describeSubmitError(submissionError));
      setStatus("idle");
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <section
        id="custom-work"
        className="border-b border-border/80 py-16 sm:py-20"
      >
        <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Reveal
            move="lift"
            className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#0c101d] via-[#090d18] to-[#05070e] p-6 text-white shadow-[0_25px_70px_rgba(0,0,0,0.5)] sm:p-9 lg:p-12"
          >
            {/* Ambient Lighting Gradients */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-violet-600/20 blur-[100px]"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-emerald-600/15 blur-[100px]"
            />
            {/* Subtle Dot Grid Texture */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:20px_20px] opacity-70"
            />

            <div className="relative z-10 grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
              {/* Left Column: Copy & Actions */}
              <div className="lg:col-span-6 flex flex-col justify-center space-y-6 text-left">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-300">
                    <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                    <span>Bespoke Engineering &amp; Custom Builds</span>
                  </div>

                  <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-[2.5rem] lg:leading-[1.18]">
                    Need custom software tailored for your business?
                  </h2>

                  <p className="mt-3.5 text-sm leading-relaxed text-zinc-300 sm:text-base">
                    Off-the-shelf software doesn&apos;t fit complex wholesale, manufacturing, or distribution workflows. We architect and deploy custom B2B portals, multi-store ERPs, WhatsApp order automations, and live Tally/SAP sync pipelines.
                  </p>
                </div>

                {/* Capability Cards */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] p-3 transition-colors hover:bg-white/[0.08]">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/20 text-violet-300">
                      <Layers className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">B2B Portals</div>
                      <div className="text-[10px] text-zinc-400">Wholesale &amp; Dealers</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] p-3 transition-colors hover:bg-white/[0.08]">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300">
                      <Smartphone className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Custom Apps</div>
                      <div className="text-[10px] text-zinc-400">Field Sales &amp; POS</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] p-3 transition-colors hover:bg-white/[0.08]">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300">
                      <Bot className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Automations</div>
                      <div className="text-[10px] text-zinc-400">WhatsApp Order Bots</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] p-3 transition-colors hover:bg-white/[0.08]">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/20 text-blue-300">
                      <Database className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Integrations</div>
                      <div className="text-[10px] text-zinc-400">Tally, SAP &amp; APIs</div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
                  <DialogTrigger asChild>
                    <Button
                      size="lg"
                      className="h-11 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 px-6 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all duration-200 hover:from-violet-700 hover:to-indigo-700 hover:shadow-violet-500/40 hover:scale-[1.02] active:scale-[0.98] border-0"
                    >
                      <span>Start a project</span>
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </DialogTrigger>

                  <a
                    href={WHATSAPP_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 text-sm font-semibold text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/10 hover:border-white/30"
                  >
                    <MessageCircle className="h-4 w-4 text-[#25D366]" />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>

              {/* Right Column: Hyper-Realistic Software Showcase */}
              <div className="lg:col-span-6 relative">
                {/* Main Window Frame */}
                <div className="relative rounded-2xl border border-white/15 bg-slate-900/95 shadow-2xl shadow-black/80 backdrop-blur-xl overflow-hidden">
                  {/* Browser / App Header */}
                  <div className="flex items-center justify-between border-b border-white/10 bg-slate-950/70 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                      </div>
                      <div className="ml-2 flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-mono text-zinc-300">
                        <Lock className="h-2.5 w-2.5 text-emerald-400" />
                        <span>portal.apex-distributors.in</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Live Sync</span>
                    </div>
                  </div>

                  {/* App Content Body */}
                  <div className="p-4 sm:p-5 space-y-4">
                    {/* Live Metric Badges */}
                    <div className="grid grid-cols-3 gap-2.5">
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
                        <div className="text-[10px] font-medium text-zinc-400">Today&apos;s GMV</div>
                        <div className="mt-0.5 text-sm sm:text-base font-extrabold text-white">₹4,82,500</div>
                        <div className="mt-1 flex items-center gap-1 text-[9px] font-bold text-emerald-400">
                          <TrendingUp className="h-2.5 w-2.5" /> +18.4%
                        </div>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
                        <div className="text-[10px] font-medium text-zinc-400">Wholesale Orders</div>
                        <div className="mt-0.5 text-sm sm:text-base font-extrabold text-white">48 Active</div>
                        <div className="mt-1 text-[9px] font-medium text-violet-300">3 Hubs Syncing</div>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
                        <div className="text-[10px] font-medium text-zinc-400">Tally ERP Bridge</div>
                        <div className="mt-0.5 text-sm sm:text-base font-extrabold text-white">Auto-Post</div>
                        <div className="mt-1 text-[9px] font-bold text-emerald-400">0.4s Latency</div>
                      </div>
                    </div>

                    {/* Live Automated Activity Feed */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400 px-1">
                        <span>Automated Pipeline Events</span>
                        <span className="text-[10px] text-zinc-500">Real-Time Webhooks</span>
                      </div>

                      {/* Event Row 1 */}
                      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] p-2.5 transition-colors hover:bg-white/[0.06]">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#25D366]/15 text-[#25D366]">
                            <MessageCircle className="h-4 w-4" />
                          </div>
                          <div className="text-left">
                            <div className="text-xs font-bold text-white">WhatsApp Order #WA-9042</div>
                            <div className="text-[10px] text-zinc-400">Shree Ganesh Fabrics • 40 Bundles</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-bold text-white">₹1,45,000</div>
                          <span className="inline-block mt-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold text-emerald-400">
                            Invoice Generated
                          </span>
                        </div>
                      </div>

                      {/* Event Row 2 */}
                      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] p-2.5 transition-colors hover:bg-white/[0.06]">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-violet-400">
                            <Database className="h-4 w-4" />
                          </div>
                          <div className="text-left">
                            <div className="text-xs font-bold text-white">Tally Prime Direct Bridge</div>
                            <div className="text-[10px] text-zinc-400">Daybook Voucher #VB-108 Synced</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-bold text-white">₹88,250</div>
                          <span className="inline-block mt-0.5 rounded-full border border-violet-500/30 bg-violet-500/15 px-2 py-0.5 text-[9px] font-bold text-violet-300">
                            Ledger Reconciled
                          </span>
                        </div>
                      </div>

                      {/* Event Row 3 */}
                      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] p-2.5 transition-colors hover:bg-white/[0.06]">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
                            <Truck className="h-4 w-4" />
                          </div>
                          <div className="text-left">
                            <div className="text-xs font-bold text-white">E-Way Bill &amp; Dispatch</div>
                            <div className="text-[10px] text-zinc-400">Godown Central • Truck #MH-12-8921</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-bold text-white">₹2,90,000</div>
                          <span className="inline-block mt-0.5 rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[9px] font-bold text-amber-300">
                            Dispatched
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating Architectural Assurance Pill */}
                <div className="absolute -bottom-4 -left-4 hidden sm:flex items-center gap-2.5 rounded-xl border border-white/20 bg-slate-900/95 px-3.5 py-2 text-xs font-semibold text-white shadow-2xl backdrop-blur-md">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>100% Dedicated Codebase • Zero Vendor Lock-in</span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <DialogContent className="max-h-[90vh] w-[calc(100%-1.5rem)] max-w-2xl overflow-y-auto rounded-2xl border border-border bg-background p-0 text-foreground shadow-2xl">
        {status === "sent" ? (
          <div className="flex min-h-[28rem] flex-col items-center justify-center px-6 py-12 text-center sm:px-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              <Check aria-hidden="true" className="h-7 w-7" />
            </div>
            <DialogHeader className="mt-5 items-center text-center">
              <DialogTitle className="text-3xl font-bold text-foreground">
                We&apos;ve got your idea.
              </DialogTitle>
              <DialogDescription className="max-w-md pt-2 text-sm leading-6 text-muted-foreground">
                We&apos;ll call {form.contact_phone} within two working days to
                understand the project and discuss the next step.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-6 rounded-xl border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
              Reference: <span className="font-mono font-bold text-foreground">{reference}</span>
            </div>
          </div>
        ) : (
          <>
            <div className="border-b border-border px-5 py-5 pr-12 sm:px-7 sm:py-6">
              <DialogHeader>
                <p className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">Custom software</p>
                <DialogTitle className="text-2xl font-bold text-foreground sm:text-3xl">
                  Tell us what you want to build
                </DialogTitle>
                <DialogDescription className="pt-1 text-sm text-muted-foreground">
                  Share the basics. The first architectural consultation is 100% free.
                </DialogDescription>
              </DialogHeader>
            </div>

            <form onSubmit={handleSubmit} noValidate className="px-5 py-5 sm:px-7 sm:py-6">
              <fieldset>
                <legend className="text-sm font-semibold text-foreground">
                  Project type
                </legend>
                <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {SERVICE_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    const selected = form.build_type === option.value;

                    return (
                      <label
                        key={option.value}
                        className={`cursor-pointer rounded-xl border px-2.5 py-3 text-center transition-all ${
                          selected
                            ? "border-violet-500 bg-violet-500/10 ring-1 ring-violet-500 text-violet-700 dark:text-violet-300 font-bold"
                            : "border-border bg-background text-foreground hover:border-foreground/30 hover:bg-muted/40"
                        }`}
                      >
                        <input
                          type="radio"
                          name="build_type"
                          value={option.value}
                          checked={selected}
                          onChange={set("build_type")}
                          className="sr-only"
                        />
                        <Icon
                          aria-hidden="true"
                          className={`mx-auto h-4 w-4 ${
                            selected
                              ? "text-violet-600 dark:text-violet-400"
                              : "text-muted-foreground"
                          }`}
                        />
                        <span className="mt-1.5 block text-[11px] font-semibold leading-4">
                          {option.title}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label htmlFor={`${uid}-name`} className="text-sm font-semibold text-foreground">
                  Your name *
                  <input
                    id={`${uid}-name`}
                    name="contact_name"
                    value={form.contact_name}
                    onChange={set("contact_name")}
                    autoComplete="name"
                    maxLength={120}
                    className={INPUT_CLASS}
                    placeholder="Your name"
                  />
                </label>

                <label htmlFor={`${uid}-business`} className="text-sm font-semibold text-foreground">
                  Business name *
                  <input
                    id={`${uid}-business`}
                    name="business_name"
                    value={form.business_name}
                    onChange={set("business_name")}
                    autoComplete="organization"
                    maxLength={120}
                    className={INPUT_CLASS}
                    placeholder="Company or project"
                  />
                </label>
              </div>

              <label htmlFor={`${uid}-phone`} className="mt-4 block text-sm font-semibold text-foreground">
                Phone or WhatsApp *
                <input
                  id={`${uid}-phone`}
                  name="contact_phone"
                  value={form.contact_phone}
                  onChange={set("contact_phone")}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  maxLength={24}
                  className={INPUT_CLASS}
                  placeholder="+91 98765 43210"
                />
              </label>

              <label htmlFor={`${uid}-description`} className="mt-4 block text-sm font-semibold text-foreground">
                Your idea or requirements *
                <textarea
                  id={`${uid}-description`}
                  name="description"
                  value={form.description}
                  onChange={set("description")}
                  rows={3}
                  maxLength={4000}
                  className={`${INPUT_CLASS} resize-y leading-6`}
                  placeholder="What should the software do, and what systems does your business currently run on?"
                />
              </label>

              <div className="absolute left-[-9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
                <label htmlFor={`${uid}-website`}>Website</label>
                <input
                  id={`${uid}-website`}
                  name="company_website"
                  value={honeypot}
                  onChange={(event) => setHoneypot(event.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>

              {error && (
                <p
                  role="alert"
                  className="mt-4 rounded-xl bg-destructive/10 border border-destructive/20 px-3.5 py-2.5 text-sm font-medium text-destructive"
                >
                  {error}
                </p>
              )}

              <div className="mt-6 flex flex-col-reverse items-center gap-3 sm:flex-row sm:justify-between border-t border-border pt-5">
                <p className="text-center text-[11px] leading-4 text-muted-foreground sm:max-w-[15rem] sm:text-left">
                  Zero obligation. We provide full scope and timeline before any agreement.
                </p>
                <Button
                  type="submit"
                  size="lg"
                  disabled={status === "sending"}
                  className="h-11 w-full rounded-xl px-6 text-sm font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md shadow-violet-500/20 sm:w-auto"
                >
                  {status === "sending" ? (
                    <>
                      <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />
                      Submitting
                    </>
                  ) : (
                    <>
                      Request architecture call
                      <ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" />
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
