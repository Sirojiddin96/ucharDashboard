import { supabase } from "@/lib/supabase";

const PAGE_SIZE = 50;

type UserRow = {
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  created_at: string;
};

async function getUsers(page: number) {
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, count } = await supabase
    .from("bot_users")
    .select("telegram_id, username, first_name, last_name, phone, created_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(from, to);

  // Fetch order counts per user in one query
  const ids = (data ?? []).map((u: UserRow) => u.telegram_id);
  const { data: orderCounts } = ids.length
    ? await supabase
        .from("orders")
        .select("telegram_user_id")
        .in("telegram_user_id", ids)
    : { data: [] };

  const countMap: Record<string, number> = {};
  for (const o of orderCounts ?? []) {
    countMap[o.telegram_user_id] = (countMap[o.telegram_user_id] ?? 0) + 1;
  }

  return { users: data ?? [], total: count ?? 0, countMap };
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const { users, total, countMap } = await getUsers(page);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  function pageUrl(p: number) {
    return `/users?page=${p}`;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Users</h1>
        <span className="text-sm text-gray-400">{total} total</span>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-800">
              <tr className="text-gray-500 text-left">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Username</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Orders</th>
                <th className="px-4 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u: UserRow) => (
                <tr
                  key={u.telegram_id}
                  className="border-b border-gray-800/50 hover:bg-gray-800/30"
                >
                  <td className="px-4 py-3 text-gray-200">
                    {[u.first_name, u.last_name].filter(Boolean).join(" ") ||
                      "—"}
                  </td>
                  <td className="px-4 py-3 text-indigo-400">
                    {u.username ? `@${u.username}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {u.phone ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {countMap[u.telegram_id] ?? 0}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {new Date(u.created_at).toLocaleDateString("ru-RU", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-gray-500"
                  >
                    No users yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
            <span className="text-xs text-gray-500">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <a
                  href={pageUrl(page - 1)}
                  className="text-xs px-3 py-1.5 rounded bg-gray-800 text-gray-300 hover:bg-gray-700"
                >
                  ← Prev
                </a>
              )}
              {page < totalPages && (
                <a
                  href={pageUrl(page + 1)}
                  className="text-xs px-3 py-1.5 rounded bg-gray-800 text-gray-300 hover:bg-gray-700"
                >
                  Next →
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
