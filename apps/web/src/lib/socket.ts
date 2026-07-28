import { io, Socket } from "socket.io-client";
import { getAccessToken } from "./api";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

let socketInstance: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socketInstance) {
    socketInstance = io(API_BASE_URL, {
      auth: (cb) => {
        cb({ token: getAccessToken() });
      },
      autoConnect: false,
    });
  }
  return socketInstance;
};
