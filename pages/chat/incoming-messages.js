import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import greenApi from '../../utils/greenApi';
import { fetchCustomers, deleteCustomer } from '../../utils/airtable';

const IncomingMessages = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [replyingMessageId, setReplyingMessageId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [warning, setWarning] = useState('');
  const [customers, setCustomers] = useState([]);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [matchingCustomer, setMatchingCustomer] = useState(null);

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

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
  };

  const handleMatchProperties = (customer) => {
    setMatchingCustomer(customer);
  };

  return (
    <Layout>
      <div className="container mx-auto p-4 bg-white rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold mb-6 text-gray-800 text-center">הודעות נכנסות</h1>

        <div className="flex justify-between items-center mb-4">
          <button
            onClick={loadMessages}
            className="p-1 w-24 h-8 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-600 hover:text-white transition duration-300 text-sm"
          >
            רענן
          </button>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg shadow-md">
          {loading ? (
            <div className="flex justify-center items-center">
              <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-8 w-8"></div>
            </div>
          ) : Object.keys(messages).length === 0 ? (
            <p className="text-gray-600">אין הודעות נכנסות כרגע.</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(messages).map(([phoneNumber, messageList], index) => {
                const customerName = getCustomerName(Number(phoneNumber));
                const customer = customers.find(cust => cust.Cell === Number(phoneNumber));

                return (
                  <div key={index} className="bg-white p-2 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex flex-col mb-2">
                      <span className="font-semibold text-md text-gray-700">{customerName}</span>
                      {Array.isArray(messageList) && messageList.map((message, msgIndex) => (
                        <div key={msgIndex} className="mb-1">
                          <span className="text-gray-600" dangerouslySetInnerHTML={{ __html: highlightUnsubscribeWords(message.textMessage || "תוכן הודעה לא זמין") }}></span>
                          <div className="text-xs text-gray-500">
                            התקבלה ב: {new Date(message.timestamp * 1000).toLocaleString('he-IL')}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-end space-x-2 mt-2">
                      <button
                        onClick={() => handleReplyClick(messageList[0])}
                        className="p-1 w-24 h-8 border border-green-600 text-green-600 rounded-md hover:bg-green-600 hover:text-white transition duration-300 text-sm"
                      >
                        השב
                      </button>
                      <button
                        onClick={() => handleRemoveCustomer(customer?.id)}
                        className="p-1 w-24 h-8 border border-red-600 text-red-600 rounded-md hover:bg-red-600 hover:text-white transition duration-300 text-sm"
                      >
                        הסר מרשימת תפוצה
                      </button>
                      <button
                        onClick={() => handleEdit(customer)}
                        className="p-1 w-24 h-8 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-600 hover:text-white transition duration-300 text-sm"
                      >
                        פרטי לקוח
                      </button>
                      <button
                        onClick={() => handleMatchProperties(customer)}
                        className="p-1 w-24 h-8 border border-yellow-600 text-yellow-600 rounded-md hover:bg-yellow-600 hover:text-white transition duration-300 text-sm"
                      >
                        מציאת נכסים
                      </button>
                    </div>

                    {replyingMessageId === messageList[0]?.idMessage && (
                      <div className="mt-4">
                        <textarea
                          className="w-full p-1 border border-gray-300 rounded-md text-sm"
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
                                className="p-1 w-24 h-8 border border-red-600 text-red-600 rounded-md hover:bg-red-600 hover:text-white transition duration-300 text-sm"
                              >
                                שלח בכל זאת
                              </button>
                              <button
                                onClick={() => handleMarkAsUnread(messageList[0])}
                                className="p-1 w-24 h-8 border border-gray-600 text-gray-600 rounded-md hover:bg-gray-600 hover:text-white transition duration-300 text-sm"
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
                              className="p-1 w-24 h-8 border border-green-600 text-green-600 rounded-md hover:bg-green-600 hover:text-white transition duration-300 text-sm"
                            >
                              שלח
                            </button>
                            <button
                              onClick={handleCancelReply}
                              className="p-1 w-24 h-8 border border-gray-600 text-gray-600 rounded-md hover:bg-gray-600 hover:text-white transition duration-300 text-sm"
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
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default IncomingMessages;
