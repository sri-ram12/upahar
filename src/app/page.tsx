import React from "react";
import type { Metadata } from "next";
import { getSubsitesAndSettings } from "@/lib/subsite-data";
import HomeLandingClient from "@/components/home/HomeLandingClient";

export const metadata: Metadata = {
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/customer-192.png",
    apple: "/icons/apple-touch-customer.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "UPAHAR Food",
  },
};

export const revalidate = 30;

export default async function HomePage() {
  const { settings, subsites } = await getSubsitesAndSettings();

  return (
    <HomeLandingClient
      subsites={subsites}
      isEmergencyWebsiteStopped={Boolean(settings?.isEmergencyWebsiteStopped)}
      emergencyStopMessage={settings?.emergencyStopMessage || null}
    />
  );
}
