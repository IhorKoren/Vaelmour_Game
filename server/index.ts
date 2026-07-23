import { pathToFileURL } from "node:url";
import { createMultiplayerServer } from "./multiplayerServer.js";

const port = Number(process.env.PORT ?? 8080);
const host = process.env.HOST ?? "0.0.0.0";

async function main() {
  const server = await createMultiplayerServer(port, host);
  console.log(
    `Racing multiplayer server listening on ws://${host}:${server.port}`,
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
