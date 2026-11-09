// A stable ID keeps the installed app's identity unchanged across deployments.
export default function manifest() {
  return {
    id: "/",
    name: "WebMCP Learning Lab",
    short_name: "WebMCP Lab",
    description: "A mock pantry shop and help desk for learning browser tools.",
    start_url: "/",
    scope: "/",
    lang: "en",
    display: "standalone",
    background_color: "#f6f4ed",
    theme_color: "#214f3c",
    prefer_related_applications: false,
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Pantry Run",
        url: "/shop",
        description: "Build a mock pantry basket",
      },
      {
        name: "Help desk",
        url: "/help-desk",
        description: "Try the ticket example",
      },
    ],
  };
}
