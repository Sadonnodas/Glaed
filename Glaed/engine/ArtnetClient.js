
class ArtnetClient {
    constructor(url = 'ws://localhost:8080') {
        this.url = url;
        this.ws = null;
        this.isConnected = false;
        this.onOpen = null;
        this.onClose = null;
        this.onError = null;
    }

    connect() {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.url);
            } catch (error) {
                console.error('Art-Net client, failed to create websocket');
                if (this.onError) this.onError(error);
                return reject(error);
            }


            this.ws.onopen = () => {
                this.isConnected = true;
                console.log('Art-Net client connected');
                if (this.onOpen) this.onOpen();
                resolve();
            };

            this.ws.onclose = () => {
                this.isConnected = false;
                this.ws = null;
                console.log('Art-Net client disconnected');
                if (this.onClose) this.onClose();
            };

            this.ws.onerror = (error) => {
                console.error('Art-Net client error:', error);
                if (this.onError) this.onError(error);
                reject(error);
            };
        });
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
        }
    }

    send(universe, data) {
        if (!this.isConnected || !this.ws) {
            console.error('Art-Net client not connected. Cannot send data.');
            return;
        }

        if (this.ws.readyState !== WebSocket.OPEN) {
            console.error('WebSocket is not open. readyState:', this.ws.readyState);
            return;
        }

        const message = JSON.stringify({ universe, data });
        this.ws.send(message);
    }
}
