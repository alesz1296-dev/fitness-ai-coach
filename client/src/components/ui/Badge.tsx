import React from "react";

type Color   = "green" | "blue" | "orange" | "red" | "gray" | "purple";
type Variant = "success" | "info" | "warning" | "danger" | "default";

interface BadgeProps {
  children: React.ReactNode;
  color?:   Color;
  variant?: Variant;
  className?: string;
}

const colorMap: Record<Color, string> = {
  green:  "bg-green-100 text-green-700",
  blue:   "bg-blue-100 text-blue-700",
  orange: "bg-orange-100 text-orange-700",
  red:    "bg-red-100 text-red-700",
  gray:   "bg-gray-100 text-gray-600",
  purple: "bg-purple-100 text-purple-700",
};

const variantMap: Record<Variant, string> = {
  success: "bg-green-100 text-green-700",
  info:    "bg-blue-100 text-blue-700",
  warning: "bg-orange-100 text-orange-700",
  danger:  "bg-red-100 text-red-700",
  default: "bg-gray-100 text-gray-600",
};

export function Badge({ children, color, variant, className = "" }: BadgeProps) {
  const cls = variant
    ? variantMap[variant]
    : colorMap[color ?? "gray"];

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls} ${className}`}>
      {children}
    </span>
  );
}
