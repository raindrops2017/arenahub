import { io, Socket } from 'socket.io-client';

const SOCKET_URL =
  process.env.EXPO_PUBLIC_SOCKET_URL ||
  (process.env.EXPO_PUBLIC_API_URL
    ? process.env.EXPO_PUBLIC_API_URL.replace(/\/api\/v1\/?$/, '')
    : 'http://localhost:3000');

export interface SlotEventData {
  bookingId: string;
  venueId: string;
  date: string;
  startTime: number;
  endTime: number;
  expiresAt?: string;
}

export interface AdvertisementEventData {
  action?: string;
  adId?: string;
  timestamp?: string;
}

class SocketService {
  private socket: Socket | null = null;
  private currentJoinedVenueId: string | null = null;

  connect(): Socket {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    if (!this.socket) {
      this.socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      this.socket.on('connect', () => {
        console.log('[SocketService] Connected to WebSocket Gateway:', this.socket?.id);
        if (this.currentJoinedVenueId) {
          this.joinVenue(this.currentJoinedVenueId);
        }
      });

      this.socket.on('disconnect', (reason) => {
        console.log('[SocketService] Disconnected:', reason);
      });

      this.socket.on('connect_error', (error) => {
        console.warn('[SocketService] Connection error:', error.message);
      });
    } else {
      this.socket.connect();
    }

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.currentJoinedVenueId = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  joinVenue(venueId: string) {
    if (!venueId) return;
    this.currentJoinedVenueId = venueId;
    const socket = this.connect();
    socket.emit('join_venue', { venueId });
  }

  leaveVenue(venueId: string) {
    if (!venueId) return;
    if (this.currentJoinedVenueId === venueId) {
      this.currentJoinedVenueId = null;
    }
    if (this.socket) {
      this.socket.emit('leave_venue', { venueId });
    }
  }

  onSlotLocked(callback: (data: SlotEventData) => void): () => void {
    const socket = this.connect();
    socket.on('slot_locked', callback);
    return () => {
      socket.off('slot_locked', callback);
    };
  }

  onSlotReleased(callback: (data: SlotEventData) => void): () => void {
    const socket = this.connect();
    socket.on('slot_released', callback);
    return () => {
      socket.off('slot_released', callback);
    };
  }

  onBookingConfirmed(callback: (data: SlotEventData) => void): () => void {
    const socket = this.connect();
    socket.on('booking_confirmed', callback);
    return () => {
      socket.off('booking_confirmed', callback);
    };
  }

  onAdvertisementsUpdated(callback: (data?: AdvertisementEventData) => void): () => void {
    const socket = this.connect();
    socket.on('advertisements_updated', callback);
    return () => {
      socket.off('advertisements_updated', callback);
    };
  }
}

export const socketService = new SocketService();
