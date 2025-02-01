"use strict";
// // import { WebSocket, WebSocketServer } from 'ws';
Object.defineProperty(exports, "__esModule", { value: true });
// // const wss = new WebSocketServer({ port: 8080 });
// // let senderSocket: null | WebSocket = null;
// // let receiverSocket: null | WebSocket = null;
// // wss.on('connection', function connection(ws) {
// //   ws.on('error', console.error);
// //   ws.on('message', function message(data: any) {
// //     const message = JSON.parse(data);
// //     if (message.type === 'sender') {
// //       console.log("sender added");
// //       senderSocket = ws;
// //     } else if (message.type === 'receiver') {
// //       console.log("receiver added");
// //       receiverSocket = ws;
// //     } else if (message.type === 'createOffer') {
// //       if (ws !== senderSocket) {
// //         return;
// //       }
// //       console.log("sending offer");
// //       receiverSocket?.send(JSON.stringify({ type: 'createOffer', sdp: message.sdp }));
// //     } else if (message.type === 'createAnswer') {
// //         if (ws !== receiverSocket) {
// //           return;
// //         }
// //         console.log("sending answer");
// //         senderSocket?.send(JSON.stringify({ type: 'createAnswer', sdp: message.sdp }));
// //     } else if (message.type === 'iceCandidate') {
// //       console.log("sending ice candidate")
// //       if (ws === senderSocket) {
// //         receiverSocket?.send(JSON.stringify({ type: 'iceCandidate', candidate: message.candidate }));
// //       } else if (ws === receiverSocket) {
// //         senderSocket?.send(JSON.stringify({ type: 'iceCandidate', candidate: message.candidate }));
// //       }
// //     }
// //   });
// // });
// import { WebSocketServer, WebSocket } from 'ws';
// const wss = new WebSocketServer({ port: 8080 });
// // Store rooms and their participants
// const rooms: Record<string, { sender?: WebSocket; receiver?: WebSocket }> = {};
// wss.on('connection', function connection(ws) {
//   ws.on('error', console.error);
//   ws.on('message', function message(data: any) {
//     const message = JSON.parse(data);
//     // Handle room creation or joining
//     if (message.type === 'joinRoom') {
//       const { roomId, role } = message;
//       if (!rooms[roomId]) {
//         rooms[roomId] = {}; // Create a new room if it doesn't exist
//       }
//       if (role === 'sender') {
//         rooms[roomId].sender = ws; // Add sender to the room
//       } else if (role === 'receiver') {
//         rooms[roomId].receiver = ws; // Add receiver to the room
//       }
//       console.log(`User joined room ${roomId} as ${role}`);
//     }
//     // Handle signaling messages (offer, answer, ICE candidates)
//     if (message.type === 'createOffer' || message.type === 'createAnswer' || message.type === 'iceCandidate') {
//       const { roomId } = message;
//       const room = rooms[roomId];
//       if (!room) {
//         console.error(`Room ${roomId} not found`);
//         return;
//       }
//       // Forward the message to the other peer in the room
//       const target = ws === room.sender ? room.receiver : room.sender;
//       if (target) {
//         target.send(JSON.stringify(message));
//       } else {
//         console.error(`No peer found in room ${roomId}`);
//       }
//     }
//   });
//   // Clean up when a user disconnects
//   ws.on('close', () => {
//     for (const roomId in rooms) {
//       if (rooms[roomId].sender === ws) {
//         console.log(`Sender disconnected from room ${roomId}`);
//         delete rooms[roomId].sender;
//       } else if (rooms[roomId].receiver === ws) {
//         console.log(`Receiver disconnected from room ${roomId}`);
//         delete rooms[roomId].receiver;
//       }
//       // Delete the room if it's empty
//       if (!rooms[roomId].sender && !rooms[roomId].receiver) {
//         delete rooms[roomId];
//         console.log(`Room ${roomId} deleted`);
//       }
//     }
//   });
// });
const ws_1 = require("ws");
const wss = new ws_1.WebSocketServer({ port: 8080 });
// Store rooms and their participants
const rooms = {};
wss.on('connection', function connection(ws) {
    ws.on('error', console.error);
    ws.on('message', function message(data) {
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
                if (participant !== ws && participant.readyState === ws_1.WebSocket.OPEN) {
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
                if (participant !== ws && participant.readyState === ws_1.WebSocket.OPEN) {
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
                    if (participant.readyState === ws_1.WebSocket.OPEN) {
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
                    if (participant.readyState === ws_1.WebSocket.OPEN) {
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
