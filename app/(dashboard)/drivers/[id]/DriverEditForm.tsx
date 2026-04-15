"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const SERVICE_CLASSES = [
  "economy", 
  "standard", 
  "comfort", 
  "business", 
  "minivan", 
  "intercity", 
  "delivery",
  "loads"
] as const;

const ROLES = ["courier", "driver", "admin"] as const;

interface Region {
  id: string;
  name: string;
}

export interface InitialUser {
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  phone: string | null;
  role: string;
  region_id: string | null;
  service_class: string | null;
}

export interface InitialApp {
  app_id: string | null;
  service: string | null;
  car_brand: string | null;
  car_color: string | null;
  car_reg_number: string | null;
  call_sign: string | null;
  connection_type: string | null;
  driver_license: string | null;
}

interface Props {
  driverId: string;
  initialUser: InitialUser;
  initialApp: InitialApp;
  regions: Region[];
}

const input =
  "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500";
const label = "text-xs text-gray-500 block mb-1";

export default function DriverEditForm({
  driverId,
  initialUser,
  initialApp,
  regions,
}: Props) {
  const router = useRouter();

  console.log(initialUser);

  // ── Personal info ────────────────────────────────────────────────────────
  const [firstName, setFirstName] = useState(initialUser.first_name ?? "");
  const [lastName, setLastName] = useState(initialUser.last_name ?? "");
  const [username, setUsername] = useState(initialUser.username ?? "");
  const [phone, setPhone] = useState(initialUser.phone ?? "");
  const [role, setRole] = useState(initialUser.role ?? "courier");

  // ── Dispatch assignment ───────────────────────────────────────────────────
  const [regionId, setRegionId] = useState(initialUser.region_id ?? "");
  const [serviceClass, setServiceClass] = useState(
    initialUser.service_class ?? ""
  );

  // ── Vehicle / license ─────────────────────────────────────────────────────
  const [appService, setAppService] = useState(initialApp.service ?? "");
  const [carBrand, setCarBrand] = useState(initialApp.car_brand ?? "");
  const [carColor, setCarColor] = useState(initialApp.car_color ?? "");
  const [carReg, setCarReg] = useState(initialApp.car_reg_number ?? "");
  const [callSign, setCallSign] = useState(initialApp.call_sign ?? "");
  const [connectionType, setConnectionType] = useState(
    initialApp.connection_type ?? "terminal"
  );
  const [driverLicense, setDriverLicense] = useState(
    initialApp.driver_license ?? ""
  );

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function touch() {
    setSaved(false);
    setError(null);
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch(`/api/drivers/${driverId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // users fields
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
          username: username.trim() || null,
          phone: phone.trim() || null,
          role,
          region_id: regionId || null,
          service_class: serviceClass || null,
          // application fields
          app_id: initialApp.app_id,
          service: appService || null,
          car_brand_dispatcher: carBrand.trim() || null,
          car_color_dispatcher: carColor.trim() || null,
          car_reg_number: carReg.trim() || null,
          call_sign: callSign.trim() || null,
          connection_type: connectionType || null,
          driver_license: driverLicense.trim() || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to save");
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* ── Personal Info ── */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Personal Info
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>First name</label>
            <input
              value={firstName}
              onChange={(e) => {
                setFirstName(e.target.value);
                touch();
              }}
              className={input}
              placeholder="First name"
            />
          </div>
          <div>
            <label className={label}>Last name</label>
            <input
              value={lastName}
              onChange={(e) => {
                setLastName(e.target.value);
                touch();
              }}
              className={input}
              placeholder="Last name"
            />
          </div>
          <div>
            <label className={label}>Username</label>
            <input
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                touch();
              }}
              className={input}
              placeholder="@username"
            />
          </div>
          <div>
            <label className={label}>Phone</label>
            <input
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                touch();
              }}
              className={input}
              placeholder="+998..."
            />
          </div>
        </div>
        <div>
          <label className={label}>Role</label>
          <select
            title="Role"
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              touch();
            }}
            className={input}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Dispatch Assignment ── */}
      <div className="space-y-3 pt-3 border-t border-gray-800">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Dispatch Assignment
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Region</label>
            <select
              title="Region"
              value={regionId}
              onChange={(e) => {
                setRegionId(e.target.value);
                touch();
              }}
              className={input}
            >
              <option value="">— Not assigned —</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Service class</label>
            <select
              title="Service class"
              value={serviceClass}
              onChange={(e) => {
                setServiceClass(e.target.value);
                touch();
              }}
              className={input}
            >
              <option value="">— Any class —</option>
              {SERVICE_CLASSES.map((sc) => (
                <option key={sc} value={sc}>
                  {sc.charAt(0).toUpperCase() + sc.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Vehicle & License ── */}
      {initialApp.app_id && (
        <div className="space-y-3 pt-3 border-t border-gray-800">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Vehicle &amp; License
          </p>
          {/* Service offered */}
          <div>
            <label className={label}>Service offered</label>
            <select
              title="Service offered"
              value={appService}
              onChange={(e) => { setAppService(e.target.value); touch(); }}
              className={input}
            >
              <option value="">— Not set —</option>
              {SERVICE_CLASSES.map((sc) => (
                <option key={sc} value={sc}>
                  {sc.charAt(0).toUpperCase() + sc.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Car brand / model</label>
              <input
                value={carBrand}
                onChange={(e) => {
                  setCarBrand(e.target.value);
                  touch();
                }}
                className={input}
                placeholder="Cobalt 2020"
              />
            </div>
            <div>
              <label className={label}>Car color</label>
              <input
                value={carColor}
                onChange={(e) => {
                  setCarColor(e.target.value);
                  touch();
                }}
                className={input}
                placeholder="White"
              />
            </div>
            <div>
              <label className={label}>Plate number</label>
              <input
                value={carReg}
                onChange={(e) => {
                  setCarReg(e.target.value);
                  touch();
                }}
                className={input}
                placeholder="01 A 123 AB"
              />
            </div>
            <div>
              <label className={label}>Call sign</label>
              <input
                value={callSign}
                onChange={(e) => {
                  setCallSign(e.target.value);
                  touch();
                }}
                className={input}
                placeholder="T-42"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Connection type</label>
              <select
                title="Connection type"
                value={connectionType}
                onChange={(e) => {
                  setConnectionType(e.target.value);
                  touch();
                }}
                className={input}
              >
                <option value="terminal">Terminal</option>
                <option value="radio">Radio</option>
              </select>
            </div>
            <div>
              <label className={label}>Driver license</label>
              <input
                value={driverLicense}
                onChange={(e) => {
                  setDriverLicense(e.target.value);
                  touch();
                }}
                className={input}
                placeholder="AA 123456"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Actions ── */}
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-lg transition-colors font-medium"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        {saved && <span className="text-xs text-green-400">✓ Saved</span>}
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    </div>
  );
}
