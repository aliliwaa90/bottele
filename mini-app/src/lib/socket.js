import { io } from "socket.io-client";
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? "http://localhost:4000";
let socket = null;
export function connectSocket(token) {
    if (socket?.connected)
        return socket;
    socket = io(SOCKET_URL, {
        transports: ["websocket"],
        auth: {
            token
        }
    });
    return socket;
}
export function disconnectSocket() {
    socket?.disconnect();
    socket = null;
}
