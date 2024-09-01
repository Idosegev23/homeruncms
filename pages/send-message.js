import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { fetchProperties, fetchCustomers, fetchChatRecords, createChatRecords } from '../utils/airtable';
import Layout from '../components/Layout';
import greenApi from '../utils/greenApi';

const SendMessage = () => {
  const router = useRouter();
  const { propertyId, propertyIds, customerId, customerIds } = router.query;

  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [properties, setProperties] = useState([]);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [selectedProperties, setSelectedProperties] = useState([]);
  const [message, setMessage] = useState("");
  const [previewMessage, setPreviewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendingFeedback, setSendingFeedback] = useState("");
  const [isFromPropertiesPage, setIsFromPropertiesPage] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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
        const [propertiesData, customersData] = await Promise.all([
          fetchProperties(),
          fetchCustomers()
        ]);
  
        const { source } = router.query;
  
        if (source === 'properties') {
          setIsFromPropertiesPage(true);
          const selectedPropIds = propertyIds ? propertyIds.split(',') : [];
          const selectedProps = propertiesData.filter(p => selectedPropIds.includes(p.id));
          setProperties(selectedProps);
          setSelectedProperties(selectedProps);
  
          const relevantCustomers = customersData.filter(customer => 
            selectedProps.some(property => {
              const propertyPrice = property.price;
              const customerBudget = customer.Budget;
              return (customerBudget <= propertyPrice + 1000000) && 
                     (customerBudget >= propertyPrice * 0.85);
            })
          );
          setCustomers(relevantCustomers);
          setSelectedCustomers(relevantCustomers);
  
        } else if (source === 'customers') {
          setIsFromPropertiesPage(false);
          const selectedCustomerIds = customerId ? [customerId] : customerIds ? customerIds.split(',') : [];
          const selectedCustomers = customersData.filter(c => selectedCustomerIds.includes(c.id));
          setCustomers(selectedCustomers);
          setSelectedCustomers(selectedCustomers);
  
          const selectedPropIds = propertyIds ? propertyIds.split(',') : [];
          const selectedProperties = propertiesData.filter(p => selectedPropIds.includes(p.id));
          setProperties(selectedProperties);
          setSelectedProperties(selectedProperties);
        }
  
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
  
    if (router.isReady) {
      loadData();
    }
  }, [router.isReady, propertyIds, customerId, customerIds]);

  const handleCustomerSelection = (customer) => {
    setSelectedCustomers(prev => 
      prev.includes(customer)
        ? prev.filter(c => c !== customer)
        : [...prev, customer]
    );
  };

  const handleDeselectAll = () => {
    if (isFromPropertiesPage) {
      setSelectedCustomers([]);
    } else {
      setSelectedProperties([]);
    }
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value.toLowerCase());
  };

  const LoadingIndicator = () => (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex justify-center items-center z-50">
      <div className="bg-black p-6 rounded-lg shadow-xl">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-yellow-500 mx-auto"></div>
        <p className="mt-4 text-lg font-semibold text-white">טוען נתונים...</p>
      </div>
    </div>
  );

  const filteredCustomers = customers.filter(customer => {
    const firstName = customer.First_name || '';
    const lastName = customer.Last_name || '';
    const cell = customer.Cell ? String(customer.Cell) : '';

    return firstName.toLowerCase().includes(searchQuery) ||
           lastName.toLowerCase().includes(searchQuery) ||
           cell.includes(searchQuery);
  });

  const filteredProperties = properties.filter(property => {
    const street = property.street || '';
    const city = property.city || '';

    return street.toLowerCase().includes(searchQuery) ||
           city.toLowerCase().includes(searchQuery);
  });

  const handleTagClick = (tag) => {
    setMessage(prev => prev + " " + tag);
  };

  const handleSendMessage = async () => {
    setSending(true);
    setSendingFeedback("מעבד הודעות...");

    let successCount = 0;
    let failCount = 0;
    let queuedCount = 0;

    const messages = selectedCustomers.flatMap(customer => 
      selectedProperties.map(property => ({
        chatId: greenApi.formatPhoneNumber(customer.Cell),
        message: generatePersonalizedMessage(customer, property),
        customerName: `${customer.First_name} ${customer.Last_name}`,
        customerId: customer.id
      }))
    );

    for (let i = 0; i < messages.length; i++) {
      try {
        const result = await greenApi.sendMessage(messages[i].chatId, messages[i].message);
        if (result.status === 'queued') {
          queuedCount++;
        } else {
          successCount++;
        }
        console.log(`Message ${result.status} for ${messages[i].customerName}`);
      } catch (error) {
        console.error(`Failed to send message to ${messages[i].customerName}:`, error);
        failCount++;
      }

      if (i < messages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 15000));
      }
    }

    setSending(false);
    setSendingFeedback(`נשלחו ${successCount} הודעות, ${queuedCount} בתור, ${failCount} נכשלו.`);

    const stats = greenApi.getMessageStats();
    if (stats.dailyCount >= 200) {
      setSendingFeedback(prev => prev + " הגעת למגבלת ההודעות היומית.");
    }
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
        <LoadingIndicator />
      </Layout>
    );
  }
  
  return (
    <Layout>
      <div className="container mx-auto p-8 bg-black rounded-xl shadow-2xl text-white">
        <h1 className="text-4xl font-bold mb-8 text-yellow-500 text-center">
          {isFromPropertiesPage
            ? `פרטי הנכס: ${selectedProperties.map(p => `${p.street}, ${p.city}`).join(' | ')}`
            : `פרטי הלקוח: ${selectedCustomers.map(c => `${c.First_name} ${c.Last_name}`).join(' | ')}`}
        </h1>

        <div className="flex justify-between items-center mb-4">
          <input 
            type="text" 
            placeholder={isFromPropertiesPage ? "חפש לקוחות..." : "חפש נכסים..."} 
            className="p-2 border border-yellow-500 rounded bg-gray-800 text-white"
            value={searchQuery}
            onChange={handleSearchChange}
          />
          <button 
            onClick={handleDeselectAll}
            className="px-4 py-2 bg-red-500 text-white font-semibold rounded shadow hover:bg-red-600 transition-colors"
          >
            בטל בחירת הכל
          </button>
        </div>

        <div className="grid grid-cols-2 gap-8">
          <div className="bg-gray-800 p-6 rounded-lg shadow-md overflow-hidden">
            <h2 className="text-2xl font-semibold mb-4 text-yellow-500">
              {isFromPropertiesPage ? 'לקוחות רלוונטיים' : 'נכסים מתאימים ללקוח'}
            </h2>
            <div className="overflow-y-auto max-h-96 space-y-4">
              {isFromPropertiesPage
                ? filteredCustomers.map(customer => (
                    <div 
                      key={customer.id} 
                      className={`p-4 rounded-lg shadow-sm cursor-pointer transition duration-300 ${
                        selectedCustomers.includes(customer) 
                          ? 'bg-yellow-200 border-2 border-yellow-500' 
                          : 'bg-black hover:bg-gray-700'
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
                          <h3 className="text-lg font-bold text-white">{customer.First_name} {customer.Last_name}</h3>
                          <p className="text-sm text-gray-400">תקציב: ₪{customer.Budget?.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))
                : selectedProperties.map(property => (
                    <div 
                      key={property.id} 
                      className="p-4 rounded-lg shadow-sm bg-black border border-yellow-500"
                    >
                      <h3 className="text-lg font-bold text-white">{property.street}, {property.city}</h3>
                      <p className="text-sm text-gray-400">₪{property.price?.toLocaleString()}</p>
                      <p className="text-sm text-gray-400">{property.rooms} חדרים, {property.square_meters} מ"ר</p>
                    </div>
                  ))
              }
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-gray-800 p-6 rounded-lg shadow-md">
              <h2 className="text-2xl font-semibold mb-4 text-yellow-500">עריכת הודעה</h2>
              <textarea 
                className="w-full h-48 p-4 border border-yellow-500 rounded-lg mb-4 text-white bg-black focus:outline-none focus:ring-2 focus:ring-yellow-500 resize-none"
                value={message} 
                onChange={(e) => setMessage(e.target.value)}
                placeholder="הקלד כאן את ההודעה שלך..."
              />
              <div className="mb-4">
                <h3 className="text-lg font-bold mb-2 text-yellow-500">תגיות לקוח</h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {customerTags.map(tag => (
                    <button 
                      key={tag} 
                      onClick={() => handleTagClick(tag)}
                      className="px-3 py-1 bg-yellow-500 text-black rounded-full hover:bg-yellow-600 transition duration-300 text-sm"
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                <h3 className="text-lg font-bold mb-2 text-yellow-500">תגיות נכס</h3>
                <div className="flex flex-wrap gap-2">
                  {propertyTags.map(tag => (
                    <button 
                      key={tag} 
                      onClick={() => handleTagClick(tag)}
                      className="px-3 py-1 bg-yellow-500 text-black rounded-full hover:bg-yellow-600 transition duration-300 text-sm"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg shadow-md">
              <h2 className="text-2xl font-semibold mb-4 text-yellow-500">תצוגה מקדימה</h2>
              <div className="p-4 border border-yellow-500 rounded-lg bg-black text-white h-48 overflow-y-auto">
                <p className="whitespace-pre-wrap">{previewMessage}</p>
              </div>
            </div>

            <div className="flex justify-between">
              <button 
                className="px-6 py-3 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 transition duration-300 flex items-center"
                onClick={handleSendMessage}
                disabled={sending}
              >
                {sending ? 'שולח...' : 'שלח עכשיו'}
              </button>
            </div>

            {sendingFeedback && (
              <div className="mt-4 p-3 bg-yellow-100 text-yellow-700 rounded-lg">
                {sendingFeedback}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SendMessage;
