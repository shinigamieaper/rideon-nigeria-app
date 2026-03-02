import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RideOn Nigeria",
    short_name: "RideOn",
    description:
      "Safe, reliable, professional pre-booked mobility across Nigeria.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: [
      "window-controls-overlay",
      "fullscreen",
      "standalone",
      "minimal-ui",
    ],
    background_color: "#ffffff",
    theme_color: "#00529B",
    orientation: "portrait",
    categories: ["travel", "business", "productivity"],
    icons: [
      {
        src: "/RIDEONNIGERIA%20LOGO.png",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/RIDEONNIGERIA%20LOGO.png",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/RIDEONNIGERIA%20LOGO.png",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Customer Dashboard",
        url: "/app",
        short_name: "App",
        description: "Open customer dashboard",
      },
      {
        name: "Driver Dashboard",
        url: "/driver",
        short_name: "Driver",
        description: "Open driver dashboard",
      },
    ],
  };
}
