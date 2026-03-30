import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Akkauntni o'chirish — UcharGo",
};

export default function DeleteAccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
