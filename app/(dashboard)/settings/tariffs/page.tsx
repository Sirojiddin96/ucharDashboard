import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import TariffList from "./TariffList";

export const dynamic = "force-dynamic";

export default async function TariffsPage() {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");

  const { data } = await supabase
    .from("tariffs")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">Tariffs</h2>
        <p className="text-gray-400 text-sm mt-1">
          Standalone pricing rules. Assign them to regions via the Region → Mappings tab. Editing a tariff syncs to all regions using it.
        </p>
      </div>
      <TariffList initialTariffs={data ?? []} />
    </div>
  );
}
