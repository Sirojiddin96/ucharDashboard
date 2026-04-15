import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import MappingsTab from "./MappingsTab";
import AddressesTab from "./AddressesTab";
import DriversTab from "./DriversTab";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "mappings",  label: "Mappings" },
  { key: "addresses", label: "Addresses" },
  { key: "drivers", label: "Drivers" },
];

export default async function RegionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");

  const { id } = await params;
  const { tab = "mappings" } = await searchParams;

  const { data: region } = await supabase
    .from("regions")
    .select("id, name, slug, currency, is_active")
    .eq("id", id)
    .single();

  if (!region) redirect("/settings/regions");

  // Mappings tab data
  const { data: mappingsRaw } = await supabase
    .from("region_service_tariffs")
    .select("*, service_types(id, name, name_uz, service_class, max_passengers, is_active), tariffs(id, name, per_km, base_fare, currency), tariff_tiers(id, rst_id, from_km, to_km, pricing_type, rate, sort_order)")
    .eq("region_id", id)
    .order("sort_order", { ascending: true });
  const mappings = (mappingsRaw ?? []) as any[];

  // All service types + tariffs needed for mapping modal dropdowns
  const [{ data: allServiceTypes }, { data: allTariffs }] = await Promise.all([
    supabase.from("service_types").select("*").order("sort_order", { ascending: true }),
    supabase.from("tariffs").select("*").order("created_at", { ascending: false }),
  ]);

  // Addresses tab data
  const { data: addressesRaw } = await supabase
    .from("default_addresses")
    .select("*")
    .eq("region_id", id)
    .order("sort_order", { ascending: true });
  const addresses = (addressesRaw ?? []) as any[];

  // Drivers tab data
  const { data: drivers } = await (supabase as any)
    .from("users")
    .select("id, full_name, phone, service_class, is_active")
    .eq("role", "driver")
    .eq("region_id", id)
    .order("full_name", { ascending: true });

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <Link href="/settings/regions" className="text-indigo-400 text-sm hover:underline">← Regions</Link>
        <div className="flex items-center gap-3 mt-2">
          <h1 className="text-2xl font-bold text-white">{region.name}</h1>
          <span className={`px-2 py-0.5 rounded-full text-xs ${region.is_active ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"}`}>
            {region.is_active ? "Active" : "Inactive"}
          </span>
          <span className="text-gray-500 text-sm font-mono">{region.slug}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-700">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/settings/regions/${id}?tab=${t.key}`}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "mappings"  && <MappingsTab regionId={id} initialMappings={mappings} allServiceTypes={allServiceTypes ?? []} allTariffs={allTariffs ?? []} />}
      {tab === "addresses" && <AddressesTab regionId={id} initialAddresses={addresses} />}
      {tab === "drivers"   && <DriversTab regionId={id} initialDrivers={drivers ?? []} />}
    </div>
  );
}
