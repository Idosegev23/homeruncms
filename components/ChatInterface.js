import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import axios from 'axios';
import greenApi from '../utils/greenApi';

export default function ChatInterface() {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const listRef = useRef(null);

  // גלילה אוטומטית לסוף הצ'אט
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // טעינת כל הלקוחות
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        setIsLoading(true);
        // קבל את כל הלקוחות מה-API
        const response = await axios.get('/api/customers');
        let allCustomers = response.data;

        // הוסף מידע נוסף לכל ��קוח
        const customersWithInfo = await Promise.all(
          allCustomers.map(async (customer) => {
            const chatId = greenApi.formatPhoneNumber(customer.phone) + "@c.us";
            let customerInfo = {
              ...customer,
              chatId,
              avatar: null,
              lastMessageTime: 0,
              lastMessage: "",
              hasChat: false
            };

            try {
              // נסה לקבל את ההיסטוריה של הלקוח
              const history = await greenApi.getChatHistory(chatId, 1);
              if (history && history.length > 0) {
                customerInfo.lastMessageTime = history[0].timestamp;
                customerInfo.lastMessage = history[0].textMessage || "מדיה";
                customerInfo.hasChat = true;
              }

              // נסה לקבל תמונת פרופיל
              const avatar = await greenApi.getAvatar(chatId);
              if (avatar) {
                customerInfo.avatar = avatar;
              }
            } catch (error) {
              // אם יש שגיאה בקבלת המידע, נמשיך עם המידע הבסיסי
              console.log(`לא ניתן לקבל מידע נוסף עבור ${customer.name}:`, error);
            }

            return customerInfo;
          })
        );

        // מיין את הלקוחות
        const sortedCustomers = customersWithInfo.sort((a, b) => {
          if (a.hasChat && !b.hasChat) return -1;
          if (!a.hasChat && b.hasChat) return 1;
          if (a.hasChat && b.hasChat) return b.lastMessageTime - a.lastMessageTime;
          return a.name.localeCompare(b.name);
        });

        setCustomers(sortedCustomers);
        setFilteredCustomers(sortedCustomers);
      } catch (error) {
        console.error("שגיאה בטעינת לקוחות:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCustomers();
    // רענן כל 5 דקות
    const interval = setInterval(loadCustomers, 300000);
    return () => clearInterval(interval);
  }, []);

  // חיפוש לקוחות
  const handleSearch = (term) => {
    setSearchTerm(term);
    if (!term.trim()) {
      setFilteredCustomers(customers);
      return;
    }

    const searchTerms = term.toLowerCase().split(' ');
    const filtered = customers.filter(customer => {
      const searchText = `${customer.name} ${customer.phone} ${customer.email || ''} ${customer.notes || ''}`.toLowerCase();
      return searchTerms.every(term => searchText.includes(term));
    });
    setFilteredCustomers(filtered);
  };

  // רינדור רשימת הלקוחות
  const renderCustomerList = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b bg-white sticky top-0 z-10">
        <h2 className="text-xl font-semibold mb-3">צ'אטים</h2>
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="חיפוש לפי שם, טלפון או הערות..."
            className="w-full p-3 pl-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-gray-50"
            dir="rtl"
          />
          <svg
            className="absolute right-3 top-3 h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      <div
        ref={listRef}
        className="flex-1 overflow-y-auto custom-scrollbar"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#CBD5E0 #F7FAFC'
        }}
      >
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center p-4 text-gray-500">
            לא נמצאו לקוחות
          </div>
        ) : (
          filteredCustomers.map((customer) => (
            <div
              key={customer.chatId}
              onClick={() => setSelectedChat(customer)}
              className={`flex items-center p-4 hover:bg-gray-50 cursor-pointer transition-colors duration-150 ${
                selectedChat?.chatId === customer.chatId ? 'bg-amber-50' : ''
              }`}
            >
              <div className="relative w-12 h-12 flex-shrink-0">
                {customer.avatar ? (
                  <Image
                    src={customer.avatar}
                    alt={customer.name}
                    layout="fill"
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-lg font-medium">
                      {customer.name[0].toUpperCase()}
                    </span>
                  </div>
                )}
                {customer.hasChat && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
                )}
              </div>

              <div className="mr-4 flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <h3 className="font-medium truncate">{customer.name}</h3>
                  {customer.lastMessageTime > 0 && (
                    <span className="text-xs text-gray-500 flex-shrink-0 mr-2">
                      {new Date(customer.lastMessageTime * 1000).toLocaleDateString('he-IL', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-start">
                  <p className="text-sm text-gray-500 truncate">
                    {customer.lastMessage || customer.phone}
                  </p>
                  {customer.hasChat && !customer.lastMessage && (
                    <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full mr-2">
                      התכתבות קיימת
                    </span>
                  )}
                </div>
                {customer.notes && (
                  <p className="text-xs text-gray-400 truncate mt-1">
                    {customer.notes}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  // טיפול בהודעות נכנסות
  useEffect(() => {
    const handleIncomingMessage = async () => {
      try {
        const notification = await greenApi.receiveNotification();
        if (notification) {
          // מחיקת ההתראה
          await greenApi.deleteNotification(notification.receiptId);

          // אם זו הודעה חדשה
          if (notification.body.typeWebhook === "incomingMessageReceived") {
            const { senderData, messageData } = notification.body;
            
            // אם זה הצ'אט הנוכחי, הוסף את ההודעה
            if (selectedChat?.id === senderData.chatId) {
              setMessages(prev => [...prev, {
                id: notification.body.idMessage,
                type: "incoming",
                ...messageData,
                timestamp: notification.body.timestamp
              }]);
            }

            // סמן את הצ'אט כנקרא
            await greenApi.readChat(senderData.chatId);
          }
        }
      } catch (error) {
        console.error("שגיאה בטיפול בהודעה נכנסת:", error);
      }
    };

    const interval = setInterval(handleIncomingMessage, 5000);
    return () => clearInterval(interval);
  }, [selectedChat]);

  // טעינת היסטוריית צ'אט
  useEffect(() => {
    const loadChatHistory = async () => {
      if (!selectedChat) return;

      setIsLoading(true);
      try {
        const history = await greenApi.getFullChatHistory(selectedChat.id);
        setMessages(history);
      } catch (error) {
        console.error("שגיאה בטעינת היסטוריית צ'אט:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadChatHistory();
  }, [selectedChat]);

  // שליחת הודעה
  const handleSendMessage = async () => {
    if (!selectedChat || (!newMessage.trim() && !selectedFile)) return;

    try {
      if (selectedFile) {
        await greenApi.sendFile(selectedChat.id, selectedFile, newMessage);
        setSelectedFile(null);
      } else {
        await greenApi.sendMessage(selectedChat.id, newMessage);
      }
      
      setNewMessage('');
      
      // הוסף את ההודעה לרשימה המקומית
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: "outgoing",
        textMessage: newMessage,
        timestamp: Math.floor(Date.now() / 1000)
      }]);
    } catch (error) {
      console.error("שגיאה בשליחת הודעה:", error);
    }
  };

  // טיפול בבחירת קובץ
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  // הצגת מדיה
  const renderMedia = (message) => {
    if (message.fileMessageData) {
      const { downloadUrl, caption, mimeType } = message.fileMessageData;
      
      if (mimeType.startsWith('image/')) {
        return (
          <div className="relative">
            <Image
              src={downloadUrl}
              alt={caption || 'תמונה'}
              width={300}
              height={200}
              className="rounded-lg"
              objectFit="contain"
            />
            {caption && <p className="mt-2 text-sm">{caption}</p>}
          </div>
        );
      }
      
      if (mimeType.startsWith('video/')) {
        return (
          <div>
            <video controls className="rounded-lg max-w-full">
              <source src={downloadUrl} type={mimeType} />
              הדפדפן שלך ל�� תומך בתגית וידאו.
            </video>
            {caption && <p className="mt-2 text-sm">{caption}</p>}
          </div>
        );
      }
      
      if (mimeType.startsWith('audio/')) {
        return (
          <div>
            <audio controls className="w-full">
              <source src={downloadUrl} type={mimeType} />
              הדפדפן שלך לא תומך בתגית אודיו.
            </audio>
            {caption && <p className="mt-2 text-sm">{caption}</p>}
          </div>
        );
      }
      
      // קבצים אחרים
      return (
        <div className="flex items-center space-x-2">
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>{message.fileMessageData.fileName}</span>
          </a>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* רשימת לקוחות */}
      <div className="w-1/4 bg-white border-l">
        {renderCustomerList()}
      </div>

      {/* אזור הצ'אט */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            {/* כותרת הצ'אט */}
            <div className="p-4 bg-white border-b flex items-center">
              <div className="relative w-10 h-10">
                {selectedChat.avatar ? (
                  <Image
                    src={selectedChat.avatar}
                    alt={selectedChat.name}
                    layout="fill"
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 bg-amber-200 rounded-full flex items-center justify-center">
                    <span className="text-amber-800">
                      {selectedChat.name?.[0] || '?'}
                    </span>
                  </div>
                )}
              </div>
              <div className="mr-4">
                <h2 className="font-medium">{selectedChat.name}</h2>
                <p className="text-sm text-gray-500">
                  {selectedChat.status || 'לא מקוון'}
                </p>
              </div>
            </div>

            {/* אזור ההודעות */}
            <div className="flex-1 overflow-y-auto p-4 bg-[#E5DDD5]">
              {isLoading ? (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.type === 'outgoing' ? 'justify-end' : 'justify-start'
                    } mb-4`}
                  >
                    <div
                      className={`max-w-[70%] p-3 rounded-lg ${
                        message.type === 'outgoing'
                          ? 'bg-[#DCF8C6]'
                          : 'bg-white'
                      }`}
                    >
                      {renderMedia(message)}
                      {message.textMessage && (
                        <p className="text-gray-800">{message.textMessage}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1 text-left">
                        {new Date(message.timestamp * 1000).toLocaleTimeString('he-IL')}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* אזור שליחת הודעות */}
            <div className="p-4 bg-white border-t">
              <div className="flex items-center space-x-4 space-x-reverse">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-gray-500 hover:text-amber-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*,video/*,audio/*,application/*"
                />
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="הקלד הודעה..."
                  className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  dir="rtl"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() && !selectedFile}
                  className="p-2 text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
              {selectedFile && (
                <div className="mt-2 p-2 bg-gray-100 rounded-lg flex items-center justify-between">
                  <span className="text-sm">{selectedFile.name}</span>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <h3 className="text-xl font-medium text-gray-900">בחר צ'אט להתחלת שיחה</h3>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 