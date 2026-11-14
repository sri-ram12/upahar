import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Download UPAHAR Web Apps | Customer, Admin, Kitchen, Rider & Dev",
  description: "Install all 5 dedicated Upahar Progressive Web Apps onto Android, iPhone, or Desktop PC.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/customer-192.png",
    apple: "/icons/apple-touch-customer.png",
  },
};

export default function AppsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
