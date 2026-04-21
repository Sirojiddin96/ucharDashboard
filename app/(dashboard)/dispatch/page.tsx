import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import DispatchForm from "./DispatchForm";

export const dynamic = "force-dynamic";

export default async function DispatchPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">📞</span>
          <h1 className="text-2xl font-bold text-white">Call Dispatch</h1>
        </div>
        <p className="text-gray-400 text-sm ml-10">
          Create a new order for a client calling by phone
        </p>
      </div>

      <DispatchForm />
    </div>
  );
}
