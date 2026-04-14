import { supabase } from "@/lib/supabase";
import Link from "next/link";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type ApplicationRow = {
  id: string;
  created_at: string;
  status: "pending" | "approved" | "rejected";
  first_name: string;
  last_name: string;
  middle_name: string;
  phone: string | null;
  city: string;
  service: string;
  profile: string;
  call_sign: string;
  connection_type: "terminal" | "radio";
  car_brand_client: string;
  car_color_client: string;
  car_reg_number: string;
};

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const STATUS_BADGE_CLASSES: Record<string, string> = {
  pending: "bg-yellow-900 text-yellow-300",
  approved: "bg-green-900 text-green-300",
  rejected: "bg-red-900 text-red-300",
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_BADGE_CLASSES[status] ?? "bg-gray-800 text-gray-400";
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>
      {status}
    </span>
  );
}

async function getApplications(page: number, status: string) {
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("driver_applications")
    .select(
      "id, created_at, status, first_name, last_name, middle_name, phone, city, service, profile, call_sign, connection_type, car_brand_client, car_color_client, car_reg_number",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (status) query = query.eq("status", status);

  const { data, count } = await query;
  return { applications: (data ?? []) as ApplicationRow[], total: count ?? 0 };
}

export default async function DriverApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const status = params.status ?? "";

  const { applications, total } = await getApplications(page, status);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  function pageUrl(p: number) {
    const sp = new URLSearchParams();
    if (status) sp.set("status", status);
    sp.set("page", String(p));
    return `/driver-applications?${sp}`;
  }

  function statusUrl(s: string) {
    const sp = new URLSearchParams();
    if (s) sp.set("status", s);
    sp.set("page", "1");
    return `/driver-applications?${sp}`;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Driver Applications</h1>
        <span className="text-sm text-gray-400">{total} total</span>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_OPTIONS.map((opt) => (
          <a
            key={opt.value}
            href={statusUrl(opt.value)}
            className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
              status === opt.value
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
                <th className="px-4 py-3 font-medium">Applicant</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">City</th>
                <th className="px-4 py-3 font-medium">Service / Profile</th>
                <th className="px-4 py-3 font-medium">Connection</th>
                <th className="px-4 py-3 font-medium">Car (client)</th>
                <th className="px-4 py-3 font-medium">Reg №</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((a) => (
                <tr
                  key={a.id}
                  className="border-b border-gray-800/50 hover:bg-gray-800/30"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/driver-applications/${a.id}`}
                      className="text-indigo-400 hover:text-indigo-300 font-medium"
                    >
                      {[a.last_name, a.first_name, a.middle_name]
                        .filter(Boolean)
                        .join(" ")}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{a.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-300">{a.city}</td>
                  <td className="px-4 py-3 text-gray-400">
                    <span>{a.service}</span>
                    <span className="text-gray-600 mx-1">/</span>
                    <span>{a.profile}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{a.connection_type}</td>
                  <td className="px-4 py-3 text-gray-400">
                    {a.car_brand_client}, {a.car_color_client}
                  </td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                    {a.car_reg_number}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {new Date(a.created_at).toLocaleString("ru-RU", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
              {applications.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-12 text-center text-gray-500"
                  >
                    No applications found
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
