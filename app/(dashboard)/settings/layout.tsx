import { ReactNode } from "react";
import SettingsNav from "./SettingsNav";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="-m-6 flex flex-col min-h-screen">
      <div className="border-b border-gray-800 px-6 pt-5 pb-0">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Settings</p>
        <SettingsNav />
      </div>
      <div className="flex-1 p-6">{children}</div>
    </div>
  );
}
