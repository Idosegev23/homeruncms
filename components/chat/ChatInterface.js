import React, { useState, useEffect, useRef } from 'react';
import Layout from '../../components/Layout';
import greenApi from '../../utils/greenApi';
import { fetchCustomers, fetchProperties } from '../../utils/airtable';

const ChatInterface = () => {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [message, setMessage] = useState('');
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const chatWindowRef = useRef(null);

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  useEffect(() => {
    const loadRelevantCustomers = async () => {
      try {
        const fetchedCustomers = await fetchCustomers();
        setCustomers(fetchedCustomers);

        await delay(1000);
        const incomingMessages = await greenApi.getLastIncomingMessages(1440);

        await delay(1000);
        const outgoingMessages = await greenApi.getLastOutgoingMessages(1440);

        const relevantPhoneNumbers = new Set();

        incomingMessages.forEach(msg => {
          const phoneNumber = formatPhoneNumberFromChatId(msg.chatId);
          relevantPhoneNumbers.add(phoneNumber);
        });

        outgoingMessages.forEach(msg => {
          const phoneNumber = formatPhoneNumberFromChatId(msg.chatId);
          relevantPhoneNumbers.add(phoneNumber);
        });

        const relevantCustomers = fetchedCustomers.filter(customer => 
          relevantPhoneNumbers.has(String(customer.Cell))
        );

        setFilteredCustomers(relevantCustomers);
      } catch (error) {
        console.error('Error loading relevant customers:', error);
      }
    };

    loadRelevantCustomers();
  }, []);

  useEffect(() => {
    if (selectedCustomer) {
      loadChatHistory(selectedCustomer.Cell);
      loadProperties(selectedCustomer);
    }
  }, [selectedCustomer]);

  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [chatHistory]);

  // New effect for real-time updates
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (selectedCustomer) {
        loadChatHistory(selectedCustomer.Cell);
      }
    }, 5000); // Check for new messages every 5 seconds

    return () => clearInterval(intervalId);
  }, [selectedCustomer]);

  const formatPhoneNumberFromChatId = (chatId) => {
    const phoneNumber = chatId.replace('@c.us', '').replace(/^972/, '');
    return phoneNumber;
  };

  const loadChatHistory = async (phone) => {
    setLoading(true);
    try {
      const phoneStr = String(phone);
      const formattedPhone = phoneStr.startsWith('972') ? phoneStr : `972${phoneStr.replace(/^0/, '')}`;
      const chatId = `${formattedPhone}@c.us`;

      await delay(1000);
      const history = await greenApi.getChatHistory(chatId);

      setChatHistory(history);
    } catch (error) {
      console.error('Error loading chat history:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProperties = async (customer) => {
    try {
      const fetchedProperties = await fetchProperties();
      const relevantProperties = fetchedProperties.filter(property => {
        const maxPropertyPrice = customer.Budget + 1000000;
        const minPropertyPrice = customer.Budget * 0.85;
        return property.price && property.price <= maxPropertyPrice && property.price >= minPropertyPrice;
      });
      setProperties(relevantProperties);
    } catch (error) {
      console.error('Error loading properties:', error);
    }
  };

  const handleSendMessage = async () => {
    if (message.trim() === '') return;
    try {
      await delay(20);
      await greenApi.sendNow(selectedCustomer.Cell, message);
      
      // Add the sent message to the chat history immediately
      setChatHistory(prev => [...prev, { 
        fromMe: true, 
        textMessage: message, 
        timestamp: Date.now() / 1000 
      }]);
      
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
  };

  const handleSendPropertyDetails = (property) => {
    const propertyDetails = `נכס: ${property.name}, מחיר: ₪${property.price.toLocaleString()}`;
    setMessage(propertyDetails);
  };

  return (
    <Layout>
      <div className="flex h-full">
        {/* Customer list */}
        <aside className="w-1/4 bg-gray-100 border-r">
          <div className="p-4 font-bold text-lg">לקוחות</div>
          <ul>
            {filteredCustomers.map((customer) => (
              <li
                key={customer.id}
                onClick={() => handleSelectCustomer(customer)}
                className={`p-2 cursor-pointer hover:bg-gray-200 ${selectedCustomer?.id === customer.id ? 'bg-gray-200' : ''}`}
              >
                {customer.First_name} {customer.Last_name}
              </li>
            ))}
          </ul>
        </aside>

        {/* Chat window */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 p-4 overflow-y-auto" ref={chatWindowRef}>
            {loading ? (
              <div>טוען היסטוריית צ'אט...</div>
            ) : (
              chatHistory.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`mb-2 flex ${msg.fromMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`inline-block p-2 rounded max-w-[70%] ${msg.fromMe ? 'bg-green-500 text-white' : 'bg-gray-300 text-black'}`}>
                    {msg.textMessage || msg.caption || "תוכן לא זמין"}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 mx-2">
                    {new Date(msg.timestamp * 1000).toLocaleString('he-IL')}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="p-4 border-t flex items-center">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="הקלד הודעה..."
              className="flex-1 border rounded p-2"
            />
            <button
              onClick={handleSendMessage}
              className="ml-2 px-4 py-2 bg-blue-500 text-white rounded"
            >
              שלח
            </button>
          </div>
        </div>

        {/* Customer details and properties */}
        <aside className="w-1/4 bg-gray-100 border-l p-4">
          {selectedCustomer && (
            <>
              <div className="font-bold text-lg mb-4">
                פרטי לקוח
              </div>
              <div className="mb-4">
                <p><strong>שם:</strong> {selectedCustomer.First_name} {selectedCustomer.Last_name}</p>
                <p><strong>טלפון:</strong> {selectedCustomer.Cell}</p>
                <p><strong>תקציב:</strong> ₪{selectedCustomer.Budget.toLocaleString()}</p>
              </div>

              <div className="font-bold text-lg mb-4">
                נכסים רלוונטיים
              </div>
              <ul className="overflow-y-auto max-h-60">
                {properties.map((property) => (
                  <li
                    key={property.id}
                    className="p-2 cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSendPropertyDetails(property)}
                  >
                    {property.name} - ₪{property.price ? property.price.toLocaleString() : 'לא זמין'}
                  </li>
                ))}
              </ul>
            </>
          )}
        </aside>
      </div>
    </Layout>
  );
};

export default ChatInterface;