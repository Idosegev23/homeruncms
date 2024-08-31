import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { fetchProperties, fetchCustomers } from '../utils/airtable';
import greenApi from '../utils/greenApi';
import Layout from '../components/Layout';
import { format, differenceInSeconds } from 'date-fns';
import MessageQueuePopup from '../components/MessageQueuePopup';

const SendMessage = () => {
  const router = useRouter();
  const { propertyIds, customerId } = router.query;

  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [properties, setProperties] = useState([]);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [selectedProperties, setSelectedProperties] = useState([]);
  const [message, setMessage] = useState("");
  const [previewMessage, setPreviewMessage] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [scheduledTime, setScheduledTime] = useState(null);
  const [sending, setSending] = useState(false);
  const [sendingFeedback, setSendingFeedback] = useState("");
  const [dailyMessageCount, setDailyMessageCount] = useState(0);
  const [nextSendTime, setNextSendTime] = useState(null);
  const [timeUntilNextSend, setTimeUntilNextSend] = useState(null);
  const [showSchedulePopup, setShowSchedulePopup] = useState(false);

  const customerTags = [
    '{{שם פרטי}}', '{{שם משפחה}}', '{{טלפון}}', '{{תקציב}}',
    '{{חדרים}}', '{{מטר רבוע}}', '{{קומה מועדפת}}', '{{עיר}}', '{{אזור}}'
  ];

  const propertyTags = [
    '{{מחיר נכס}}', '{{חדרים בנכס}}', '{{מ"ר בנכס}}', '{{קומה בנכס}}',
    '{{עיר בנכס}}', '{{רחוב בנכס}}'
  ];

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const propertiesData = await fetchProperties();
        const customersData = await fetchCustomers();
        const stats = await greenApi.getMessageStats();
        setDailyMessageCount(stats.dailyCount);

        if (propertyIds) {
          const propertyIdArray = propertyIds.split(',');
          const selectedProps = propertiesData.filter(p => propertyIdArray.includes(p.id)).slice(0, 3);
          setProperties(selectedProps);
          setSelectedProperties(selectedProps);

          if (customerId) {
            const selectedCustomer = customersData.find(c => c.id === customerId);
            setCustomers([selectedCustomer]);
            setSelectedCustomers([selectedCustomer]);
          } else {
            setCustomers(customersData);
          }
        } else if (customerId) {
          const selectedCustomer = customersData.find(c => c.id === customerId);
          setCustomers([selectedCustomer]);
          setSelectedCustomers([selectedCustomer]);

          const filteredProperties = propertiesData.filter(property => {
            const matchPercentage = calculateMatchPercentage(selectedCustomer, property);
            return matchPercentage > 0;
          }).slice(0, 3);

          setProperties(filteredProperties);
          setSelectedProperties(filteredProperties);
        }

        updateNextSendTime();
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [propertyIds, customerId]);

  useEffect(() => {
    const timer = setInterval(() => {
      updateNextSendTime();
    }, 1000);

    return () => clearInterval(timer);
  }, [nextSendTime]);

  const updateNextSendTime = () => {
    const now = new Date();
    const next = greenApi.getNextValidSendTime(now);
    setNextSendTime(next);
    const diffInSeconds = differenceInSeconds(next, now);
    setTimeUntilNextSend(diffInSeconds);
  };

  const formatTimeUntilNextSend = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const calculateMatchPercentage = (customer, property) => {
    const budgetWeight = 1.0;
    let matchScore = 0;

    const maxBudget = property.price + 1000000;
    const minBudget = property.price * 0.85;
    if (customer.Budget >= minBudget && customer.Budget <= maxBudget) {
      matchScore += budgetWeight;
    }

    return Math.round(matchScore * 100);
  };

  const handleCustomerSelection = (customer) => {
    setSelectedCustomers(prev => 
      prev.includes(customer)
        ? prev.filter(c => c !== customer)
        : [...prev, customer]
    );
  };

  const handleSelectAllCustomers = () => {
    setSelectedCustomers(customers);
  };

  const handleDeselectAllCustomers = () => {
    setSelectedCustomers([]);
  };

  const handleTagClick = (tag) => {
    setMessage(prev => prev + " " + tag);
  };

  const handleSendMessage = async (override = false) => {
    setSending(true);
    setSendingFeedback("מעבד הודעות...");

    let successCount = 0;
    let failCount = 0;

    const messages = selectedCustomers.flatMap(customer => 
      selectedProperties.map(property => ({
        chatId: greenApi.formatPhoneNumber(customer.Cell),
        message: generatePersonalizedMessage(customer, property),
        customerName: `${customer.First_name} ${customer.Last_name}`,
        customerId: customer.id
      }))
    );

    if (messages.length > 0 && (override || greenApi.isValidSendTime(new Date()))) {
      try {
        await greenApi.sendMessage(messages[0].chatId, messages[0].message);
        successCount++;
        console.log(`Message sent to ${messages[0].customerName}`);
      } catch (error) {
        console.error(`Failed to send message to ${messages[0].customerName}:`, error);
        failCount++;
        greenApi.addToQueue(messages[0].chatId, messages[0].message);
      }
    } else if (messages.length > 0) {
      greenApi.addToQueue(messages[0].chatId, messages[0].message);
      successCount++;
    }

    for (let i = 1; i < messages.length; i++) {
      greenApi.addToQueue(messages[i].chatId, messages[i].message);
      successCount++;
      console.log(`Message queued for ${messages[i].customerName}`);
    }

    setSending(false);
    setSendingFeedback(`נוספו ${successCount} הודעות לתור. ${failCount} הודעות נכשלו.`);
  };

  const generatePersonalizedMessage = (customer, property) => {
    return message
      .replace(/{{שם פרטי}}/g, customer.First_name)
      .replace(/{{שם משפחה}}/g, customer.Last_name)
      .replace(/{{טלפון}}/g, customer.Cell)
      .replace(/{{תקציב}}/g, customer.Budget)
      .replace(/{{חדרים}}/g, customer.Rooms)
      .replace(/{{מטר רבוע}}/g, customer.Square_meters)
      .replace(/{{קומה מועדפת}}/g, customer.Preferred_floor)
      .replace(/{{עיר}}/g, customer.City)
      .replace(/{{אזור}}/g, customer.Area)
      .replace(/{{מחיר נכס}}/g, property.price)
      .replace(/{{חדרים בנכס}}/g, property.rooms)
      .replace(/{{מ"ר בנכס}}/g, property.square_meters)
      .replace(/{{קומה בנכס}}/g, property.floor)
      .replace(/{{עיר בנכס}}/g, property.city)
      .replace(/{{רחוב בנכס}}/g, property.street);
  };

  const handleScheduleMessage = () => {
    setShowSchedulePopup(true);
  };

  useEffect(() => {
    if (selectedCustomers.length > 0 && selectedProperties.length > 0) {
      const previewCustomer = selectedCustomers[0];
      const previewProperty = selectedProperties[0];
      setPreviewMessage(generatePersonalizedMessage(previewCustomer, previewProperty));
    }
  }, [message, selectedCustomers, selectedProperties]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="spinner"></div>
            <p className="mt-4 text-xl font-semibold">טוען נתונים...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-8 bg-gray-50 rounded-xl shadow-2xl">
        <h1 className="text-4xl font-bold mb-8 text-blue-800 text-center">
          {customerId 
            ? `שליחת הודעה ללקוח: ${selectedCustomers[0]?.First_name} ${selectedCustomers[0]?.Last_name}`
            : `שליחת הודעה עבור נכסים נבחרים`}
        </h1>

        {/* Message Stats */}
        <div className="bg-white p-4 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-2 text-blue-700">סטטיסטיקות הודעות</h2>
          <p>מספר הודעות יומי: {dailyMessageCount}/200</p>
          <p>זמן עד השליחה הבאה: {timeUntilNextSend ? formatTimeUntilNextSend(timeUntilNextSend) : 'טוען...'}</p>
        </div>

        <div className="grid grid-cols-2 gap-8">
          {/* Right section */}
          <div className="bg-white p-6 rounded-lg shadow-md overflow-hidden">
            <h2 className="text-2xl font-semibold mb-4 text-blue-700">
              {customerId ? 'נכסים מתאימים' : 'לקוחות'}
            </h2>
            {!customerId && (
              <div className="flex justify-between items-center mb-4">
                <button 
                  onClick={handleSelectAllCustomers}
                  className="px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition duration-300 text-sm"
                >
                  בחר הכל
                </button>
                <button 
                  onClick={handleDeselectAllCustomers}
                  className="px-4 py-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition duration-300 text-sm"
                >
                  בטל הכל
                </button>
              </div>
            )}
            <div className="overflow-y-auto max-h-96 space-y-4">
              {customerId
                ? properties.map(property => (
                    <div 
                      key={property.id} 
                      className="p-4 rounded-lg shadow-sm bg-blue-50 border border-blue-200"
                    >
                      <h3 className="text-lg font-bold text-gray-800">{property.street}, {property.city}</h3>
                      <p className="text-sm text-gray-600">₪{property.price.toLocaleString()}</p>
                      <p className="text-sm text-gray-600">{property.rooms} חדרים, {property.square_meters} מ"ר</p>
                    </div>
                  ))
                : customers.map(customer => (
                    <div 
                      key={customer.id} 
                      className={`p-4 rounded-lg shadow-sm cursor-pointer transition duration-300 ${
                        selectedCustomers.includes(customer) 
                          ? 'bg-blue-100 border-2 border-blue-500' 
                          : 'bg-white hover:bg-gray-100'
                      }`}
                      onClick={() => handleCustomerSelection(customer)}
                    >
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedCustomers.includes(customer)}
                          onChange={() => handleCustomerSelection(customer)}
                          className="mr-3"
                        />
                        <div>
                          <h3 className="text-lg font-bold text-gray-800">{customer.First_name} {customer.Last_name}</h3>
                          <p className="text-sm text-gray-600">תקציב: ₪{customer.Budget?.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))
              }
            </div>
          </div>

          {/* Center section */}
          <div className="space-y-8">
            {/* Message editing */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-2xl font-semibold mb-4 text-blue-700">עריכת הודעה</h2>
              <textarea 
                className="w-full h-48 p-4 border rounded-lg mb-4 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                value={message} 
                onChange={(e) => setMessage(e.target.value)}
                placeholder="הקלד כאן את ההודעה שלך..."
              />
              <div className="mb-4">
                <h3 className="text-lg font-bold mb-2 text-gray-700">תגיות לקוח</h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {customerTags.map(tag => (
                    <button 
                      key={tag} 
                      onClick={() => handleTagClick(tag)}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition duration-300 text-sm"
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                <h3 className="text-lg font-bold mb-2 text-gray-700">תגיות נכס</h3>
                <div className="flex flex-wrap gap-2">
                  {propertyTags.map(tag => (
                    <button 
                      key={tag} 
                      onClick={() => handleTagClick(tag)}
                      className="px-3 py-1 bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition duration-300 text-sm"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Message preview */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-2xl font-semibold mb-4 text-blue-700">תצוגה מקדימה</h2>
              <div className="p-4 border rounded-lg bg-gray-50 text-gray-700 h-48 overflow-y-auto">
                <p className="whitespace-pre-wrap">{previewMessage}</p>
              </div>
            </div>

            {/* Send buttons */}
            <div className="flex justify-between">
              <button 
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-300 flex items-center"
                onClick={() => handleSendMessage(false)}
                disabled={sending || dailyMessageCount >= 200}
              >
                שלח עכשיו
              </button>
              <button 
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition duration-300 flex items-center"
                onClick={handleScheduleMessage}
                disabled={sending}
              >
                שלח במועד מאוחר יותר
              </button>
            </div>

            {sendingFeedback && (
              <div className="mt-4 p-3 bg-blue-100 text-blue-700 rounded-lg">
                {sendingFeedback}
              </div>
            )}
          </div>
        </div>

        {/* Popup for warning about sending messages at forbidden times */}
        {showPopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
              <p className="text-xl mb-6">{popupMessage}</p>
              <div className="flex justify-center space-x-4">
                <button 
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition duration-300"
                  onClick={() => setShowPopup(false)}
                >
                  ביטול
                </button>
                <button 
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition duration-300"
                  onClick={() => {
                    setShowPopup(false);
                    handleSendMessage(true);
                  }}
                >
                  שלח עכשיו בכל זאת
                </button>
                <button 
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-300"
                  onClick={() => {
                    setShowPopup(false);
                    handleScheduleMessage();
                  }}
                >
                  שלח במועד האפשרי הקרוב
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Popup for scheduling message */}
        {showSchedulePopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
              <h2 className="text-2xl font-semibold mb-4">תזמון הודעה</h2>
              <input
                type="datetime-local"
                value={scheduledTime ? format(scheduledTime, "yyyy-MM-dd'T'HH:mm") : ''}
                onChange={(e) => setScheduledTime(new Date(e.target.value))}
                className="p-2 border rounded-lg mb-4 w-full"
              />
              <div className="flex justify-center space-x-4">
                <button 
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition duration-300"
                  onClick={() => setShowSchedulePopup(false)}
                >
                  ביטול
                </button>
                <button 
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition duration-300"
                  onClick={() => {
                    setShowSchedulePopup(false);
                    handleSendMessage(false);
                  }}
                >
                  אישור
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Message Queue Popup */}
        <MessageQueuePopup />
      </div>
    </Layout>
  );
};

export default SendMessage;
