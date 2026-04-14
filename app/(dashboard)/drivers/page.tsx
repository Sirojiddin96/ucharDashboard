import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import DriverMapWrapper from "./DriverMapWrapper";
import DriverList from "./DriverList";

export const dynamic = "force-dynamic";

export default async function DriversPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");

  const { tab = "map" } = await searchParams;
  const isMap = tab !== "list";

  return (
    <div className={`p-6 flex flex-col ${isMap ? "h-full" : ""}`}>
      {/* Header + tabs */}
      <div className="mb-5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{isMap ? "🗺️" : "🚖"}</span>
          <div>
            <h1 className="text-2xl font-bold text-white">Drivers</h1>
            <p className="text-gray-400 text-sm">
              {isMap ? "Live GPS positions — updates in real time" : "All registered drivers"}
            </p>
          </div>
        </div>
        <div className="flex gap-1 p-1 bg-gray-800 rounded-lg">
          {[
            { value: "map", label: "🗺️ Map" },
            { value: "list", label: "📋 List" },
          ].map((t) => (
            <a
              key={t.value}
              href={`/drivers?tab=${t.value}`}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === t.value
                  ? "bg-indigo-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {t.label}
            </a>
          ))}
        </div>
      </div>

      {isMap ? (
        <div className="flex-1 min-h-0">
          <DriverMapWrapper />
        </div>
      ) : (
        <DriverList />
      )}
    </div>
  );
}
