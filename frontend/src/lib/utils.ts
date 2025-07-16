import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}