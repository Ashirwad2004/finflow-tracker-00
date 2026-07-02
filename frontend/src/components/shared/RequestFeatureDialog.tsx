import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Lightbulb, Loader2 } from "lucide-react";
import { toast } from "@/core/hooks/use-toast";
import { submitFeatureRequest } from "@/features/demo/lib/featureRequestsApi";
import { cn } from "@/core/lib/utils";

interface RequestFeatureDialogProps {
  collapsed?: boolean;
}

export function RequestFeatureDialog({ collapsed = false }: RequestFeatureDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill out all fields.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    const result = await submitFeatureRequest({
      title: title.trim(),
      description: description.trim(),
    });

    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: "Success!",
        description: "Your feature request has been submitted successfully.",
      });
      setTitle("");
      setDescription("");
      setIsOpen(false);
    } else {
      toast({
        title: "Submission Failed",
        description: result.error || "Please try again later.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3 text-muted-foreground hover:text-foreground hover:bg-accent/50",
            collapsed && "justify-center px-0"
          )}
        >
          <Lightbulb className="w-5 h-5 flex-shrink-0 text-amber-500" />
          {!collapsed && <span>Request a Feature</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" /> Request a Feature
          </DialogTitle>
          <DialogDescription>
            Have an idea to make FinFlow even better? Tell us what you need, and we'll look into it!
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="feature-title">Feature Title</Label>
            <Input
              id="feature-title"
              placeholder="e.g. Dark mode automatic schedule"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="feature-desc">Description</Label>
            <Textarea
              id="feature-desc"
              placeholder="Describe what this feature does, how it should work, and why it's useful to you..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              disabled={isSubmitting}
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-gradient-primary text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Request"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
