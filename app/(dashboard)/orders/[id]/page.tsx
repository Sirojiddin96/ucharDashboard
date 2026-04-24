import { notFound } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getStatus, CHANNEL_LABELS } from "@/lib/order-status";
import OrderTimeline from "./OrderTimeline";
import AssignmentHistory from "./AssignmentHistory";
import DriverOffers from "./DriverOffers";
import ManualAssign from "./ManualAssign";

export const dynamic = "force-dynamic";

async function getOrder(id: string) {
  const [{ data: order }, { data: logs }, { data: assignments }, { data: offers }] =
    await Promise.all([
      supabase
        .from("orders")
        .select(
          "id, scat_uuid, phone, channel, address, latitude, longitude, dest_latitude, dest_longitude, gps_accuracy, current_status, final_status, driver_id, driver_name, car_brand, car_model, car_color, car_number, amount, distance_m, driver_reassignment_count, region_id, service_id, user_id, telegram_user_id, created_at, driver_assigned_at, billing_started_at, completed_at, cancelled_at, polling_stopped_at, updated_at"
        )
        .eq("id", id)
        .single(),
      supabase
        .from("order_status_logs")
        .select(
          "id, status_code, status_message, driver_id, remaining_time, amount, created_at, scat_uuid"
        )
        .eq("order_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("order_driver_assignments")
        .select(
          "id, driver_name, driver_id, car_brand, car_model, car_color, car_number, remaining_time, scat_uuid, assigned_at"
        )
        .eq("order_id", id)
        .order("assigned_at", { ascending: false }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from("driver_offers")
        .select(
          "id, driver_id, status, attempt_number, distance_m, estimated_fare, pickup_address, dropoff_address, offered_at, expires_at, responded_at"
        )
        .eq("order_id", id)
        .order("attempt_number", { ascending: true }),
    ]);

  return { order, logs: logs ?? [], assignments: assignments ?? [], offers: offers ?? [] };
}

function ts(val: string | null | undefined, opts?: Intl.DateTimeFormatOptions) {
  if (!val) return "—";
  return new Date(val).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    ...opts,
  });
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-800 bg-gray-900/80">
        <h2 className="text-sm font-semibold text-gray-300">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-2 border-b border-gray-800/50 last:border-0">
      <span className="text-xs text-gray-500 w-36 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-200 break-all">{value ?? "—"}</span>
    </div>
  );
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { order, logs, assignments, offers } = await getOrder(id);

  if (!order) notFound();

  const currentStatus = getStatus(order.current_status);
  const finalStatus = order.final_status != null ? getStatus(order.final_status) : null;
  const displayStatus = finalStatus ?? currentStatus;
  const isActive = order.final_status == null;

  // Compute trip duration
  let durationStr = "—";
  if (order.billing_started_at && order.completed_at) {
    const mins = Math.round(
      (new Date(order.completed_at).getTime() -
        new Date(order.billing_started_at).getTime()) /
        60000
    );
    durationStr = `${mins} min`;
  }

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <Link href="/orders?tab=live" className="text-gray-500 hover:text-gray-300 text-sm">
              ← Orders
            </Link>
            <span className="text-gray-700">/</span>
            <span className="text-gray-400 font-mono text-sm">{order.id.slice(0, 8)}…</span>
          </div>
          <h1 className="text-xl font-bold text-white mt-1 flex items-center gap-3">
            Order: {order.phone ?? "No phone"}
            <span
              className={`text-sm px-2.5 py-1 rounded-full font-medium ${displayStatus.color}`}
            >
              {isActive && (
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-current mr-1.5 animate-pulse" />
              )}
              {displayStatus.label}
            </span>
            {order.driver_reassignment_count > 0 && (
              <span className="text-sm px-2.5 py-1 rounded-full bg-orange-900 text-orange-300 font-medium">
                ↺ {order.driver_reassignment_count} reassignment
                {order.driver_reassignment_count > 1 ? "s" : ""}
              </span>
            )}
          </h1>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Created</p>
          <p className="text-sm text-gray-300">{ts(order.created_at)}</p>
        </div>
      </div>

      {/* Top grid: order info + driver info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Order info */}
        <Section title="Order Info">
          <div className="px-5">
            <Field label="Phone" value={order.phone} />
            <Field label="Channel" value={
              <span className="text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-300">
                {CHANNEL_LABELS[order.channel] ?? order.channel}
              </span>
            } />
            <Field label="SCAT UUID" value={
              <span className="font-mono text-xs text-gray-400">{order.scat_uuid ?? "—"}</span>
            } />
            <Field label="Amount" value={
              order.amount != null
                ? `${Number(order.amount).toLocaleString()} so\u2019m`
                : "—"
            } />
            <Field label="Distance" value={
              order.distance_m != null
                ? `${(order.distance_m / 1000).toFixed(2)} km`
                : "—"
            } />
            <Field label="Trip duration" value={durationStr} />
            <Field label="GPS accuracy" value={
              order.gps_accuracy != null ? `${order.gps_accuracy.toFixed(0)} m` : "—"
            } />
          </div>
        </Section>

        {/* Driver info */}
        <Section title="Driver Info">
          <div className="px-5">
            <Field label="Driver name" value={order.driver_name} />
            <Field label="Driver ID" value={
              order.driver_id
                ? <span className="font-mono text-xs text-gray-400">{order.driver_id}</span>
                : null
            } />
            <Field label="Car" value={
              [order.car_color, order.car_brand, order.car_model]
                .filter(Boolean)
                .join(" ") || null
            } />
            <Field label="Car number" value={
              order.car_number
                ? <span className="font-mono">{order.car_number}</span>
                : null
            } />
            <Field label="Driver assigned" value={ts(order.driver_assigned_at)} />
            <Field label="Ride started" value={ts(order.billing_started_at)} />
            <Field label={finalStatus?.group === "terminal" ? "Ended at" : "Last updated"} value={
              ts(order.completed_at ?? order.cancelled_at ?? order.updated_at)
            } />
          </div>
        </Section>
      </div>

      {/* Coordinates */}
      <Section title="Location">
        <div className="px-5">
          <Field label="Pickup" value={
            <span>
              {order.address ?? "—"}{" "}
              <span className="text-gray-600 text-xs font-mono">
                ({order.latitude.toFixed(6)}, {order.longitude.toFixed(6)})
              </span>
            </span>
          } />
          <Field label="Dropoff" value={
            order.dest_latitude != null
              ? <span className="text-gray-600 text-xs font-mono">
                  ({order.dest_latitude.toFixed(6)}, {order.dest_longitude!.toFixed(6)})
                </span>
              : null
          } />
        </div>
      </Section>

      {/* Timeline + Driver offers side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Section title={`Status Timeline (${logs.length})`}>
          <div className="px-5 py-3">
            <OrderTimeline logs={logs} />
          </div>
        </Section>

        <Section title={`Driver Offers (${offers.length})`}>
          <DriverOffers offers={offers} />
        </Section>
      </div>

      {/* Manual assignment — only for active orders */}
      {isActive && (
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Manual Driver Assignment</h2>
          <ManualAssign
            orderId={order.id}
            orderLat={order.latitude}
            orderLon={order.longitude}
            orderRegionId={order.region_id ?? null}
            currentDriverId={order.driver_id ?? null}
          />
        </section>
      )}

      {/* Assignment history */}
      {assignments.length > 0 && (
        <Section title={`Assignment History (${assignments.length})`}>
          <AssignmentHistory assignments={assignments} />
        </Section>
      )}
    </div>
  );
}
