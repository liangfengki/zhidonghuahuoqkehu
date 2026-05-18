import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  const classes: string[] = [];
  for (const input of inputs) {
    if (typeof input === "string") classes.push(input);
    else if (Array.isArray(input)) classes.push(cn(...input));
    else if (input && typeof input === "object") {
      for (const [key, value] of Object.entries(input)) {
        if (value) classes.push(key);
      }
    }
  }
  return classes.join(" ");
}
