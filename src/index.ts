import { WebSocketServer, WebSocket } from 'ws';

const wss = new WebSocketServer({ port: 8080 });

// Store rooms and their participants
const rooms: Record<string, { participants: Set<WebSocket> }> = {};

wss.on('connection', function connection(ws) {
  ws.on('error', console.error);

  ws.on('message', function message(data: any) {
    const message = JSON.parse(data);

    // Handle room creation or joining
    if (message.type === 'joinRoom') {
      const { roomId } = message;

      if (!rooms[roomId]) {
        rooms[roomId] = { participants: new Set() }; // Create a new room if it doesn't exist
      }

      rooms[roomId].participants.add(ws); // Add user to the room
      console.log(`User joined room ${roomId}`);

      // Notify other users in the room about the new participant
      rooms[roomId].participants.forEach((participant) => {
        if (participant !== ws && participant.readyState === WebSocket.OPEN) {
          participant.send(JSON.stringify({ type: 'newParticipant' }));
        }
      });
    }

    // Handle signaling messages (offer, answer, ICE candidates)
    if (message.type === 'createOffer' || message.type === 'createAnswer' || message.type === 'iceCandidate') {
      const { roomId } = message;

      const room = rooms[roomId];
      if (!room) {
        console.error(`Room ${roomId} not found`);
        return;
      }

      // Forward the message to all other participants in the room
      room.participants.forEach((participant) => {
        if (participant !== ws && participant.readyState === WebSocket.OPEN) {
          participant.send(JSON.stringify(message));
        }
      });
    }

    // Handle leaving the room
    if (message.type === 'leaveRoom') {
      const { roomId } = message;

      const room = rooms[roomId];
      if (room) {
        room.participants.delete(ws); // Remove user from the room
        console.log(`User left room ${roomId}`);

        // Notify other users in the room about the participant leaving
        room.participants.forEach((participant) => {
          if (participant.readyState === WebSocket.OPEN) {
            participant.send(JSON.stringify({ type: 'participantLeft' }));
          }
        });

        // Delete the room if it's empty
        if (room.participants.size === 0) {
          delete rooms[roomId];
          console.log(`Room ${roomId} deleted`);
        }
      }
    }
  });

  // Clean up when a user disconnects
  ws.on('close', () => {
    for (const roomId in rooms) {
      if (rooms[roomId].participants.has(ws)) {
        rooms[roomId].participants.delete(ws); // Remove user from the room
        console.log(`User disconnected from room ${roomId}`);

        // Notify other users in the room about the participant leaving
        rooms[roomId].participants.forEach((participant) => {
          if (participant.readyState === WebSocket.OPEN) {
            participant.send(JSON.stringify({ type: 'participantLeft' }));
          }
        });

        // Delete the room if it's empty
        if (rooms[roomId].participants.size === 0) {
          delete rooms[roomId];
          console.log(`Room ${roomId} deleted`);
        }
      }
    }
  });
});