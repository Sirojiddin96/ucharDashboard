import { supabase } from "@/lib/supabase";
import { unstable_cache } from "next/cache";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type FeedbackRow = {
  id: number;
  order_id: string | null;
  telegram_user_id: number | null;
  driver_id: string | null;
  driver_name: string | null;
  car_number: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
};

const RATING_OPTIONS = [
  { value: "", label: "All ratings" },
  { value: "5", label: "⭐⭐⭐⭐⭐  5" },
  { value: "4", label: "⭐⭐⭐⭐  4" },
  { value: "3", label: "⭐⭐⭐  3" },
  { value: "2", label: "⭐⭐  2" },
  { value: "1", label: "⭐  1" },
];

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-base leading-none whitespace-nowrap">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < rating ? "text-yellow-400" : "text-gray-700"}>
          ★
        </span>
      ))}
    </span>
  );
}

async function getFeedback(page: number, rating: string) {
  const cached = unstable_cache(
    async () => {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("app_ride_feedbacks" as never)
        .select(
          "id, order_id, telegram_user_id, driver_id, driver_name, car_number, rating, comment, created_at",
          { count: "exact" }
        )
        .order("created_at", { ascending: false })
        .range(from, to);

      if (rating) query = query.eq("rating", Number(rating));

      const { data, count } = await query;
      return { rows: data ?? [], total: count ?? 0 };
    },
    ["feedback-list-v1", String(page), rating || "all"],
    { revalidate: 30, tags: ["feedback"] }
  );

  return cached();
}

async function getAverageRating() {
  const cached = unstable_cache(async () => {
    const { data } = await supabase
      .from("app_ride_feedbacks" as never)
      .select("rating");
    if (!data || data.length === 0) return null;
    const avg = data.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / data.length;
    return avg.toFixed(2);
  }, ["feedback-avg-v1"], { revalidate: 60, tags: ["feedback"] });

  return cached();
}

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; rating?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const rating = params.rating ?? "";

  const [{ rows, total }, avgRating] = await Promise.all([
    getFeedback(page, rating),
    getAverageRating(),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  function pageUrl(p: number) {
    const sp = new URLSearchParams();
    if (rating) sp.set("rating", rating);
    sp.set("page", String(p));
    return `/feedback?${sp}`;
  }

  function ratingUrl(r: string) {
    const sp = new URLSearchParams();
    if (r) sp.set("rating", r);
    sp.set("page", "1");
    return `/feedback?${sp}`;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Feedback</h1>
        <div className="flex items-center gap-4">
          {avgRating && (
            <span className="text-sm text-yellow-400 font-medium">
              Avg ★ {avgRating}
            </span>
          )}
          <span className="text-sm text-gray-400">{total} total</span>
        </div>
      </div>

      {/* Rating filter */}
      <div className="flex gap-2 flex-wrap">
        {RATING_OPTIONS.map((opt) => (
          <a
            key={opt.value}
            href={ratingUrl(opt.value)}
            className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
              rating === opt.value
                ? "bg-indigo-600 border-indigo-500 text-white"
                : "border-gray-700 text-gray-400 hover:text-white hover:border-gray-600"
            }`}
          >
            {opt.label}
          </a>
        ))}
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-800">
              <tr className="text-gray-500 text-left">
                <th className="px-4 py-3 font-medium">Rating</th>
                <th className="px-4 py-3 font-medium">Driver</th>
                <th className="px-4 py-3 font-medium">Car</th>
                <th className="px-4 py-3 font-medium">Comment</th>
                <th className="px-4 py-3 font-medium">User ID</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-600">
                    No feedback found
                  </td>
                </tr>
              ) : (
                rows.map((row: FeedbackRow) => (
                  <tr
                    key={row.id}
                    className="border-b border-gray-800/50 hover:bg-gray-800/30"
                  >
                    <td className="px-4 py-3">
                      <Stars rating={row.rating} />
                    </td>
                    <td className="px-4 py-3 text-gray-200">
                      {row.driver_name ?? "—"}
                      {row.driver_id && (
                        <span className="ml-1 text-xs text-gray-500">
                          #{row.driver_id}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {row.car_number ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-300 max-w-xs truncate">
                      {row.comment ? (
                        <span title={row.comment}>{row.comment}</span>
                      ) : (
                        <span className="text-gray-600 italic">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs font-mono">
                      {row.telegram_user_id}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {new Date(row.created_at).toLocaleDateString("ru-RU", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
                      })}{" "}
                      {new Date(row.created_at).toLocaleTimeString("ru-RU", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <a
                href={pageUrl(page - 1)}
                className="px-3 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600"
              >
                ← Prev
              </a>
            )}
            {page < totalPages && (
              <a
                href={pageUrl(page + 1)}
                className="px-3 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600"
              >
                Next →
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
