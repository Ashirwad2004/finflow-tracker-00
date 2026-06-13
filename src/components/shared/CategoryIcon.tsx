import * as LucideIcons from "lucide-react";

interface CategoryIconProps {
  name?: string | null;
  className?: string;
  color?: string;
}

export const CategoryIcon = ({ name, className, color }: CategoryIconProps) => {
  if (!name) return <LucideIcons.Circle className={className} style={{ color }} />;

  // Normalize name to PascalCase to match Lucide export names
  // e.g. "shopping-bag" -> "ShoppingBag", "pizza" -> "Pizza"
  const iconKey = name
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Icon = (LucideIcons as any)[iconKey];

  if (Icon) {
    return <Icon className={className} style={{ color }} />;
  }

  // Fallback to Circle if the icon doesn't exist in the current Lucide version
  return <LucideIcons.Circle className={className} style={{ color }} />;
};
