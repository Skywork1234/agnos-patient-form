import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";
import {
  SOCKET_EVENTS,
  type JoinPayload,
  type PatientUpdatePayload,
  type StaffDeletePayload,
  type StaffUpdatePayload,
} from "./lib/types";
import {
  deleteSession,
  ensureSession,
  getSession,
  listSessions,
  updateSession,
  updateSessionData,
} from "./server/session-store";

const LOBBY_ROOM = "lobby";

const port = parseInt(process.env.PORT || "3000", 10);
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => handle(req, res));
  const io = new Server(httpServer, { path: "/socket.io" });

  const broadcastLobby = () => io.to(LOBBY_ROOM).emit(SOCKET_EVENTS.LOBBY_SYNC, listSessions());

  io.on("connection", (socket) => {
    socket.on(SOCKET_EVENTS.JOIN, ({ sessionId, role }: JoinPayload) => {
      socket.join(sessionId);
      if (role === "staff") {
        socket.emit(SOCKET_EVENTS.STAFF_SYNC, getSession(sessionId));
      } else {
        const state = ensureSession(sessionId);
        socket.emit(SOCKET_EVENTS.PATIENT_SYNC, state);
        broadcastLobby();
      }
    });

    socket.on(SOCKET_EVENTS.LOBBY_JOIN, () => {
      socket.join(LOBBY_ROOM);
      socket.emit(SOCKET_EVENTS.LOBBY_SYNC, listSessions());
    });

    socket.on(SOCKET_EVENTS.PATIENT_UPDATE, ({ sessionId, data, status }: PatientUpdatePayload) => {
      const state = updateSession(sessionId, data, status);
      socket.to(sessionId).emit(SOCKET_EVENTS.STAFF_SYNC, state);
      broadcastLobby();
    });

    socket.on(SOCKET_EVENTS.PATIENT_SUBMIT, ({ sessionId, data }: PatientUpdatePayload) => {
      const state = updateSession(sessionId, data, "submitted");
      io.to(sessionId).emit(SOCKET_EVENTS.STAFF_SYNC, state);
      broadcastLobby();
    });

    socket.on(SOCKET_EVENTS.STAFF_UPDATE, ({ sessionId, data }: StaffUpdatePayload) => {
      const state = updateSessionData(sessionId, data);
      io.to(sessionId).emit(SOCKET_EVENTS.STAFF_SYNC, state);
      broadcastLobby();
    });

    socket.on(SOCKET_EVENTS.STAFF_DELETE, ({ sessionId }: StaffDeletePayload) => {
      deleteSession(sessionId);
      io.to(sessionId).emit(SOCKET_EVENTS.STAFF_SYNC, null);
      broadcastLobby();
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Server listening at http://localhost:${port} as ${dev ? "development" : process.env.NODE_ENV}`);
  });
});
