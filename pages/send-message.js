import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { fetchProperties, fetchCustomers,fetchChatRecords, createChatRecords } from '../utils/airtable';
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
        // Fetch the data for properties and customers from Airtable
        const [propertiesData, customersData] = await Promise.all([
          fetchProperties(),
          fetchCustomers()
        ]);
  
        const { source } = router.query; // Access source inside useEffect
  
        if (source === 'properties') {
          // User arrived from the properties page
          setIsFromPropertiesPage(true);
  
          // Filter the properties based on selected property IDs
          const selectedPropIds = propertyIds ? propertyIds.split(',') : [];
          const selectedProps = propertiesData.filter(p => selectedPropIds.includes(p.id));
          setProperties(selectedProps);
          setSelectedProperties(selectedProps);
  
          // Find relevant customers for these properties
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
          // User arrived from the customers page
          setIsFromPropertiesPage(false);
  
          // Set the customers and properties directly without additional filtering
          const selectedCustomerIds = customerId ? [customerId] : customerIds ? customerIds.split(',') : [];
          const selectedCustomers = customersData.filter(c => selectedCustomerIds.includes(c.id));
          setCustomers(selectedCustomers);
          setSelectedCustomers(selectedCustomers);
  
          const selectedPropIds = propertyIds ? propertyIds.split(',') : [];
          const selectedProperties = propertiesData.filter(p => selectedPropIds.includes(p.id));
          setProperties(selectedProperties);
          setSelectedProperties(selectedProperties);
  
          // No additional filtering or calculations here
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
  }, [router.isReady, propertyIds, customerId, customerIds]); // source removed from dependencies
  
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
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-lg font-semibold text-gray-700">טוען נתונים...</p>
      </div>
    </div>
  );
  
  const filteredCustomers = customers.filter(customer => {
    const firstName = customer.First_name || '';
    const lastName = customer.Last_name || '';
    const cell = customer.Cell ? String(customer.Cell) : ''; // Convert cell to string if it exists

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

      // 15 שניות השהייה בין הודעות
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
      <div className="container mx-auto p-8 bg-gray-50 rounded-xl shadow-2xl">
        <h1 className="text-4xl font-bold mb-8 text-blue-800 text-center">
          {isFromPropertiesPage
            ? `פרטי הנכס: ${selectedProperties.map(p => `${p.street}, ${p.city}`).join(' | ')}`
            : `פרטי הלקוח: ${selectedCustomers.map(c => `${c.First_name} ${c.Last_name}`).join(' | ')}`}
        </h1>

        <div className="flex justify-between items-center mb-4">
          <input 
            type="text" 
            placeholder={isFromPropertiesPage ? "חפש לקוחות..." : "חפש נכסים..."} 
            className="p-2 border rounded-lg"
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
          <div className="bg-white p-6 rounded-lg shadow-md overflow-hidden">
            <h2 className="text-2xl font-semibold mb-4 text-blue-700">
              {isFromPropertiesPage ? 'לקוחות רלוונטיים' : 'נכסים מתאימים ללקוח'}
            </h2>
            <div className="overflow-y-auto max-h-96 space-y-4">
              {isFromPropertiesPage
                ? filteredCustomers.map(customer => (
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
                : selectedProperties.map(property => (
                    <div 
                      key={property.id} 
                      className="p-4 rounded-lg shadow-sm bg-blue-50 border border-blue-200"
                    >
                      <h3 className="text-lg font-bold text-gray-800">{property.street}, {property.city}</h3>
                      <p className="text-sm text-gray-600">₪{property.price?.toLocaleString()}</p>
                      <p className="text-sm text-gray-600">{property.rooms} חדרים, {property.square_meters} מ"ר</p>
                    </div>
                  ))
              }
            </div>
          </div>

          <div className="space-y-8">
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

            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-2xl font-semibold mb-4 text-blue-700">תצוגה מקדימה</h2>
              <div className="p-4 border rounded-lg bg-gray-50 text-gray-700 h-48 overflow-y-auto">
                <p className="whitespace-pre-wrap">{previewMessage}</p>
              </div>
            </div>

            <div className="flex justify-between">
              <button 
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-300 flex items-center"
                onClick={handleSendMessage}
                disabled={sending}
              >
                {sending ? 'שולח...' : 'שלח עכשיו'}
              </button>
            </div>

            {sendingFeedback && (
              <div className="mt-4 p-3 bg-blue-100 text-blue-700 rounded-lg">
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
