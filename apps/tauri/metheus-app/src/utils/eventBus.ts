import { invoke, listen } from "./tauri";

type EventCallback = (data: any) => void;
type UnsubscribeFunction = () => void;

/**
 * A simple event bus for communication between windows and components
 */
class EventBus {
  private listeners: Map<string, EventCallback[]> = new Map();
  private initialized = false;

  /**
   * Initialize the event bus
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Listen for app-message events from the backend
    await listen<{ event_type: string; data: any }>("app-message", (event) => {
      const { event_type, data } = event.payload;
      this.notify(event_type, data);
    });

    this.initialized = true;
  }

  /**
   * Subscribe to an event
   * @param eventType The event type to subscribe to
   * @param callback The callback to call when the event is emitted
   * @returns A function to unsubscribe from the event
   */
  public subscribe(eventType: string, callback: EventCallback): UnsubscribeFunction {
    // Initialize the event bus if it hasn't been initialized yet
    if (!this.initialized) {
      this.initialize().catch((error) => {
        console.error("Failed to initialize event bus:", error);
      });
    }

    // Get or create the listeners array for this event type
    const listeners = this.listeners.get(eventType) || [];
    listeners.push(callback);
    this.listeners.set(eventType, listeners);

    // Return a function to unsubscribe
    return () => {
      const listeners = this.listeners.get(eventType);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index !== -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }

  /**
   * Notify all listeners of an event
   * @param eventType The event type
   * @param data The event data
   */
  private notify(eventType: string, data: any): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      for (const callback of listeners) {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${eventType}:`, error);
        }
      }
    }
  }

  /**
   * Send a message to a specific window
   * @param windowLabel The label of the window to send the message to
   * @param messageType The type of message to send
   * @param messageData The data to send with the message
   */
  public async sendToWindow(
    windowLabel: string,
    messageType: string,
    messageData: any
  ): Promise<void> {
    try {
      await invoke("send_message_to_window", {
        windowLabel,
        messageType,
        messageData,
      });
    } catch (error) {
      console.error(`Failed to send message to window ${windowLabel}:`, error);
      throw error;
    }
  }

  /**
   * Broadcast a message to all windows
   * @param messageType The type of message to broadcast
   * @param messageData The data to send with the message
   */
  public async broadcast(messageType: string, messageData: any): Promise<void> {
    try {
      await invoke("broadcast_message", {
        messageType,
        messageData,
      });
    } catch (error) {
      console.error("Failed to broadcast message:", error);
      throw error;
    }
  }
}

// Export a singleton instance
export const eventBus = new EventBus();
