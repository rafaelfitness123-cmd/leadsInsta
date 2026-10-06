import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatFollowers(count: number): string {
  if (count >= 1000000) return (count / 1000000).toFixed(1) + "M";
  if (count >= 1000) return (count / 1000).toFixed(1) + "K";
  return count.toString();
}

export function calculateScore(lead: any): number {
  let score = 0;
  if (lead.instagramHandle) score += 3;
  if (lead.name) score += 1;
  if (lead.followersCount) score += 2;
  if (lead.city) score += 2;
  if (lead.bio) score += 2;
  return score;
}
