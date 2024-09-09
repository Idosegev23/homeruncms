import axios from 'axios';
import { format, isAfter, isBefore, setHours, setMinutes, addDays } from 'date-fns';

const instanceId = process.env.NEXT_PUBLIC_WHATSAPP_ID_INSTANCE;
const apiToken = process.env.NEXT_PUBLIC_WHATSAPP_API_TOKEN_INSTANCE;
const apiUrl = process.env.NEXT_PUBLIC_GREENAPI_API_URL;
const mediaUrl = process.env.NEXT_PUBLIC_GREENAPI_MEDIA_URL;

const CACHE_DURATION = 5 * 60 * 1000; // 5 דקות במילישניות
let cache = {
  incomingMessages: null,
  outgoingMessages: null,
  lastFetch: {
    incomingMessages: 0,
    outgoingMessages: 0
  }
};

let dailyMessageCount = 0;
let lastResetDate = new Date().toDateString();
let messageQueue = [];
let isProcessingQueue = false;

const getMessage = async (chatId, idMessage) => {
  try {
    const response = await axios.post(
      `${apiUrl}/waInstance${instanceId}/getMessage/${apiToken}`,
      { chatId, idMessage }
    );
    return response.data;
  } catch (error) {
    console.error('Error getting message:', error);
    throw error;
  }
};

const getCachedData = async (key, fetchFunction) => {
  const now = Date.now();
  if (!cache[key] || now - cache.lastFetch[key] > CACHE_DURATION) {
    try {
      const data = await fetchFunction();
      cache[key] = data;
      cache.lastFetch[key] = now;
    } catch (error) {
      console.error(`Error fetching ${key}:`, error);
      throw error;
    }
  }
  return cache[key];
};

const resetDailyCount = () => {
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    dailyMessageCount = 0;
    lastResetDate = today;
  }
};

const isValidSendTime = (date) => {
  const hour = date.getHours();
  const day = date.getDay();

  if (day === 5 && hour >= 14) return false; // Friday after 2 PM
  if (day === 6) return false; // Saturday
  if (hour < 8 || hour >= 20) return false;

  return true;
};

const getNextValidSendTime = (date) => {
  let nextDate = new Date(date);
  while (!isValidSendTime(nextDate)) {
    nextDate = addDays(nextDate, 1);
    nextDate = setHours(nextDate, 8);
    nextDate = setMinutes(nextDate, 0);
  }
  return nextDate;
};

const processQueue = async () => {
  if (isProcessingQueue || messageQueue.length === 0) return;

  isProcessingQueue = true;
  while (messageQueue.length > 0) {
    const { chatId, message, immediate } = messageQueue[0];
    const now = new Date();

    if (immediate || (isValidSendTime(now) && dailyMessageCount < 200)) {
      try {
        await greenApi.sendMessage(chatId, message);
        messageQueue.shift();
        localStorage.setItem('messageQueue', JSON.stringify(messageQueue));
        
        await new Promise(resolve => setTimeout(resolve, 15000));
        
      } catch (error) {
        console.error('Error sending message from queue:', error);
        messageQueue.push(messageQueue.shift());
        await new Promise(resolve => setTimeout(resolve, 60000));
      }
    } else {
      const nextValidTime = getNextValidSendTime(now);
      const waitTime = nextValidTime.getTime() - now.getTime();
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  isProcessingQueue = false;
};

const formatPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) {
    console.error('Invalid phone number:', phoneNumber);
    return '';
  }

  const cleaned = phoneNumber.toString().replace(/\D/g, '');
  if (cleaned.startsWith('972')) {
    return cleaned;
  }
  return `972${cleaned}`;
};

