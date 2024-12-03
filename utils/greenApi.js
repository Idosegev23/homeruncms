import axios from 'axios';
import { format, isAfter, isBefore, setHours, setMinutes, addDays, getDay } from 'date-fns';
import { he } from 'date-fns/locale';

const API_URL = process.env.NEXT_PUBLIC_GREENAPI_API_URL;
const idInstance = process.env.NEXT_PUBLIC_WHATSAPP_ID_INSTANCE;
const apiTokenInstance = process.env.NEXT_PUBLIC_WHATSAPP_API_TOKEN_INSTANCE;

// עזרה בפורמט מספרי טלפון
const formatPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return '';
  
  // הסר תווים שאינם ספרות
  const cleaned = phoneNumber.toString().replace(/\D/g, '');
  
  // אם המספר מתחיל ב-972, השאר אותו כמו שהוא
  if (cleaned.startsWith('972')) {
    return cleaned;
  }
  
  // אם המספר מתחיל ב-0, הסר אותו והוסף 972
  if (cleaned.startsWith('0')) {
    return `972${cleaned.slice(1)}`;
  }
  
  // אחרת, הוסף 972 בהתחלה
  return `972${cleaned}`;
};

class GreenAPI {
  constructor() {
    this.messageStats = {
      dailyCount: 0,
      totalCount: 0,
      lastReset: new Date().setHours(0, 0, 0, 0)
    };

    this.messageQueue = [];
    this.isProcessing = false;

    this.cache = {
      incomingMessages: null,
      outgoingMessages: null,
      lastFetch: {
        incomingMessages: 0,
        outgoingMessages: 0
      }
    };

    // טעינת סטטיסטיקות והודעות בתור מ-localStorage
    if (typeof window !== 'undefined') {
      const savedStats = localStorage.getItem('messageStats');
      if (savedStats) {
        const parsedStats = JSON.parse(savedStats);
        const today = new Date().setHours(0, 0, 0, 0);
        if (today > parsedStats.lastReset) {
          parsedStats.dailyCount = 0;
          parsedStats.lastReset = today;
        }
        this.messageStats = parsedStats;
      }

      const savedQueue = localStorage.getItem('messageQueue');
      if (savedQueue) {
        this.messageQueue = JSON.parse(savedQueue);
        this.processQueue();
      }
    }
  }

  formatPhoneNumber(phoneNumber) {
    return formatPhoneNumber(phoneNumber);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  _updateMessageStats() {
    this.messageStats.dailyCount++;
    this.messageStats.totalCount++;
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('messageStats', JSON.stringify(this.messageStats));
    }
  }

  async getMessageStats() {
    const today = new Date().setHours(0, 0, 0, 0);
    if (today > this.messageStats.lastReset) {
      this.messageStats.dailyCount = 0;
      this.messageStats.lastReset = today;
      if (typeof window !== 'undefined') {
        localStorage.setItem('messageStats', JSON.stringify(this.messageStats));
      }
    }

    return {
      dailyCount: this.messageStats.dailyCount,
      totalCount: this.messageStats.totalCount,
      lastReset: this.messageStats.lastReset
    };
  }

  async receiveNotification() {
    try {
      const response = await axios.get(
        `${API_URL}/waInstance${idInstance}/receiveNotification/${apiTokenInstance}`
      );
      return response.data;
    } catch (error) {
      console.error('Error receiving notification:', error);
      throw error;
    }
  }

