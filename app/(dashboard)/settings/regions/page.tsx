import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import RegionList from "./RegionList";

export const dynamic = "force-dynamic";

export default async function RegionsPage() {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");

  const { data: regions } = await supabase
    .from("regions")
    .select("id, name, slug, currency, timezone, is_active, sort_order, center_lat, center_lon")
    .order("sort_order", { ascending: true });

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Settings — Regions</h1>
        <p className="text-gray-400 text-sm mt-1">Manage service regions, their services, tariffs, and addresses.</p>
      </div>
      <RegionList initialRegions={regions ?? []} />
    </div>
  );
}
