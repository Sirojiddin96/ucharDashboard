"use client";

import { useEffect, useRef, useState } from "react";

interface FakeCall {
  id: number;
  phone: string;
  time: string;
  operator: string;
  isNew?: boolean;
}

const OPERATORS = ["UzTelecom", "Beeline", "Ucell", "Humans"];
const AREA_CODES = ["90", "91", "93", "94", "97", "98", "71", "74"];

function randomPhone() {
  const area = AREA_CODES[Math.floor(Math.random() * AREA_CODES.length)];
  const num = [
    Math.floor(Math.random() * 900) + 100,
    Math.floor(Math.random() * 90) + 10,
    Math.floor(Math.random() * 90) + 10,
  ].join("-");
  return `+998 ${area} ${num}`;
}

function randomOperator() {
  return OPERATORS[Math.floor(Math.random() * OPERATORS.length)];
}

function timeNow() {
  return new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

const INITIAL_CALLS: FakeCall[] = [
  { id: 1, phone: "+998 90 123-45-67", time: "12:43", operator: "Beeline" },
  { id: 2, phone: "+998 93 987-65-43", time: "12:41", operator: "Ucell" },
  { id: 3, phone: "+998 71 555-11-22", time: "12:38", operator: "UzTelecom" },
  { id: 4, phone: "+998 94 210-77-88", time: "12:35", operator: "Humans" },
];

export default function LiveCallsTable() {
  const [calls, setCalls] = useState<FakeCall[]>(INITIAL_CALLS);
  const nextId = useRef(10);

  useEffect(() => {
    // Simulate a new call every 7–20 seconds
    function scheduleNext() {
      const delay = Math.random() * 13_000 + 7_000;
      return setTimeout(() => {
        const newCall: FakeCall = {
          id: nextId.current++,
          phone: randomPhone(),
          time: timeNow(),
          operator: randomOperator(),
          isNew: true,
        };
        setCalls((prev) => [newCall, ...prev.slice(0, 9)]);
        // Clear "new" highlight after 3s
        setTimeout(() => {
          setCalls((prev) =>
            prev.map((c) => (c.id === newCall.id ? { ...c, isNew: false } : c))
          );
        }, 3000);
        scheduleNext();
      }, delay);
    }
    const id = scheduleNext();
    return () => clearTimeout(id);
  }, []);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
          <h3 className="text-sm font-semibold text-white">Live Calls</h3>
          <span className="text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded-full">
            mockup
          </span>
        </div>
        <span className="text-xs text-gray-600 italic">
          Ready for UzTelecom / SIP integration
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-130">
          <thead className="border-b border-gray-800">
            <tr className="text-gray-500 uppercase tracking-wider text-left">
              <th className="px-4 py-2 font-medium">Phone</th>
              <th className="px-4 py-2 font-medium">Time</th>
              <th className="px-4 py-2 font-medium">Operator</th>
              <th className="px-4 py-2 font-medium">Order</th>
              <th className="px-4 py-2 font-medium">Agent</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {calls.map((c) => (
              <tr
                key={c.id}
                className={`transition-colors ${
                  c.isNew
                    ? "bg-indigo-900/25 border-l-2 border-l-indigo-500"
                    : "hover:bg-gray-800/30"
                }`}
              >
                <td className="px-4 py-2.5 font-mono text-gray-200">
                  {c.isNew && (
                    <span className="mr-1.5 animate-pulse">🔔</span>
                  )}
                  {c.phone}
                </td>
                <td className="px-4 py-2.5 text-gray-400 tabular-nums whitespace-nowrap">
                  {c.time}
                </td>
                <td className="px-4 py-2.5">
                  <span className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">
                    {c.operator}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-gray-700">—</td>
                <td className="px-4 py-2.5 text-gray-700">—</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
