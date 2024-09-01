import { io } from 'socket.io-client';

let socket;

const getSocketUrl = () => {
  return process.env.NODE_ENV === 'production'
    ? 'https://homeruncms.vercel.app'
    : 'http://localhost:3000';
};

export const initializeSocket = async () => {
  if (!socket) {
    const socketUrl = getSocketUrl();
    
    // תחילה נאתחל את ה-API route
    await fetch('/api/socket');

    socket = io(socketUrl, {
      path: '/api/socket',
    });

    socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
  }
};

export const sendMessage = (message) => {
  if (socket && socket.connected) {
    socket.emit('message', message);
  } else {
    console.error('Socket is not connected. Message not sent.');
  }
};
export const sendIncomingMessage = (message) => {
    if (socket && socket.connected) {
      socket.emit('incomingMessage', message);
    } else {
      console.error('Socket is not connected. Incoming message not sent.');
    }
  };
  