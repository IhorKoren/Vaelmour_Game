import { pathToFileURL } from "node:url";
import { createMultiplayerServer } from "./multiplayerServer.js";

const LOCAL_DEVELOPMENT_PORT = 8080;
const host = "0.0.0.0";

function resolvePort() {
  if (process.env.PORT === undefined) {
    return LOCAL_DEVELOPMENT_PORT;
  }

  const port = Number(process.env.PORT);
  if (!Number.isInteger(port) || port <= 0 || port > 65_535) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }

  return port;
}

async function main() {
  const server = await createMultiplayerServer(resolvePort(), host);
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
