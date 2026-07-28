import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSocket } from "../lib/socket";

export function useRealtime(environmentId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!environmentId) return;

    const socket = getSocket();
    
    if (!socket.connected) {
      socket.connect();
    }

    const onConnect = () => {
      socket.emit("join_env", environmentId);
    };

    if (socket.connected) {
      onConnect();
    } else {
      socket.on("connect", onConnect);
    }

    const onEventIngested = (_payload: any) => {
      // Invalidate events list so it refetches
      queryClient.invalidateQueries({ queryKey: ["events", environmentId] });
      queryClient.invalidateQueries({ queryKey: ["analytics", environmentId] });
    };

    const onDeliverySucceeded = (payload: any) => {
      queryClient.invalidateQueries({ queryKey: ["eventAttempts", payload.eventId] });
      queryClient.invalidateQueries({ queryKey: ["events", environmentId] }); // Event status might change
      queryClient.invalidateQueries({ queryKey: ["analytics", environmentId] });
    };

    const onDeliveryFailed = (payload: any) => {
      queryClient.invalidateQueries({ queryKey: ["eventAttempts", payload.eventId] });
      queryClient.invalidateQueries({ queryKey: ["events", environmentId] });
      queryClient.invalidateQueries({ queryKey: ["analytics", environmentId] });
    };

    // Assuming the backend emits these events to the env:envId room
    socket.on("event.ingested", onEventIngested);
    socket.on("delivery.succeeded", onDeliverySucceeded);
    socket.on("delivery.failed", onDeliveryFailed);

    return () => {
      socket.off("connect", onConnect);
      socket.off("event.ingested", onEventIngested);
      socket.off("delivery.succeeded", onDeliverySucceeded);
      socket.off("delivery.failed", onDeliveryFailed);
      
      if (socket.connected) {
        socket.emit("leave_env", environmentId);
      }
    };
  }, [environmentId, queryClient]);
}