  async deleteNotification(receiptId) {
    try {
      const response = await axios.delete(
        `${API_URL}/waInstance${idInstance}/deleteNotification/${apiTokenInstance}/${receiptId}`
      );
      return response.data;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  async sendMessage(chatId, message) {
    try {
      const formattedChatId = chatId.includes('@') ? 
        chatId : 
        `${this.formatPhoneNumber(chatId)}@c.us`;

      const response = await axios.post(
        `${API_URL}/waInstance${idInstance}/sendMessage/${apiTokenInstance}`,
        {
          chatId: formattedChatId,
          message
        }
      );

      if (response.data.status === 'sent' || response.data.status === 'queued') {
        await this._updateMessageStats();
      }

      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async sendFile(chatId, file, caption = '') {
    try {
      const formattedChatId = chatId.includes('@') ? 
        chatId : 
        `${this.formatPhoneNumber(chatId)}@c.us`;

      // יצירת FormData
      const formData = new FormData();
      formData.append('chatId', formattedChatId);
      formData.append('file', file);
      
      // הוספת שם הקובץ
      const fileName = file.name || 'file.' + file.type.split('/')[1];
      formData.append('fileName', fileName);
      
      // הוספת כיתוב אם יש
      if (caption) {
        formData.append('caption', caption);
      }

      // שליחת הקובץ
      const response = await axios.post(
        `https://media.green-api.com/waInstance${idInstance}/sendFileByUpload/${apiTokenInstance}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      // עדכון סטטיסטיקות
      if (response.data.status === 'sent' || response.data.status === 'queued') {
        await this._updateMessageStats();
      }

      return response.data;
    } catch (error) {
      console.error('Error sending file:', error);
      throw error;
    }
  }

  async getChatHistory(chatId, count = 100) {
    try {
      const formattedChatId = chatId.includes('@') ? 
        chatId : 
        `${this.formatPhoneNumber(chatId)}@c.us`;

      const response = await axios.post(
        `${API_URL}/waInstance${idInstance}/getChatHistory/${apiTokenInstance}`,
        {
          chatId: formattedChatId,
          count
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error getting chat history:', error);
      throw error;
    }
  }

  async getMessage(chatId, messageId) {
    try {
      const formattedChatId = chatId.includes('@') ? 
        chatId : 
        `${this.formatPhoneNumber(chatId)}@c.us`;

      const response = await axios.post(
        `${API_URL}/waInstance${idInstance}/getMessage/${apiTokenInstance}`,
        {
          chatId: formattedChatId,
          idMessage: messageId
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error getting message:', error);
      throw error;
    }
  }

  async getLastIncomingMessages(minutes = 1440) {
    try {
      const response = await axios.get(
        `${API_URL}/waInstance${idInstance}/lastIncomingMessages/${apiTokenInstance}`,
        {
          params: { minutes }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error getting last incoming messages:', error);
      throw error;
    }
  }

  async getLastOutgoingMessages(minutes = 1440) {
    try {
      const response = await axios.get(
        `${API_URL}/waInstance${idInstance}/lastOutgoingMessages/${apiTokenInstance}`,
        {
          params: { minutes }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error getting last outgoing messages:', error);
      throw error;
    }
  }

  // ניהול תור הודעות
  getQueue() {
    return this.messageQueue;
  }

  getQueueLength() {
    return this.messageQueue.length;
  }

  addToQueue(chatId, message, type = 'text', file = null, caption = '', quotedMessageId = null) {
    const formattedChatId = chatId.includes('@') ? 
      chatId : 
      `${this.formatPhoneNumber(chatId)}@c.us`;

    this.messageQueue.push({
      chatId: formattedChatId,
      message,
      type,
      file,
      caption,
      quotedMessageId,
      timestamp: new Date().getTime()
    });

    if (typeof window !== 'undefined') {
      localStorage.setItem('messageQueue', JSON.stringify(this.messageQueue));
    }

    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  removeFromQueue(index) {
    if (index >= 0 && index < this.messageQueue.length) {
      this.messageQueue.splice(index, 1);
      if (typeof window !== 'undefined') {
        localStorage.setItem('messageQueue', JSON.stringify(this.messageQueue));
      }
    }
  }

  async processQueue() {
    if (this.isProcessing || this.messageQueue.length === 0) return;
    
    this.isProcessing = true;
    
    try {
      while (this.messageQueue.length > 0) {
        const { chatId, message, type, file, caption, quotedMessageId } = this.messageQueue[0];
        
        switch (type) {
          case 'text':
            await this.sendMessage(chatId, message);
            break;
          case 'file':
            await this.sendFile(chatId, file, caption);
            break;
          case 'quoted':
            await this.sendQuotedMessage(chatId, message, quotedMessageId);
            break;
          default:
            console.warn(`Unknown message type: ${type}`);
        }
        
        this.messageQueue.shift();
        if (typeof window !== 'undefined') {
          localStorage.setItem('messageQueue', JSON.stringify(this.messageQueue));
        }
        
        // המתן קצת בין הודעות
        await this.delay(1000);
      }
    } catch (error) {
      console.error('Error processing message queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  // פונקציות נוספות
  async sendQuotedMessage(chatId, message, quotedMessageId) {
    try {
      const formattedChatId = chatId.includes('@') ? 
        chatId : 
        `${this.formatPhoneNumber(chatId)}@c.us`;

      const response = await axios.post(
        `${API_URL}/waInstance${idInstance}/sendMessage/${apiTokenInstance}`,
        {
          chatId: formattedChatId,
          message,
          quotedMessageId
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error sending quoted message:', error);
      throw error;
    }
  }

  async getActiveChats() {
    try {
      const response = await axios.get(
        `${API_URL}/waInstance${idInstance}/getChats/${apiTokenInstance}`
      );
      return response.data;
    } catch (error) {
      console.error('Error getting active chats:', error);
      throw error;
    }
  }

  async getChatInfo(chatId) {
    try {
      const formattedChatId = chatId.includes('@') ? 
        chatId : 
        `${this.formatPhoneNumber(chatId)}@c.us`;

      const response = await axios.post(
        `${API_URL}/waInstance${idInstance}/getChatInfo/${apiTokenInstance}`,
        { chatId: formattedChatId }
      );
      return response.data;
    } catch (error) {
      console.error('Error getting chat info:', error);
      throw error;
    }
  }

  async getAvatar(chatId) {
    try {
      const formattedChatId = chatId.includes('@') ? 
        chatId : 
        `${this.formatPhoneNumber(chatId)}@c.us`;

      const response = await axios.post(
        `${API_URL}/waInstance${idInstance}/getAvatar/${apiTokenInstance}`,
        { chatId: formattedChatId }
      );
      return response.data;
    } catch (error) {
      console.error('Error getting avatar:', error);
      return null;
    }
  }

  async checkWhatsApp(phoneNumber) {
    try {
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      const response = await axios.post(
        `${API_URL}/waInstance${idInstance}/checkWhatsapp/${apiTokenInstance}`,
        { phoneNumber: formattedPhone }
      );
      return response.data.existsWhatsapp;
    } catch (error) {
      console.error('Error checking WhatsApp:', error);
      return false;
    }
  }

  async readChat(chatId) {
    try {
      const formattedChatId = chatId.includes('@') ? 
        chatId : 
        `${this.formatPhoneNumber(chatId)}@c.us`;

      const response = await axios.post(
        `${API_URL}/waInstance${idInstance}/readChat/${apiTokenInstance}`,
        { chatId: formattedChatId }
      );
      return response.data;
    } catch (error) {
      console.error('Error marking chat as read:', error);
      throw error;
    }
  }

  clearCache() {
    this.cache = {
      incomingMessages: null,
      outgoingMessages: null,
      lastFetch: {
        incomingMessages: 0,
        outgoingMessages: 0
      }
    };
    console.log('Cache cleared');
  }
}

// ייצוא מופע יחיד של הקלאס
const greenApi = new GreenAPI();
export { greenApi };
export default greenApi;
