import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import greenApi from '../../utils/greenApi';
import { fetchCustomers, deleteCustomer } from '../../utils/airtable';
import { FaReply, FaTrashAlt, FaEdit, FaSearch, FaCommentDots } from 'react-icons/fa';

const PAGE_SIZE = 10;  // מספר ההודעות בדף אחד

const IncomingMessages = () => {
  const [messages, setMessages] = useState({});
  const [loading, setLoading] = useState(false);
  const [replyingMessageId, setReplyingMessageId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [warning, setWarning] = useState('');
  const [customers, setCustomers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  const router = useRouter(); // hook לשימוש בניווט

  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const fetchedCustomers = await fetchCustomers();
        console.log('Loaded customers:', fetchedCustomers);
        setCustomers(fetchedCustomers);
      } catch (error) {
        console.error('Error loading customers:', error);
      }
    };

    loadCustomers();
  }, []);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const incomingMessages = await greenApi.getLastIncomingMessages(1440); // 1440 minutes = 24 hours
      console.log('Loaded messages:', incomingMessages);

      const groupedMessages = incomingMessages.reduce((acc, message) => {
        const phoneNumber = Number(extractPhoneNumber(message.chatId));
        if (!acc[phoneNumber]) {
          acc[phoneNumber] = [];
        }
        acc[phoneNumber].push(message);
        return acc;
      }, {});

      setMessages(groupedMessages);
    } catch (error) {
      console.error('Error loading incoming messages:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, []);

  const extractPhoneNumber = (chatId) => {
    const phoneNumber = Number(chatId.replace('972', '').replace('@c.us', ''));
    console.log('Extracted phone number:', phoneNumber);
    return phoneNumber;
  };

  const getCustomerName = (phoneNumber) => {
    const customer = customers.find(cust => cust.Cell === phoneNumber);
    if (customer) {
      console.log('Matched customer:', customer);
      return `${customer.First_name || ''} ${customer.Last_name || ''}`.trim();
    }
    console.log('No match found for phone number:', phoneNumber);
    return "לא ידוע";
  };

  const handleReplyClick = (message) => {
    setReplyingMessageId(message.idMessage);
    setReplyText('');
    setWarning('');
  };

  const handleSendReply = async (message) => {
    try {
      const isSendTimeValid = greenApi.isValidSendTime(new Date());

      if (!isSendTimeValid) {
        setWarning('הזמן הנוכחי אינו מתאים לשליחת הודעות. האם ברצונך לשלוח בכל זאת?');
      } else {
        await sendReply(message.senderId);
      }
    } catch (error) {
      console.error("Error sending reply:", error);
      alert("שגיאה בשליחת ההודעה.");
    }
  };

  const sendReply = async (senderId) => {
    try {
      const response = await greenApi.sendMessage(senderId, replyText);
      if (response.status === 'sent') {
        alert("ההודעה נשלחה בהצלחה!");
        setReplyingMessageId(null);
      }
    } catch (error) {
      console.error("Error sending reply:", error);
      alert("שגיאה בשליחת ההודעה.");
    }
  };

  const handleConfirmSendAnyway = async (message) => {
    try {
      const response = await greenApi.sendNow(message.senderId, replyText);
      if (response.status === 'sent') {
        alert("ההודעה נשלחה בהצלחה בכל מקרה!");
        setReplyingMessageId(null);
      }
    } catch (error) {
      console.error("Error sending reply immediately:", error);
      alert("שגיאה בשליחת ההודעה.");
    }
  };

  const handleCancelReply = () => {
    setReplyingMessageId(null);
  };

  const handleMarkAsUnread = (message) => {
    setReplyingMessageId(null);
    alert("ההודעה סומנה כלא נקראה.");
  };

  const highlightUnsubscribeWords = (text) => {
    const wordsToHighlight = ['הסר', 'הסירו אותי', 'תורידו אותי'];
    const regex = new RegExp(`\\b(${wordsToHighlight.join('|')})\\b`, 'gi');
    return text.replace(regex, (match) => `<span class="text-red-600 font-bold">${match}</span>`);
  };

  const handleRemoveCustomer = async (customerId) => {
    if (confirm('האם אתה בטוח שברצונך להסיר את הלקוח מרשימת התפוצה?')) {
      try {
        await deleteCustomer(customerId);
        setCustomers(customers.filter(c => c.id !== customerId));
        alert('הלקוח הוסר בהצלחה.');
      } catch (error) {
        console.error('Error removing customer:', error);
        alert('שגיאה בהסרת הלקוח.');
      }
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);  // Reset to first page when searching
  };

  const filteredMessages = useMemo(() => {
    if (!searchTerm) return messages;
    const lowercasedTerm = searchTerm.toLowerCase();
    return Object.fromEntries(
      Object.entries(messages).filter(([phoneNumber, messageList]) => {
        const customerName = getCustomerName(Number(phoneNumber));
        return customerName.toLowerCase().includes(lowercasedTerm);
      })
    );
  }, [messages, searchTerm]);

  const paginatedMessages = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return Object.entries(filteredMessages).slice(start, end);
  }, [filteredMessages, currentPage]);

  const totalPages = Math.ceil(Object.keys(filteredMessages).length / PAGE_SIZE);

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleRefresh = async () => {
    greenApi.clearCache();
    await loadMessages();
  };

  const navigateToChat = (phoneNumber) => {
    router.push(`/chat`); // ניווט לעמוד הצ'אט עבור מספר הטלפון הספציפי
  };

  const LoadingIndicator = () => (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex justify-center items-center z-50">
      <div className="bg-black p-6 rounded-lg shadow-xl">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-yellow-500 mx-auto"></div>
        <p className="mt-4 text-lg font-semibold text-white">טוען נתונים...</p>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="container mx-auto p-4 bg-black rounded-lg shadow-2xl text-white">
        <h1 className="text-2xl font-bold mb-6 text-yellow-500 text-center">הודעות נכנסות</h1>

        <div className="flex justify-between items-center mb-4">
          <button
            onClick={handleRefresh}
            className="p-2 border border-yellow-500 text-yellow-500 rounded-md hover:bg-yellow-500 hover:text-black transition duration-300 text-sm"
          >
            רענן
          </button>
          <div className="flex items-center">
            <input
              type="text"
              placeholder="חפש לפי שם לקוח..."
              className="p-2 border border-yellow-500 rounded-md text-white bg-gray-800 text-sm w-full"
              value={searchTerm}
              onChange={handleSearchChange}
            />
            <FaSearch className="text-yellow-500 ml-2" />
          </div>
        </div>

        {loading ? (
          <LoadingIndicator />
        ) : (
          <div className="bg-gray-800 p-4 rounded-lg shadow-md">
            {paginatedMessages.length === 0 ? (
              <p className="text-gray-400">אין הודעות נכנסות כרגע.</p>
            ) : (
              <div className="space-y-4">
                {paginatedMessages.map(([phoneNumber, messageList], index) => {
                  const customerName = getCustomerName(Number(phoneNumber));
                  const customer = customers.find(cust => cust.Cell === Number(phoneNumber));
                  const showAllMessages = messageList.length > 1; // Check if there's more than one message

                  return (
                    <div key={index} className="bg-black p-4 rounded-lg shadow-sm border border-gray-700">
                      <div className="flex flex-col mb-2">
                        <span className="font-semibold text-md text-yellow-500">{customerName}</span>
                        <div className={`overflow-hidden ${showAllMessages ? 'max-h-20' : ''} transition-max-height duration-300`}>
                          {Array.isArray(messageList) && messageList.slice(0, showAllMessages ? 1 : messageList.length).map((message, msgIndex) => (
                            <div key={msgIndex} className="mb-1">
                              <span className="text-gray-300" dangerouslySetInnerHTML={{ __html: highlightUnsubscribeWords(message.textMessage || "תוכן הודעה לא זמין") }}></span>
                              <div className="text-xs text-gray-500">
                                התקבלה ב: {new Date(message.timestamp * 1000).toLocaleString('he-IL')}
                              </div>
                            </div>
                          ))}
                        </div>
                        {showAllMessages && (
                          <button
                            onClick={() => setReplyingMessageId(messageList[0]?.idMessage)}
                            className="text-yellow-500 hover:text-yellow-600 text-sm mt-2"
                          >
                            הצג הכל
                          </button>
                        )}
                      </div>
                      <div className="flex justify-end space-x-2 mt-2">
                        <button
                          onClick={() => handleReplyClick(messageList[0])}
                          className="p-2 border border-green-500 text-green-500 rounded-md hover:bg-green-500 hover:text-black transition duration-300 text-sm flex items-center justify-center"
                        >
                          <FaReply className="mr-1" /> השב
                        </button>
                        <button
                          onClick={() => handleRemoveCustomer(customer?.id)}
                          className="p-2 border border-red-500 text-red-500 rounded-md hover:bg-red-500 hover:text-black transition duration-300 text-sm flex items-center justify-center"
                        >
                          <FaTrashAlt className="mr-1" /> הסר
                        </button>
                        <button
                          onClick={() => handleEdit(customer)}
                          className="p-2 border border-yellow-500 text-yellow-500 rounded-md hover:bg-yellow-500 hover:text-black transition duration-300 text-sm flex items-center justify-center"
                        >
                          <FaEdit className="mr-1" /> ערוך
                        </button>
                        <button
                          onClick={() => navigateToChat(phoneNumber)}
                          className="p-2 border border-purple-500 text-purple-500 rounded-md hover:bg-purple-500 hover:text-black transition duration-300 text-sm flex items-center justify-center"
                        >
                          <FaCommentDots className="mr-1" /> לצ׳אט
                        </button>
                      </div>

                      {replyingMessageId === messageList[0]?.idMessage && (
                        <div className="mt-4">
                          <textarea
                            className="w-full p-2 border border-yellow-500 rounded-md text-sm bg-gray-900 text-white"
                            rows="3"
                            placeholder="הזן את תגובתך כאן..."
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                          ></textarea>
                          {warning && (
                            <div className="mt-2 text-red-600 text-sm">
                              {warning}
                              <div className="flex justify-end space-x-2 mt-2">
                                <button
                                  onClick={() => handleConfirmSendAnyway(messageList[0])}
                                  className="p-2 border border-red-600 text-red-600 rounded-md hover:bg-red-600 hover:text-white transition duration-300 text-sm"
                                >
                                  שלח בכל זאת
                                </button>
                                <button
                                  onClick={() => handleMarkAsUnread(messageList[0])}
                                  className="p-2 border border-gray-600 text-gray-600 rounded-md hover:bg-gray-600 hover:text-white transition duration-300 text-sm"
                                >
                                  סמן כלא נקרא
                                </button>
                              </div>
                            </div>
                          )}
                          {!warning && (
                            <div className="flex justify-end space-x-2 mt-2">
                              <button
                                onClick={() => handleSendReply(messageList[0])}
                                className="p-2 border border-green-600 text-green-600 rounded-md hover:bg-green-600 hover:text-black transition duration-300 text-sm"
                              >
                                שלח
                              </button>
                              <button
                                onClick={handleCancelReply}
                                className="p-2 border border-gray-600 text-gray-600 rounded-md hover:bg-gray-600 hover:text-white transition duration-300 text-sm"
                              >
                                ביטול
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                <div className="flex justify-between mt-4">
                  <button
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                    className="p-2 border border-yellow-500 text-yellow-500 rounded-md text-sm disabled:opacity-50 hover:bg-yellow-500 hover:text-black transition duration-300"
                  >
                    דף קודם
                  </button>
                  <span>דף {currentPage} מתוך {totalPages}</span>
                  <button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-yellow-500 text-yellow-500 rounded-md text-sm disabled:opacity-50 hover:bg-yellow-500 hover:text-black transition duration-300"
                  >
                    דף הבא
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default IncomingMessages;
