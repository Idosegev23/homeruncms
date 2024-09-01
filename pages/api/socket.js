// pages/api/socket.js
import { Server } from 'socket.io';

export const config = {
  api: {
    bodyParser: false,
  },
};

const SocketHandler = (req, res) => {
  if (!res.socket.server.io) {
    console.log('*First use, starting socket.io');

    const io = new Server(res.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
    });

    io.on('connection', (socket) => {
      console.log('New client connected');
      
      socket.on('message', (data) => {
        console.log('Message received on server:', data);
        // Broadcast the message to all connected clients
        io.emit('message', data);
      });

      socket.on('incomingMessage', (data) => {
        console.log('Incoming message received on server:', data);
        io.emit('message', {
          type: 'new_message',
          message: {
            ...data,
            type: 'incoming'
          }
        });
      });
      
      socket.on('disconnect', () => {
        console.log('Client disconnected');
      });
    });

    res.socket.server.io = io;
  } else {
    console.log('socket.io already running');
  }
  res.end();
};

export default SocketHandler;