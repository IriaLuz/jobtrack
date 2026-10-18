import type { ComponentProps } from "react";

type ButtonVariant = "primary" | "secondary" | "danger";
type ButtonSize = "medium" | "small";

const VARIANT_CLASS_NAMES: Record<ButtonVariant, string> = {
  primary: "bg-(--accent) text-(--bg) hover:opacity-90",
  secondary: "border border-(--border) text-(--text-h) hover:bg-(--accent-bg)",
  danger: "border border-(--danger) text-(--danger) hover:bg-(--danger)/10",
};

const SIZE_CLASS_NAMES: Record<ButtonSize, string> = {
  medium: "px-4 py-2 text-sm",
  small: "px-2.5 py-1 text-xs",
};

interface ButtonProps extends ComponentProps<"button"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/** Defaults to type="button" so a button inside a form never submits it by accident. */
export const Button = ({
  variant = "primary",
  size = "medium",
  type = "button",
  className = "",
  ...props
}: ButtonProps) => (
  <button
    type={type}
    className={`inline-flex items-center justify-center rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${VARIANT_CLASS_NAMES[variant]} ${SIZE_CLASS_NAMES[size]} ${className}`}
    {...props}
  />
);
