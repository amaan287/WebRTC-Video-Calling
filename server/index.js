import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import bodyParser from 'body-parser';
import path from 'path';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Be more specific in production
        methods: ["GET", "POST"]
    }
});

const PORT = 8000;
const __dirname = path.resolve();

// Middleware
app.use(bodyParser.json());

// Email to Socket Mappings
const emailToSocketMapping = new Map();
const socketToEmailMapping = new Map();

// Socket.io Connection Handling
io.on('connection', (socket) => {
    console.log("New connection established");

    socket.on('join-room', data => {
        const { roomId, emailId } = data;
        console.log(`User: ${emailId} joined room: ${roomId}`);

        emailToSocketMapping.set(emailId, socket.id);
        socketToEmailMapping.set(socket.id, emailId);

        socket.join(roomId);
        socket.emit('joined-room', { roomId, emailId });
        socket.broadcast.to(roomId).emit('user-joined', { roomId, emailId });
    });

    socket.on('call-user', data => {
        const { emailId, offer } = data;
        const socketId = emailToSocketMapping.get(emailId);
        const fromEmail = socketToEmailMapping.get(socket.id);

        socket.to(socketId).emit('incoming-call', {
            from: { emailId: fromEmail },
            offer
        });
    });

    socket.on('call-accepted', data => {
        const { emailId, answer } = data;
        const socketId = emailToSocketMapping.get(emailId);
        const respondingUser = socketToEmailMapping.get(socket.id);

        console.log(`Call accepted by: ${respondingUser} to ${emailId}`);
        socket.to(socketId).emit('call-accepted', {
            emailId: respondingUser,
            answer
        });
    });

    socket.on('disconnect', () => {
        const emailId = socketToEmailMapping.get(socket.id);
        if (emailId) {
            emailToSocketMapping.delete(emailId);
            socketToEmailMapping.delete(socket.id);
            console.log(`User ${emailId} disconnected`);
        }
    });
});

// Serve static files
app.use(express.static(path.join(__dirname, '../client/dist')));

// Catch-all route to serve the React app
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../client", "dist", "index.html"));
});

// Start server
httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});