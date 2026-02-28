import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

// Socket.IO server URL (same as API but without /api)
const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');

let socketInstance: Socket | null = null;

function getSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  return socketInstance;
}

/**
 * Hook to connect to Socket.IO and listen for real-time events.
 * 
 * @param room - The room to join (e.g., 'doctor-<id>' or 'patient-<id>')
 * @param roomType - 'doctor' or 'patient'
 * @param events - Object mapping event names to handler functions
 */
export function useSocket(
  roomId: string | null,
  roomType: 'doctor' | 'patient',
  events: Record<string, (data: any) => void>
) {
  const eventsRef = useRef(events);
  eventsRef.current = events;

  useEffect(() => {
    if (!roomId) return;

    const socket = getSocket();

    if (!socket.connected) {
      socket.connect();
    }

    // Join the appropriate room
    const joinEvent = roomType === 'doctor' ? 'join-doctor-room' : 'join-patient-room';
    socket.emit(joinEvent, roomId);

    // Register event listeners
    const handlers: Record<string, (data: any) => void> = {};
    for (const [eventName, handler] of Object.entries(eventsRef.current)) {
      const wrappedHandler = (data: any) => {
        eventsRef.current[eventName]?.(data);
      };
      handlers[eventName] = wrappedHandler;
      socket.on(eventName, wrappedHandler);
    }

    return () => {
      // Remove event listeners on cleanup
      for (const [eventName, handler] of Object.entries(handlers)) {
        socket.off(eventName, handler);
      }
    };
  }, [roomId, roomType]);
}

export default useSocket;
