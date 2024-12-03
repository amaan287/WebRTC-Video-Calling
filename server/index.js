import express from 'express';
import bodyParser from 'body-parser';
import { Server } from 'socket.io';

const io = new Server(
    {
        cors: true
    }
)
const app = express();
const expressPort = 8000;
const ioPort = 8001

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

})

//routes    

// Express port running 
app.listen(expressPort, () => {
    console.log(`Server is running on  http://localhost/${expressPort}`);
});
//io port running
io.listen(ioPort, () => {
    console.log(`Server is running on  http://localhost/${ioPort}`)
});