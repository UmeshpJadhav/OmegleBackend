const express = require('express');
const app = express();
const path = require('path');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

app.use(cors({
    origin: 'https://omegle-rose.vercel.app',
    methods: ['GET', 'POST'],
    credentials: true
}));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: 'https://omegle-rose.vercel.app',
        methods: ['GET', 'POST'],
        credentials: true
    },
    transports: ['websocket', 'polling']
});

let waitingusers = [];
// let rooms = {}; // Uncomment if you plan to use this later

io.on("connection", function(socket) {
    console.log(`New client connected: ${socket.id}`);
    
    socket.on("joinroom", function() {
        if (waitingusers.length > 0) {
            // Get the waiting partner and create a unique room name.
            let partner = waitingusers.shift();
            const roomname = `${socket.id}-${partner.id}`;

            socket.join(roomname);
            partner.join(roomname);

            // Notify both clients that they have joined the room.
            io.to(roomname).emit("joined", roomname);
        } else {
            waitingusers.push(socket);
        }
    });

    socket.on('startVideoCall', (data) => {
        const { room } = data;
        console.log(`startVideoCall event from ${socket.id} for room ${room}`);
        // Send an incoming call event to everyone in the room except the sender.
        socket.to(room).emit('incomingCall');
    });

    socket.on('acceptCall', (data) => {
        const { room } = data;
        console.log(`acceptCall event from ${socket.id} for room ${room}`);
        // Notify the other participant in the room that the call was accepted.
        socket.to(room).emit('callAccepted');
    });

    socket.on('rejectCall', (data) => {
        const { room } = data;
        console.log(`rejectCall event from ${socket.id} for room ${room}`);
        // Notify the other participant that the call was rejected.
        socket.to(room).emit('callRejected');
    });
           
    socket.on("typing", ({ room }) => {
        socket.to(room).emit("userTyping");
    });
  
    socket.on("disconnect", function() {
        let index = waitingusers.findIndex(
            (waitingUser) => waitingUser.id === socket.id
        );
    
        if (index !== -1) {
            waitingusers.splice(index, 1);
        }
        console.log(`Client disconnected: ${socket.id}`);
    });
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
