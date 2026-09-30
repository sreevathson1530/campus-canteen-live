import type { MetadataRoute } from "next";

/** Makes the site installable: "Add to Home screen" opens it full-screen with its own icon. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Campus Canteen",
    short_name: "Canteen",
    description: "Order pizzas, burgers and coffee from your phone and pick up with your token.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#d2112c",
    categories: ["food", "shopping"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Menu", url: "/menu" },
      { name: "My orders", url: "/orders" },
    ],
  };
}
