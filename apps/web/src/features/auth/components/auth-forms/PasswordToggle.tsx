import React from "react";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";

interface PasswordToggleProps {
  visible: boolean;
  onToggle: () => void;
}

export const PasswordToggle: React.FC<PasswordToggleProps> = ({ visible, onToggle }) => (
  <Button
    type="button"
    variant="ghost"
    size="icon"
    className="absolute right-1 top-1 h-8 w-8 hover:bg-transparent"
    onClick={onToggle}
    aria-label={visible ? "Hide password" : "Show password"}
  >
    {visible ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
  </Button>
);
