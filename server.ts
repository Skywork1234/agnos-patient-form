import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";
import { SOCKET_EVENTS, type JoinPayload, type PatientUpdatePayload } from "./lib/types";
import { getSession, updateSession } from "./server/session-store";

const port = parseInt(process.env.PORT || "3000", 10);
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => handle(req, res));
  const io = new Server(httpServer, { path: "/socket.io" });

  io.on("connection", (socket) => {
    socket.on(SOCKET_EVENTS.JOIN, ({ sessionId, role }: JoinPayload) => {
      socket.join(sessionId);
      if (role === "staff") {
        socket.emit(SOCKET_EVENTS.STAFF_SYNC, getSession(sessionId));
      }
    });

    socket.on(SOCKET_EVENTS.PATIENT_UPDATE, ({ sessionId, data, status }: PatientUpdatePayload) => {
      const state = updateSession(sessionId, data, status);
      socket.to(sessionId).emit(SOCKET_EVENTS.STAFF_SYNC, state);
    });

    socket.on(SOCKET_EVENTS.PATIENT_SUBMIT, ({ sessionId, data }: PatientUpdatePayload) => {
      const state = updateSession(sessionId, data, "submitted");
      io.to(sessionId).emit(SOCKET_EVENTS.STAFF_SYNC, state);
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Server listening at http://localhost:${port} as ${dev ? "development" : process.env.NODE_ENV}`);
  });
});
