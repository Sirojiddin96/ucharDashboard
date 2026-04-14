type Offer = {
  id: string;
  driver_id: string;
  status: string;
  attempt_number: number;
  distance_m: number | null;
  estimated_fare: number | null;
  pickup_address: string | null;
  dropoff_address: string | null;
  offered_at: string;
  expires_at: string;
  responded_at: string | null;
};

const OFFER_STATUS_STYLES: Record<string, string> = {
  accepted: "bg-green-900 text-green-300",
  rejected: "bg-red-900 text-red-300",
  timeout: "bg-orange-900 text-orange-300",
  cancelled: "bg-gray-700 text-gray-400",
  pending: "bg-blue-900 text-blue-300",
};

function fmt(ts: string) {
  return new Date(ts).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function msElapsed(from: string, to: string | null): string {
  const end = to ? new Date(to) : new Date(from);
  const ms = new Date(to ?? from).getTime() - new Date(from).getTime();
  if (ms <= 0) return "—";
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function DriverOffers({ offers }: { offers: Offer[] }) {
  if (offers.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500 text-sm">
        No offers recorded for this order
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-800/60">
      {offers.map((offer) => {
        const statusCls =
          OFFER_STATUS_STYLES[offer.status] ?? "bg-gray-700 text-gray-400";
        return (
          <div key={offer.id} className="py-3 px-4 flex items-start gap-4">
            <div className="shrink-0 text-xs text-gray-600 font-mono w-5 text-right pt-0.5">
              #{offer.attempt_number}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCls}`}
                >
                  {offer.status}
                </span>
                <span className="font-mono text-xs text-gray-500 truncate max-w-45">
                  {offer.driver_id}
                </span>
              </div>
              <div className="flex gap-3 mt-0.5 text-xs text-gray-500 flex-wrap">
                <span>Sent {fmt(offer.offered_at)}</span>
                <span>
                  Responded:{" "}
                  {offer.responded_at
                    ? `${fmt(offer.responded_at)} (${msElapsed(offer.offered_at, offer.responded_at)})`
                    : "—"}
                </span>
                {offer.distance_m != null && (
                  <span>{(offer.distance_m / 1000).toFixed(1)} km away</span>
                )}
                {offer.estimated_fare != null && (
                  <span>
                    Est. {Number(offer.estimated_fare).toLocaleString()} so&apos;m
                  </span>
                )}
              </div>
              {(offer.pickup_address || offer.dropoff_address) && (
                <div className="mt-0.5 text-xs text-gray-600">
                  {offer.pickup_address && <span>↑ {offer.pickup_address}</span>}
                  {offer.dropoff_address && (
                    <span className="ml-3">↓ {offer.dropoff_address}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
