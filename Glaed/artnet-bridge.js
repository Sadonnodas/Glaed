
const dgram = require('dgram');
const { WebSocketServer } = require('ws');

const ARTNET_PORT = 6454;
const HOST = '127.0.0.1'; // Default Art-Net host, change if your interface is elsewhere
const WS_PORT = 8080;

const udpClient = dgram.createSocket('udp4');
const wsServer = new WebSocketServer({ port: WS_PORT });

console.log(`Glaed Art-Net Bridge`);
console.log(`---------------------`);
console.log(`Listening for WebSocket connections on port ${WS_PORT}`);
console.log(`Forwarding Art-Net data to ${HOST}:${ARTNET_PORT}`);
console.log(``);


wsServer.on('connection', ws => {
  console.log('Client connected');

  ws.on('message', message => {
    // The message from the browser is expected to be a JSON string
    // containing a 'universe' and a 'data' array (0-255).
    try {
      const { universe, data } = JSON.parse(message);
      if (universe === undefined || !Array.isArray(data)) {
        throw new Error('Invalid message format');
      }

      // Art-Net header for a single DMX packet (OpOutput)
      const header = Buffer.from([
        0x41, 0x72, 0x74, 0x2d, 0x4e, 0x65, 0x74, 0x00, // "Art-Net"
        0x00, 0x50, // OpCode: OpOutput
        0x00, 0x0e, // Protocol Version
        0x00,       // Sequence
        0x00,       // Physical
        universe & 0xff, (universe >> 8) & 0xff, // Universe (little-endian)
        (data.length >> 8) & 0xff, data.length & 0xff, // Length
      ]);

      const dmxData = Buffer.from(data);
      const artnetPacket = Buffer.concat([header, dmxData]);

      udpClient.send(artnetPacket, 0, artnetPacket.length, ARTNET_PORT, HOST, (err) => {
        if (err) {
            console.error('Error sending Art-Net packet:', err);
        }
      });

    } catch (e) {
      console.error('Failed to parse message or send Art-Net packet:', e.message);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

wsServer.on('error', (error) => {
    console.error('WebSocket Server error:', error);
});
