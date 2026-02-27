import http from "node:http";

import { env } from "./config/env.js";
import { app } from "./app.js";
import { initSocket } from "./lib/socket.js";
const server = http.createServer(app);
if (env.SOCKET_ENABLED) {
  initSocket(server);
}

const port = Number(process.env.PORT ?? env.BACKEND_PORT);

server.listen(port, () => {
  console.log(`VaultTap backend listening on port ${port}`);
});
