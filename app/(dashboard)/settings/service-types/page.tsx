import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ServiceTypeList, { type ServiceType } from "./ServiceTypeList";

export const dynamic = "force-dynamic";

export default async function ServiceTypesPage() {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");

  const { data } = await supabase
    .from("service_types")
    .select("*")
    .order("sort_order", { ascending: true });

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">Service Types</h2>
        <p className="text-gray-400 text-sm mt-1">
          Global service catalog. Edit here and changes sync instantly to every region that uses this service type.
        </p>
      </div>
      <ServiceTypeList initialServiceTypes={(data ?? []) as ServiceType[]} />
    </div>
  );
}
