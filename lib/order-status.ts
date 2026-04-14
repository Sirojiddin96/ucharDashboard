// SCAT status codes used in current_status / final_status
export const SCAT_STATUS: Record<
  number,
  { label: string; color: string; group: "active" | "terminal" }
> = {
  1: { label: "Searching", color: "bg-blue-900 text-blue-300", group: "active" },
  2: { label: "Offer Sent", color: "bg-indigo-900 text-indigo-300", group: "active" },
  3: { label: "Driver Assigned", color: "bg-violet-900 text-violet-300", group: "active" },
  4: { label: "En Route", color: "bg-amber-900 text-amber-300", group: "active" },
  5: { label: "Arrived", color: "bg-yellow-900 text-yellow-300", group: "active" },
  6: { label: "In Progress", color: "bg-cyan-900 text-cyan-300", group: "active" },
  7: { label: "Completing", color: "bg-teal-900 text-teal-300", group: "active" },
  8: { label: "Cancelled", color: "bg-red-900 text-red-300", group: "terminal" },
  9: { label: "Disp. Cancelled", color: "bg-rose-900 text-rose-300", group: "terminal" },
  10: { label: "No Driver", color: "bg-orange-900 text-orange-300", group: "terminal" },
  100: { label: "Completed", color: "bg-green-900 text-green-300", group: "terminal" },
};

export function getStatus(code: number | null | undefined) {
  if (code == null) return { label: "Unknown", color: "bg-gray-800 text-gray-400", group: "active" as const };
  return SCAT_STATUS[code] ?? { label: `Status ${code}`, color: "bg-gray-800 text-gray-400", group: "active" as const };
}

export function isActiveOrder(finalStatus: number | null | undefined): boolean {
  return finalStatus == null;
}

export const ACTIVE_STATUS_FILTER = [1, 2, 3, 4, 5, 6, 7];
export const TERMINAL_STATUSES = [8, 9, 10, 100];

export const CHANNEL_LABELS: Record<string, string> = {
  bot: "Bot",
  app: "App",
  call: "Call",
};
