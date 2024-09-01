import React, { useState, useEffect, useRef, useCallback } from 'react';
import { fetchCustomers, fetchChatRecords } from '../../utils/airtable';
import greenApi from '../../utils/greenApi';
import Layout from '../../components/Layout';
import { debounce } from 'lodash';
import 'tailwindcss/tailwind.css';

const CUSTOMERS_PER_PAGE = 20;
const MESSAGES_PER_PAGE = 20;
const API_DELAY = 1000;
const RETRY_DELAY = 1000;
const MAX_RETRIES = 3;

const ChatInterface = () => {
  const [activeCustomers, setActiveCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [page, setPage] = useState(1);
  const [chatPage, setChatPage] = useState(1);
  const [file, setFile] = useState(null); // להוספת תמיכה בקבצים
  const chatRef = useRef(null);

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const fetchWithRetry = async (fetchFunction, retries = MAX_RETRIES) => {
    for (let i = 0; i < retries; i++) {
      try {
        return await fetchFunction();
      } catch (error) {
        console.log(`Attempt ${i + 1} failed. Error:`, error);
        if (i === retries - 1) throw error;
        console.log(`Retrying in ${RETRY_DELAY}ms...`);
        await delay(RETRY_DELAY);
      }
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSendMessage = useCallback(async () => {
    if ((message.trim() === '' && !file) || !selectedCustomer) return;

    setIsSending(true);
    try {
      let newMessage;
      if (file) {
        const response = await greenApi.sendFile(selectedCustomer.chatId, file);
        newMessage = { 
          id: response.idMessage, 
          mediaUrl: response.urlFile,
          mediaType: file.type.includes('image') ? 'imageMessage' : file.type.includes('video') ? 'videoMessage' : 'document',
          caption: message,
          timestamp: Date.now() / 1000,
          chatId: selectedCustomer.chatId,
          type: 'outgoing'
        };
        setFile(null);
      } else {
        await greenApi.sendNow(selectedCustomer.chatId, message);
        newMessage = { 
          id: Date.now(), 
          textMessage: message, 
          type: 'outgoing', 
          timestamp: Date.now() / 1000,
          chatId: selectedCustomer.chatId
        };
      }
      
      setChatHistory(prev => [newMessage, ...prev]);
      setMessage('');

      // גלילה לתחתית החלון כדי להציג את ההודעה החדשה
      setTimeout(() => {
        chatRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error('שגיאה בשליחת הודעה:', error);
    } finally {
      setIsSending(false);
    }
  }, [message, selectedCustomer, file]);

  const debouncedSendMessage = debounce(handleSendMessage, 300);

  useEffect(() => {
    let intervalId;

    const loadActiveCustomers = async () => {
      setIsLoading(true);
      try {
        const customersData = await fetchWithRetry(() => fetchCustomers());
        const chatsData = await fetchWithRetry(() => fetchChatRecords());
        const incomingMessages = await fetchWithRetry(() => greenApi.getLastIncomingMessages(1440));
        const outgoingMessages = await fetchWithRetry(() => greenApi.getLastOutgoingMessages(1440));

        const allChatIds = new Set([
          ...chatsData.map(chat => chat.chatid),
          ...incomingMessages.map(msg => msg.chatId),
          ...outgoingMessages.map(msg => msg.chatId)
        ]);

        const activeCustomersData = Array.from(allChatIds).map(chatId => {
          const cleanPhoneNumber = greenApi.formatPhoneNumber(chatId);
          const customer = customersData.find(cust => greenApi.formatPhoneNumber(cust.Cell) === cleanPhoneNumber);
          const chat = chatsData.find(chat => chat.chatid === chatId);
          
          const lastIncomingMessage = incomingMessages.find(msg => msg.chatId === chatId);
          const lastOutgoingMessage = outgoingMessages.find(msg => msg.chatId === chatId);

          return {
            id: customer?.id || chat?.id || chatId,
            First_name: customer?.First_name || chat?.First_name || "Unknown",
            Last_name: customer?.Last_name || chat?.Last_name || "Customer",
            Cell: cleanPhoneNumber || "Unknown",
            chatId: chatId,
            lastIncomingMessage,
            lastOutgoingMessage
          };
        });

        setActiveCustomers(activeCustomersData);
      } catch (error) {
        console.error('שגיאה בטעינת לקוחות או הודעות:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadActiveCustomers();

    const handleIncomingMessage = async () => {
      try {
        const notification = await greenApi.receiveNotification();
        if (notification && notification.body.typeWebhook === 'incomingMessageReceived') {
          const messageData = notification.body.messageData;
          const incomingMessage = {
            id: notification.body.idMessage,
            timestamp: notification.body.timestamp,
            chatId: notification.body.senderData.chatId
          };

          if (messageData.typeMessage === 'textMessage') {
            incomingMessage.textMessage = messageData.textMessageData.textMessage;
          } else if (messageData.typeMessage === 'imageMessage' || messageData.typeMessage === 'videoMessage') {
            incomingMessage.mediaType = messageData.typeMessage;
            incomingMessage.mediaUrl = messageData.fileMessageData.downloadUrl;
            incomingMessage.caption = messageData.fileMessageData.caption || '';
          } else if (messageData.typeMessage === 'documentMessage') {
            incomingMessage.mediaType = 'document';
            incomingMessage.mediaUrl = messageData.fileMessageData.downloadUrl;
            incomingMessage.fileName = messageData.fileMessageData.fileName || 'Document';
          } else if (messageData.typeMessage === 'audioMessage') {
            incomingMessage.mediaType = 'audio';
            incomingMessage.mediaUrl = messageData.fileMessageData.downloadUrl;
          }

          // עדכון היסטוריית הצ'אט באופן ישיר
          if (selectedCustomer && incomingMessage.chatId === selectedCustomer.chatId) {
            setChatHistory(prevHistory => [incomingMessage, ...prevHistory]);

            // גלילה לתחתית החלון כדי להציג את ההודעה החדשה
            setTimeout(() => {
              chatRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          }

          // ניקוי ההתראה
          await greenApi.deleteNotification(notification.receiptId);
        }
      } catch (error) {
        console.error('Error handling incoming message:', error);
      }
    };

    intervalId = setInterval(handleIncomingMessage, 5000);

    return () => {
      clearInterval(intervalId);
    };
  }, [selectedCustomer]);

  const loadChatHistory = useCallback(async (customer, page = 1) => {
    if (!customer) return;
    
    setIsLoadingHistory(true);
    try {
      const history = await fetchWithRetry(() => 
        greenApi.getChatHistory(customer.chatId, MESSAGES_PER_PAGE, (page - 1) * MESSAGES_PER_PAGE)
      );
      if (page === 1) {
        setChatHistory(history);
      } else {
        setChatHistory(prevHistory => [...history, ...prevHistory]);
      }
      setChatPage(page);
    } catch (error) {
      console.error('שגיאה בטעינת היסטוריית הצאט:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  const handleCustomerSelect = useCallback((customer) => {
    setSelectedCustomer(customer);
    setChatHistory([]);
    setChatPage(1);
    loadChatHistory(customer);
  }, [loadChatHistory]);

  const handleLoadMoreMessages = useCallback(() => {
    loadChatHistory(selectedCustomer, chatPage + 1);
  }, [selectedCustomer, chatPage, loadChatHistory]);

  const handleLoadMore = () => {
    setPage(prevPage => prevPage + 1);
  };

  return (
    <Layout>
      {isLoading ? (
        <div className="flex items-center justify-center h-screen" role="status" aria-live="polite">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-xl font-semibold">טוען נתונים...</p>
          </div>
        </div>
      ) : activeCustomers.length > 0 ? (
        <div className="flex h-screen antialiased text-gray-800">
          {/* רשימת לקוחות */}
          <div className="flex flex-col w-1/4 bg-white p-4 overflow-y-auto">
            <h2 className="text-lg font-semibold" id="customers-heading">לקוחות פעילים ({activeCustomers.length})</h2>
            <ul aria-labelledby="customers-heading" role="list">
              {activeCustomers.slice(0, page * CUSTOMERS_PER_PAGE).map(customer => (
                <li 
                  key={customer.id} 
                  onClick={() => handleCustomerSelect(customer)} 
                  className={`cursor-pointer hover:bg-gray-200 p-2 flex justify-between items-center ${selectedCustomer?.id === customer.id ? 'bg-blue-100' : ''}`}
                  role="button"
                  tabIndex="0"
                  aria-selected={selectedCustomer?.id === customer.id}
                >
                  <div>
                    <span>{customer.First_name} {customer.Last_name}</span>
                    <div className="text-sm text-gray-600">
                      {customer.lastIncomingMessage && `התקבלה: ${customer.lastIncomingMessage.textMessage}`}
                    </div>
                  </div>
                  <span className="text-sm text-gray-600">{customer.Cell}</span>
                </li>
              ))}
            </ul>
            {activeCustomers.length > page * CUSTOMERS_PER_PAGE && (
              <button onClick={handleLoadMore} className="mt-4 bg-blue-500 text-white rounded-lg p-2">
                טען עוד לקוחות
              </button>
            )}
          </div>
  
          {/* חלון צ'אט */}
          <div className="flex-grow flex flex-col p-4">
            {selectedCustomer ? (
              <>
                <div className="flex-grow p-4 bg-gray-100 rounded-lg overflow-y-auto flex flex-col-reverse" ref={chatRef}>
                  {isLoadingHistory && chatPage === 1 ? (
                    <div className="text-center">טוען היסטוריה...</div>
                  ) : (
                    <>
{chatHistory.map((msg, index) => (
  <div 
    key={index}
    className={`flex ${msg.type === 'outgoing' ? 'justify-end' : 'justify-start'} mb-4`}
  >
    <div 
      className={`p-3 rounded-lg max-w-xs ${
        msg.type === 'outgoing' 
          ? 'bg-black text-yellow-300' 
          : 'bg-yellow-500 text-black'
      }`}
    >
      {msg.textMessage && <p className="mb-1">{msg.textMessage}</p>}
      {msg.mediaUrl && msg.mediaType === 'imageMessage' && (
        <img src={msg.mediaUrl} alt="Image" className="mb-1 max-w-full h-auto" />
      )}
      {msg.mediaUrl && msg.mediaType === 'videoMessage' && (
        <video controls className="mb-1 max-w-full h-auto">
          <source src={msg.mediaUrl} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      )}
      {msg.mediaUrl && msg.mediaType === 'document' && (
        <a href={msg.mediaUrl} download={msg.fileName} className="text-blue-500 underline">
          {msg.fileName || 'Download Document'}
        </a>
      )}
      {msg.mediaUrl && msg.mediaType === 'audio' && (
        <audio controls className="mb-1 w-full">
          <source src={msg.mediaUrl} type="audio/mpeg" />
          Your browser does not support the audio element.
        </audio>
      )}
      {msg.caption && <p className="mt-1 text-sm">{msg.caption}</p>}
      <span className="text-xs opacity-75">
        {new Intl.DateTimeFormat('he-IL', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }).format(new Date(isNaN(msg.timestamp) ? Date.now() : Number(msg.timestamp) * 1000))}
      </span>
    </div>
  </div>
))}


                      {chatHistory.length >= MESSAGES_PER_PAGE * chatPage && (
                        <button 
                          onClick={handleLoadMoreMessages} 
                          className="w-full mb-4 bg-black text-yellow-300 rounded-lg p-2"
                          disabled={isLoadingHistory}
                        >
                          {isLoadingHistory ? 'טוען...' : 'טען הודעות נוספות'}
                        </button>
                      )}
                    </>
                  )}
                </div>
                <div className="p-4 bg-white flex items-center">
                  <input 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="flex-grow border rounded-lg p-2"
                    placeholder="הקלד הודעה..."
                    onKeyDown={(e) => e.key === 'Enter' ? debouncedSendMessage() : null}
                    aria-label="הקלד הודעה"
                  />
                  <input 
                    type="file" 
                    onChange={handleFileChange} 
                    className="mr-4 bg-blue-500 text-white rounded-lg p-2"
                  />
                  <button 
                    onClick={debouncedSendMessage} 
                    disabled={isSending}
                    className={`mr-4 bg-blue-500 text-white rounded-lg p-2 ${isSending ? 'opacity-50 cursor-not-allowed' : ''}`}
                    aria-busy={isSending}
                  >
                    שלח
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-xl text-gray-500">בחר לקוח כדי להתחיל שיחה</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-screen">
          <p className="text-xl text-red-500">לא ניתן לטעון את רשימת הלקוחות. אנא נסה שוב מאוחר יותר.</p>
        </div>
      )}
    </Layout>
  );
  
};

export default ChatInterface;
