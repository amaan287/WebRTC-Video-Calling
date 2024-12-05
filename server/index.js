import express from 'express';
import bodyParser from 'body-parser';
import { Server } from 'socket.io';
import path from 'path';
const io = new Server(
    {
        cors: true
    }
)
const app = express();
const expressPort = 8000;
const ioPort = 8001
const __dirname = path.resolve();

app.use(bodyParser.json());

const emailToSocketMapping = new Map()
const sockeytToEmailMapping = new Map()
// Socket.io
io.on('connection', (socket) => {
    console.log("New connection")
    socket.on('join-room', data => {
        const { roomId, emailId } = data
        console.log("User: ", emailId, "joined room: ", roomId)
        emailToSocketMapping.set(emailId, socket.id)
        sockeytToEmailMapping.set(socket.id, emailId)
        socket.join(roomId)
        socket.emit('joined-room', { roomId, emailId })
        socket.broadcast.to(roomId).emit('user-joined', { roomId, emailId })
    })

    socket.on('call-user', data => {
        const { emailId, offer } = data
        const socketId = emailToSocketMapping.get(emailId)
        const fromEmail = sockeytToEmailMapping.get(socket.id)
        socket.to(socketId).emit('incoming-call', { from: { emailId: fromEmail }, offer })

    })
    socket.on('call-accepted', data => {
        const { emailId, answer } = data
        const socketId = emailToSocketMapping.get(emailId)
        console.log("Call accepted by: ", sockeytToEmailMapping.get(socket.id), 'to', emailId)
        socket.to(socketId).emit('call-accepted', { emailId: sockeytToEmailMapping.get(socket.id), answer })

    })

})

//routes    
app.use(express.static(path.join(__dirname, '../client/dist')));
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../client", "dist", "index.html"));
});
// Express port running 
app.listen(expressPort, () => {
    console.log(`Server is running on  http://localhost/${expressPort}`);
});
//io port running
io.listen(ioPort, () => {
    console.log(`Server is running on  http://localhost/${ioPort}`)
});