export function resolveWebSocketUrl() {
  const configuredUrl = import.meta.env.VITE_WEBSOCKET_URL?.trim();
  if (configuredUrl) {
    return configuredUrl;
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const port = import.meta.env.VITE_WEBSOCKET_PORT?.trim() || "8080";
  return `${protocol}//${window.location.hostname}:${port}`;
}
