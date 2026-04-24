import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import Link from "next/link";
import ReviewActions from "./ReviewActions";

export const dynamic = "force-dynamic";

type Application = {
  id: string;
  created_at: string;
  status: "pending" | "approved" | "rejected";
  user_id: string | null;
  city: string;
  service: string;
  profile: string;
  call_sign: string;
  connection_type: "terminal" | "radio";
  car_brand_client: string;
  car_color_client: string;
  car_brand_dispatcher: string;
  car_color_dispatcher: string;
  car_reg_number: string;
  last_name: string;
  first_name: string;
  middle_name: string;
  phone: string | null;
  driver_license: string;
  photo_url: string | null;
};

const STATUS_BADGE_CLASSES: Record<string, string> = {
  pending: "bg-yellow-900 text-yellow-300",
  approved: "bg-green-900 text-green-300",
  rejected: "bg-red-900 text-red-300",
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_BADGE_CLASSES[status] ?? "bg-gray-800 text-gray-400";
  return (
    <span className={`text-sm px-3 py-1 rounded-full font-medium ${cls}`}>
      {status}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm text-gray-200">{value || "—"}</span>
    </div>
  );
}

async function getApplication(id: string): Promise<Application | null> {
  const { data } = await supabase
     
    .from("driver_applications" as never)
    .select("*")
    .eq("id", id)
    .single();
  return data as Application | null;
}

export default async function DriverApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const app = await getApplication(id);

  if (!app) notFound();

  const fullName = [app.last_name, app.first_name, app.middle_name]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/driver-applications"
          className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
        >
          ← Back
        </Link>
        <div className="flex-1 flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-bold text-white">{fullName}</h1>
          <StatusBadge status={app.status} />
          {app.status === "approved" && app.user_id && (
            <Link
              href={`/drivers/${app.user_id}`}
              className="text-xs px-3 py-1 bg-indigo-900/40 hover:bg-indigo-900/60 text-indigo-400 border border-indigo-700/40 rounded-full transition-colors"
            >
              🚖 View Driver Profile →
            </Link>
          )}
        </div>
        <span className="text-xs text-gray-500 whitespace-nowrap">
          {new Date(app.created_at).toLocaleString("ru-RU", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Personal info */}
        <section className="md:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Personal Info
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <InfoRow label="Last name" value={app.last_name} />
            <InfoRow label="First name" value={app.first_name} />
            <InfoRow label="Middle name" value={app.middle_name} />
            <InfoRow label="Phone" value={app.phone ?? "—"} />
            <InfoRow label="Driver license" value={app.driver_license} />
          </div>
        </section>

        {/* Photo */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col gap-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Photo
          </h2>
          {app.photo_url ? (
            <a href={app.photo_url} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={app.photo_url}
                alt="Driver photo"
                className="w-full aspect-3/4 object-cover rounded-lg border border-gray-700"
              />
            </a>
          ) : (
            <div className="flex-1 flex items-center justify-center rounded-lg border border-gray-800 text-gray-600 text-sm min-h-32">
              No photo
            </div>
          )}
        </section>

        {/* Application info */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Application
          </h2>
          <div className="space-y-4">
            <InfoRow label="City" value={app.city} />
            <InfoRow label="Service" value={app.service} />
            <InfoRow label="Profile" value={app.profile} />
            <InfoRow label="Call sign" value={app.call_sign} />
            <InfoRow label="Connection type" value={app.connection_type} />
          </div>
        </section>

        {/* Car info */}
        <section className="md:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Vehicle
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <InfoRow label="Car brand (client)" value={app.car_brand_client} />
            <InfoRow label="Car color (client)" value={app.car_color_client} />
            <InfoRow
              label="Car brand (dispatcher)"
              value={app.car_brand_dispatcher}
            />
            <InfoRow
              label="Car color (dispatcher)"
              value={app.car_color_dispatcher}
            />
            <InfoRow label="Registration number" value={app.car_reg_number} />
          </div>
        </section>
      </div>

      {/* Review actions */}
      <ReviewActions id={app.id} status={app.status} />
    </div>
  );
}
