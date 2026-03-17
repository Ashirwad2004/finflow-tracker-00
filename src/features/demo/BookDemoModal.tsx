import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Phone,
  User,
  CheckCircle2,
  Loader2,
  Sparkles,
  Shield,
  Clock,
  Star,
} from "lucide-react";
import { useSubmitDemo } from "@/features/demo/hooks/useDemoRequests";
import { validateIndianPhone } from "@/features/demo/lib/demoApi";

interface BookDemoModalProps {
  open: boolean;
  onClose: () => void;
}

type ModalState = "form" | "loading" | "success";

// Floating particle for success animation
const Particle = ({ delay }: { delay: number }) => {
  const angle = Math.random() * 360;
  const distance = 60 + Math.random() * 80;
  const colors = ["#8B5CF6", "#06B6D4", "#10B981", "#F59E0B", "#EF4444"];
  const color = colors[Math.floor(Math.random() * colors.length)];

  return (
    <motion.div
      initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      animate={{
        opacity: 0,
        x: Math.cos((angle * Math.PI) / 180) * distance,
        y: Math.sin((angle * Math.PI) / 180) * distance,
        scale: 0,
      }}
      transition={{ delay, duration: 0.8, ease: "easeOut" }}
      className="absolute w-2 h-2 rounded-full"
      style={{ backgroundColor: color, top: "50%", left: "50%" }}
    />
  );
};

export function BookDemoModal({ open, onClose }: BookDemoModalProps) {
  const [state, setState] = useState<ModalState>("form");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const submitMutation = useSubmitDemo();

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d+\s\-()]/g, "");
    setPhone(raw);
    if (phoneError) setPhoneError(validateIndianPhone(raw));
  };

  const handlePhoneBlur = () => {
    if (phone.trim()) setPhoneError(validateIndianPhone(phone));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const validationError = validateIndianPhone(phone);
    if (validationError) {
      setPhoneError(validationError);
      return;
    }

    setState("loading");

    const result = await submitMutation.mutateAsync({
      phone,
      name: name.trim() || undefined,
    });

    if (result.success) {
      setState("success");
    } else {
      setState("form");
      setServerError(result.error ?? "Something went wrong. Please try again.");
    }
  };

  const handleClose = () => {
    onClose();
    // Reset after animation completes
    setTimeout(() => {
      setState("form");
      setPhone("");
      setName("");
      setPhoneError(null);
      setServerError(null);
    }, 300);
  };

  const perks = [
    { icon: Clock, text: "30-min personalised walkthrough" },
    { icon: Star, text: "See features tailored to your business" },
    { icon: Shield, text: "No commitment, completely free" },
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-0 shadow-2xl">
        <AnimatePresence mode="wait">
          {state === "success" ? (
            /* ---- SUCCESS STATE ---- */
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="relative flex flex-col items-center justify-center py-16 px-8 text-center bg-gradient-to-br from-primary/5 via-background to-violet-500/5"
            >
              {/* Confetti particles */}
              {Array.from({ length: 16 }).map((_, i) => (
                <Particle key={i} delay={i * 0.04} />
              ))}

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                className="relative w-24 h-24 mb-6"
              >
                <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping" />
                <div className="relative w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center shadow-xl shadow-green-500/30">
                  <CheckCircle2 className="w-12 h-12 text-white" />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h2 className="text-2xl font-bold mb-2">You're on the list! 🎉</h2>
                <p className="text-muted-foreground mb-6 max-w-xs mx-auto">
                  We'll call you within <strong>24 hours</strong> to schedule your personalised demo.
                </p>
                <Button onClick={handleClose} className="rounded-full px-8">
                  Done
                </Button>
              </motion.div>
            </motion.div>
          ) : (
            /* ---- FORM STATE ---- */
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              {/* Top gradient stripe */}
              <div className="h-1.5 w-full bg-gradient-to-r from-primary via-violet-500 to-blue-500" />

              <div className="p-8">
                <DialogHeader className="mb-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-violet-500 flex items-center justify-center shadow-lg shadow-primary/20">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-xs font-semibold uppercase tracking-widest text-primary">
                      Free Demo
                    </div>
                  </div>
                  <DialogTitle className="text-2xl font-bold text-left">
                    See FinFlow in action
                  </DialogTitle>
                  <DialogDescription className="text-left text-base text-muted-foreground mt-1">
                    Book a personal demo and discover how FinFlow can transform your business finances.
                  </DialogDescription>
                </DialogHeader>

                {/* Perks */}
                <div className="space-y-2 mb-6 p-4 rounded-2xl bg-muted/40 border border-border/50">
                  {perks.map((perk, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <perk.icon className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <span className="text-foreground">{perk.text}</span>
                    </div>
                  ))}
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Name field (optional) */}
                  <div className="space-y-1.5">
                    <Label htmlFor="demo-name" className="text-sm font-medium">
                      Your Name <span className="text-muted-foreground font-normal">(optional)</span>
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="demo-name"
                        type="text"
                        placeholder="e.g. Rahul Sharma"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="pl-10 h-12 rounded-xl"
                        disabled={state === "loading"}
                      />
                    </div>
                  </div>

                  {/* Phone field (required) */}
                  <div className="space-y-1.5">
                    <Label htmlFor="demo-phone" className="text-sm font-medium">
                      Mobile Number <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        <span className="text-sm font-semibold text-muted-foreground">🇮🇳</span>
                        <span className="text-sm text-muted-foreground">+91</span>
                        <span className="text-border">|</span>
                      </div>
                      <Input
                        id="demo-phone"
                        type="tel"
                        placeholder="98765 43210"
                        value={phone}
                        onChange={handlePhoneChange}
                        onBlur={handlePhoneBlur}
                        className={`pl-20 h-12 rounded-xl font-mono tracking-wider ${
                          phoneError ? "border-destructive focus-visible:ring-destructive/30" : ""
                        }`}
                        maxLength={15}
                        disabled={state === "loading"}
                        required
                      />
                    </div>
                    <AnimatePresence>
                      {phoneError && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="text-xs text-destructive flex items-center gap-1.5 overflow-hidden"
                        >
                          <Phone className="w-3 h-3 flex-shrink-0" />
                          {phoneError}
                        </motion.p>
                      )}
                      {serverError && !phoneError && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="text-xs text-destructive flex items-center gap-1.5 overflow-hidden"
                        >
                          <Clock className="w-3 h-3 flex-shrink-0" />
                          {serverError}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  <Button
                    type="submit"
                    disabled={state === "loading" || !phone.trim()}
                    className="w-full h-12 rounded-xl text-base font-semibold bg-gradient-to-r from-primary to-violet-600 border-0 shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:opacity-95 transition-all hover:scale-[1.02]"
                  >
                    {state === "loading" ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>Book My Free Demo</>
                    )}
                  </Button>

                  <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    We'll never share your number. No spam, ever.
                  </p>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
