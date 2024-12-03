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
  const [file, setFile] = useState(null);
  const chatRef = useRef(null);
  const fileInputRef = useRef(null);
  const [filePreview, setFilePreview] = useState(null);

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
    if ((!message.trim() && !file) || !selectedCustomer) return;

    setIsSending(true);
    try {
      let newMessage;
      const chatId = selectedCustomer.chatId || `${greenApi.formatPhoneNumber(selectedCustomer.Cell)}@c.us`;

      if (file) {
        const response = await greenApi.sendFile(chatId, file, message);
        newMessage = { 
          id: response.idMessage, 
          mediaUrl: response.urlFile,
          mediaType: file.type.includes('image') ? 'imageMessage' : file.type.includes('video') ? 'videoMessage' : 'document',
          caption: message,
          timestamp: Date.now() / 1000,
          chatId: chatId,
          type: 'outgoing',
          fileName: file.name
        };
        setFile(null);
        setFilePreview(null);
      } else {
        const response = await greenApi.sendMessage(chatId, message);
        newMessage = { 
          id: response.idMessage || Date.now(), 
          textMessage: message, 
          type: 'outgoing', 
          timestamp: Date.now() / 1000,
          chatId: chatId
        };
      }
      
      setChatHistory(prev => [...prev, newMessage]);
      setMessage('');

      setTimeout(() => {
        chatRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error('שגיאה בשליחת הודעה:', error);
      alert('שגיאה בשליחת ההודעה. נסה שוב.');
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

          // Update chat history directly
          if (selectedCustomer && incomingMessage.chatId === selectedCustomer.chatId) {
            setChatHistory(prevHistory => [incomingMessage, ...prevHistory]);

            // Scroll to the bottom to show the new message
            setTimeout(() => {
              chatRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          }

          // Clear the notification
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
      const sortedHistory = history.sort((a, b) => a.timestamp - b.timestamp);
      if (page === 1) {
        setChatHistory(sortedHistory);
      } else {
        setChatHistory(prevHistory => [...sortedHistory, ...prevHistory]);
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

  const LoadingIndicator = () => (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex justify-center items-center z-50">
      <div className="bg-black p-6 rounded-lg shadow-xl">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-yellow-500 mx-auto"></div>
        <p className="mt-4 text-lg font-semibold text-white">טוען נתונים...</p>
      </div>
    </div>
  );

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      
      // יצירת תצוגה מקדימה
      if (selectedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFilePreview({
            type: 'image',
            url: reader.result,
            name: selectedFile.name
          });
        };
        reader.readAsDataURL(selectedFile);
      } else if (selectedFile.type.startsWith('video/')) {
        setFilePreview({
          type: 'video',
          url: URL.createObjectURL(selectedFile),
          name: selectedFile.name
        });
      } else {
        setFilePreview({
          type: 'file',
          name: selectedFile.name,
          size: selectedFile.size
        });
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // מונע ירידת שורה
      handleSendMessage();
    }
  };

  return (
    <Layout>
      <div className="flex flex-col min-h-screen">
        <div className="flex-grow container mx-auto p-4">
          <div className="grid grid-cols-4 gap-4 h-[calc(100vh-16rem)]">
            {/* רשימת לקוחות */}
            <div className="col-span-1 bg-gray-800 rounded-lg p-4 overflow-y-auto">
              <h2 className="text-xl font-bold mb-4 text-yellow-500">לקוחות ({activeCustomers.length})</h2>
              <div className="space-y-2">
                {activeCustomers.map(customer => (
                  <div
                    key={customer.id}
                    onClick={() => handleCustomerSelect(customer)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedCustomer?.id === customer.id
                        ? 'bg-yellow-500 text-black'
                        : 'bg-gray-700 text-white hover:bg-gray-600'
                    }`}
                  >
                    <div className="font-semibold">{customer.First_name} {customer.Last_name}</div>
                    <div className="text-sm opacity-75">{customer.Cell}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* אזור הצ'אט */}
            <div className="col-span-3 bg-gray-800 rounded-lg flex flex-col">
              {selectedCustomer ? (
                <>
                  {/* כותרת */}
                  <div className="p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-yellow-500">
                      {selectedCustomer.First_name} {selectedCustomer.Last_name}
                    </h2>
                    <p className="text-sm text-gray-400">{selectedCustomer.Cell}</p>
                  </div>

                  {/* היסטוריית הודעות */}
                  <div className="flex-1 overflow-y-auto p-4">
                    <div className="flex flex-col space-y-4">
                      {chatHistory.map((msg, index) => (
                        <div
                          key={msg.id || index}
                          className={`flex ${msg.type === 'outgoing' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg p-3 ${
                              msg.type === 'outgoing'
                                ? 'bg-yellow-500 text-black'
                                : 'bg-gray-700 text-white'
                            }`}
                          >
                            {msg.mediaUrl && (
                              <div className="mb-2">
                                {msg.mediaType === 'imageMessage' && (
                                  <div className="space-y-2">
                                    <img
                                      src={msg.mediaUrl}
                                      alt="תמונה"
                                      className="rounded-lg max-h-64 w-auto"
                                    />
                                    {msg.caption && (
                                      <p className="text-sm opacity-90">{msg.caption}</p>
                                    )}
                                  </div>
                                )}
                                {msg.mediaType === 'videoMessage' && (
                                  <div className="space-y-2">
                                    <video
                                      src={msg.mediaUrl}
                                      controls
                                      className="rounded-lg max-h-64 w-auto"
                                    />
                                    {msg.caption && (
                                      <p className="text-sm opacity-90">{msg.caption}</p>
                                    )}
                                  </div>
                                )}
                                {msg.mediaType === 'document' && (
                                  <div className="space-y-2">
                                    <a
                                      href={msg.mediaUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 text-blue-400 hover:text-blue-300"
                                    >
                                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                      </svg>
                                      <span>{msg.fileName || 'פתח קובץ'}</span>
                                    </a>
                                    {msg.caption && (
                                      <p className="text-sm opacity-90">{msg.caption}</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                            {(!msg.mediaUrl && msg.textMessage) && (
                              <div className="whitespace-pre-wrap">
                                {msg.textMessage}
                              </div>
                            )}
                            <div className="text-xs opacity-75 mt-1">
                              {new Date(msg.timestamp * 1000).toLocaleTimeString('he-IL')}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div ref={chatRef} />
                  </div>

                  {/* תצוגה מקדימה של קובץ */}
                  {filePreview && (
                    <div className="p-4 border-t border-gray-700 bg-gray-900">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-yellow-500">תצוגה מקדימה:</h3>
                        <button
                          onClick={() => {
                            setFile(null);
                            setFilePreview(null);
                          }}
                          className="text-gray-400 hover:text-red-500"
                        >
                          ביטול
                        </button>
                      </div>
                      <div className="rounded-lg overflow-hidden">
                        {filePreview.type === 'image' && (
                          <img
                            src={filePreview.url}
                            alt="תצוגה מקדימה"
                            className="max-h-32 w-auto rounded-lg"
                          />
                        )}
                        {filePreview.type === 'video' && (
                          <video
                            src={filePreview.url}
                            controls
                            className="max-h-32 w-auto rounded-lg"
                          />
                        )}
                        {filePreview.type === 'file' && (
                          <div className="flex items-center gap-2 p-2 bg-gray-800 rounded-lg">
                            <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <div>
                              <p className="text-sm text-white">{filePreview.name}</p>
                              <p className="text-xs text-gray-400">
                                {(filePreview.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* תיבת שליחת הודעה */}
                  <div className="p-4 border-t border-gray-700 bg-gray-900">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="הקלד הודעה..."
                        className="flex-grow p-2 rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-yellow-500 focus:outline-none"
                      />
                      <input
                        type="file"
                        onChange={handleFileSelect}
                        className="hidden"
                        ref={fileInputRef}
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 rounded-lg bg-gray-800 text-yellow-500 hover:bg-gray-700"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                      </button>
                      <button
                        onClick={handleSendMessage}
                        disabled={isSending || (!message.trim() && !file)}
                        className={`p-2 rounded-lg ${
                          isSending || (!message.trim() && !file)
                            ? 'bg-gray-700 text-gray-400'
                            : 'bg-yellow-500 text-black hover:bg-yellow-600'
                        }`}
                      >
                        {isSending ? (
                          <svg className="w-6 h-6 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        ) : (
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-xl text-gray-500">בחר לקוח כדי להתחיל שיחה</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ChatInterface;