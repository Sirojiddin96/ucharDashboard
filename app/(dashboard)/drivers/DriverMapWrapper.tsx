"use client";

import dynamicImport from "next/dynamic";

const DriverMap = dynamicImport(() => import("./DriverMap"), { ssr: false });

export default function DriverMapWrapper() {
  return <DriverMap />;
}
