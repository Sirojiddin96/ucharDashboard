import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Maxfiylik siyosati — UcharGo",
};

export default function PrivacyPolicyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
