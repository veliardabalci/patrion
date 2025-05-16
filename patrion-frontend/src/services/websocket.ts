import { SensorData } from '@/types';
import { io, Socket } from 'socket.io-client';
import { getCookie } from '@/utils/cookies';

type WebSocketCallback = (data: SensorData[] | any) => void;

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private callbacks: Map<string, WebSocketCallback[]> = new Map();
  private isConnecting: boolean = false;

  constructor() {
    // Automatically reconnect on window focus if connection was lost
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => {
        if (!this.socket?.connected && !this.isConnecting) {
          this.connect();
        }
      });
    }
  }

  public connect(): void {
    if (this.socket?.connected || this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    
    try {
      console.log('Socket.IO: Connecting to sensor service...');
      
      // JWT token'ı cookie'den al
      const token = getCookie('token');
      
      if (!token) {
        console.warn('Socket.IO: Token bulunamadı, doğrulama başarısız olabilir');
      }
      
      // Socket.IO yapılandırması
      this.socket = io('ws://localhost:3001/sensors', {
        auth: {
          token // JWT token'ı auth nesnesi içinde gönder
        },
        transports: ['websocket'], // WebSocket'i tercih et
        reconnectionAttempts: 5, // Bağlantı kesilirse 5 kez yeniden deneme yap
        reconnectionDelay: 1000, // Denemeler arasında 1 saniye bekle
        forceNew: true
      });
      
      this.socket.on('connect', this.handleOpen.bind(this));
      this.socket.on('disconnect', this.handleClose.bind(this));
      this.socket.on('connect_error', this.handleError.bind(this));
      
      // Sensör verileri olaylarını dinle
      this.socket.on('sensors-registry', (data) => this.handleMessage('sensors-registry', data));
      this.socket.on('sensors-update', (data) => this.handleMessage('sensors-update', data));
      
    } catch (error) {
      console.error('Socket.IO: Connection error:', error);
      this.scheduleReconnect();
    }
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  public subscribe(event: string, callback: WebSocketCallback): void {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, []);
    }
    
    this.callbacks.get(event)?.push(callback);
    
    // Auto-connect if not already connected
    if (!this.socket || !this.socket.connected) {
      this.connect();
    }
    
    // Özel sensör olayları için abone ol
    if (event.startsWith('sensor-data-') && this.socket) {
      const sensorId = event.replace('sensor-data-', '');
      this.socket.emit('subscribe-sensor', sensorId, (response: {success: boolean}) => {
        if (response.success) {
          console.log(`Socket.IO: Subscribed to sensor ${sensorId}`);
          // Özel sensör olayını dinle
          this.socket?.on(event, (data) => this.handleMessage(event, data));
        } else {
          console.error(`Socket.IO: Failed to subscribe to sensor ${sensorId}`);
        }
      });
    }
  }

  public unsubscribe(event: string, callback: WebSocketCallback): void {
    const callbacks = this.callbacks.get(event) || [];
    const index = callbacks.indexOf(callback);
    
    if (index !== -1) {
      callbacks.splice(index, 1);
      
      if (callbacks.length === 0) {
        this.callbacks.delete(event);
        
        // Özel sensör aboneliğini iptal et
        if (event.startsWith('sensor-data-') && this.socket) {
          const sensorId = event.replace('sensor-data-', '');
          this.socket.emit('unsubscribe-sensor', sensorId);
          this.socket.off(event);
        }
      }
    }
    
    // Disconnect if no more subscribers
    if (this.callbacks.size === 0) {
      this.disconnect();
    }
  }

  private handleOpen(): void {
    console.log('Socket.IO: Connected to sensor service');
    this.isConnecting = false;
  }

  private handleMessage(event: string, data: any): void {
    try {
      const callbacks = this.callbacks.get(event) || [];
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Socket.IO: Error in callback:', error);
        }
      });
    } catch (error) {
      console.error('Socket.IO: Error handling message:', error);
    }
  }

  private handleClose(reason: string): void {
    console.log(`Socket.IO: Connection closed: ${reason}`);
    this.socket = null;
    this.isConnecting = false;
    
    // Auto-reconnect for abnormal closures
    if (reason !== 'io client disconnect') {
      this.scheduleReconnect();
    }
  }

  private handleError(error: Error): void {
    console.error('Socket.IO: Error:', error.message);
    this.isConnecting = false;
    this.scheduleReconnect();
  }

  private sendMessage(event: string, data: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    // Reconnect after 5 seconds
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, 5000);
  }
}

// Singleton instance
const webSocketService = new WebSocketService();
export default webSocketService; 