const greenApi = {
  sendMessage: async (phoneNumber, message) => {
    console.log(`Attempting to send message to ${phoneNumber}`);
    resetDailyCount();
    if (dailyMessageCount >= 200) {
      throw new Error("Daily message limit reached");
    }
    try {
      const chatId = `${formatPhoneNumber(phoneNumber)}@c.us`;
      const response = await axios.post(
        `${apiUrl}/waInstance${instanceId}/sendMessage/${apiToken}`,
        { chatId, message }
      );
      dailyMessageCount++;
      console.log(`Message sent successfully to ${phoneNumber}`);
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },

  sendFile: async (chatId, filePath, filename, caption) => {
    resetDailyCount();
    if (dailyMessageCount >= 200) {
      throw new Error("Daily message limit reached");
    }

    try {
      const formData = new FormData();
      formData.append('chatId', chatId);
      formData.append('file', filePath);
      if (filename) formData.append('filename', filename);
      if (caption) formData.append('caption', caption);

      const response = await axios.post(
        `${mediaUrl}/waInstance${instanceId}/sendFileByUpload/${apiToken}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      dailyMessageCount++;
      return response.data;
    } catch (error) {
      console.error('Error sending file:', error);
      throw error;
    }
  },

  getChatHistory: async (chatId, count = 100) => {
    try {
      const response = await axios.post(
        `${apiUrl}/waInstance${instanceId}/getChatHistory/${apiToken}`,
        { chatId, count }
      );
      return response.data;
    } catch (error) {
      console.error('Error getting chat history:', error);
      throw error;
    }
  },

  receiveNotification: async () => {
    try {
      const response = await axios.get(
        `${apiUrl}/waInstance${instanceId}/receiveNotification/${apiToken}`
      );
      
      if (response.data) {
        console.log('Notification received:', response.data);
        return response.data;
      } else {
        console.log('No new notifications.');
        return null;
      }
    } catch (error) {
      console.error('Error receiving notification:', error);
      throw error;
    }
  },

  deleteNotification: async (receiptId) => {
    try {
      const response = await axios.delete(
        `${apiUrl}/waInstance${instanceId}/deleteNotification/${apiToken}/${receiptId}`
      );
      return response.data;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  },
  
  // הוספת השהייה של שנייה לפני כל קריאה ל-API
  getLastIncomingMessages: async (minutes = 1440) => {
    return getCachedData('incomingMessages', async () => {
      try {
        await greenApi.delay(5000); // השהייה של שנייה בין הקריאות
        const response = await axios.get(
          `${apiUrl}/waInstance${instanceId}/lastIncomingMessages/${apiToken}`,
          { params: { minutes } }
        );
        return response.data;
      } catch (error) {
        console.error('Error getting last incoming messages:', error);
        throw error;
      }
    });
  },

  getLastOutgoingMessages: async (minutes = 1440) => {
    return getCachedData('outgoingMessages', async () => {
      try {
        await greenApi.delay(5000); // השהייה של שנייה בין הקריאות
        const response = await axios.get(
          `${apiUrl}/waInstance${instanceId}/lastOutgoingMessages/${apiToken}`,
          { params: { minutes } }
        );
        return response.data;
      } catch (error) {
        console.error('Error getting last outgoing messages:', error);
        throw error;
      }
    });
  },

  // פונקציית עזר להשהייה
  delay: async (ms) => new Promise((resolve) => setTimeout(resolve, ms)),

  addToQueue: (phoneNumber, message, immediate = false) => {
    const chatId = `${formatPhoneNumber(phoneNumber)}@c.us`;
    messageQueue.push({ chatId, message, immediate });
    localStorage.setItem('messageQueue', JSON.stringify(messageQueue));
    console.log(`Message added to queue for ${chatId}: ${message}`);
    if (!isProcessingQueue) {
      processQueue();
    }
  },

  getQueueLength: () => messageQueue.length,
  getQueue: () => messageQueue,
  removeFromQueue: (index) => {
    messageQueue.splice(index, 1);
    localStorage.setItem('messageQueue', JSON.stringify(messageQueue));
  },
  updateQueueItem: (index, newMessage) => {
    if (index >= 0 && index < messageQueue.length) {
      messageQueue[index].message = newMessage;
      localStorage.setItem('messageQueue', JSON.stringify(messageQueue));
    }
  },
  getMessageStats: () => {
    return {
      dailyCount: dailyMessageCount,
      queueLength: messageQueue.length
    };
  },

  getNextValidSendTime,
  sendNow: async (chatId, message) => {
    console.log(`Sending message immediately to ${chatId}`);
    try {
      const response = await axios.post(
        `${apiUrl}/waInstance${instanceId}/sendMessage/${apiToken}`,
        { chatId, message }
      );
      console.log(`Message sent successfully to ${chatId}`);
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },

  scheduleMessage: async (chatId, message, scheduledTime) => {
    const now = new Date();
    if (scheduledTime <= now) {
      throw new Error("Scheduled time must be in the future");
    }

    const timeToWait = scheduledTime.getTime() - now.getTime();
    
    setTimeout(async () => {
      try {
        await greenApi.sendMessage(chatId, message);
        console.log(`Scheduled message sent to ${chatId}`);
      } catch (error) {
        console.error(`Failed to send scheduled message to ${chatId}:`, error);
      }
    }, timeToWait);

    return { status: 'scheduled', scheduledTime };
  },

  isValidSendTime,
  formatPhoneNumber,
  processQueue,
  chatId: (phoneNumber) => `${formatPhoneNumber(phoneNumber)}@c.us`,
  clearCache: () => {
    cache = {
      incomingMessages: null,
      outgoingMessages: null,
      lastFetch: {
        incomingMessages: 0,
        outgoingMessages: 0
      }
    };
    console.log('Cache cleared');
  },

  getMessage
};

export default greenApi;
