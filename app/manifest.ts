import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CutFlow Barber Dashboard",
    short_name: "CutFlow",
    description: "Bookings, clients, payments and reporting for independent barbers.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#f2f4f6",
    theme_color: "#111318",
    orientation: "portrait-primary",
    icons: [
      { src: "/icons/cutflow-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/cutflow-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/cutflow-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
