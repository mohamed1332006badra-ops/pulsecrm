import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: "PulseCRM | Enterprise Multi-Tenant B2B CRM",
  description:
    "Enterprise-grade B2B Customer Relationship Management SaaS with strict tenant isolation, concurrency-safe lead ingestion, and AI Sales Copilot.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
