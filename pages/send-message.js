import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/router';
import { fetchProperties, fetchCustomers, fetchChatRecords, createChatRecords } from '../utils/airtable';
import Layout from '../components/Layout';
import greenApi from '../utils/greenApi';
import { calculateMatchPercentage } from '../utils/matching';
import { 
  BsBuilding,
  BsCash,
  BsDoorOpen,
  BsRulers,
  BsArrowUpSquare,
  BsFillCarFrontFill,
  BsShieldFill,
  BsWindow,
  BsSnow,
  BsTools,
  BsHouseFill,
  BsPinMap
} from 'react-icons/bs';

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
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const fileInputRef = useRef(null);
  const [sortByMatch, setSortByMatch] = useState(false);

  const customerTags = [
    '{{שם פרטי}}', '{{שם משפחה}}', '{{טלפון}}', '{{תקציב}}',
    '{{חדרים}}', '{{מטר רבוע}}', '{{קומה מועדפת}}', '{{אזור}}'
  ];

  const propertyTags = [
    '{{מחיר נכס}}', '{{חדרים בנכס}}', '{{מ"ר בנכס}}', '{{קומה בנכס}}',
    '{{קומה מקסימלית בנכס}}', '{{רחוב בנכס}}', '{{מעלית}}',
    '{{חניה}}', '{{ממ"ד}}', '{{מצב הנכס}}', '{{פוטנציאל תמ"א}}', '{{מרפסת}}',
    '{{מיזוג אוויר}}', '{{קמפיין}}','{{מ״ר מרפסת}}'
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

  const handleMediaSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedMedia(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeSelectedMedia = () => {
    setSelectedMedia(null);
    setMediaPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const filteredCustomers = useMemo(() => {
    let filtered = customers.filter(customer => {
      const firstName = customer.First_name || '';
      const lastName = customer.Last_name || '';
      const cell = customer.Cell ? String(customer.Cell) : '';

      return firstName.toLowerCase().includes(searchQuery) ||
             lastName.toLowerCase().includes(searchQuery) ||
             cell.includes(searchQuery);
    });

    if (sortByMatch && selectedProperties[0]) {
      filtered.sort((a, b) => {
        const matchA = calculateMatchPercentage(selectedProperties[0], a);
        const matchB = calculateMatchPercentage(selectedProperties[0], b);
        return matchB.score - matchA.score;
      });
    }

    return filtered;
  }, [customers, searchQuery, sortByMatch, selectedProperties]);

  const filteredProperties = properties.filter(property => {
    const street = property.street || '';
    return street.toLowerCase().includes(searchQuery);
  });

  const handleTagClick = (tag) => {
    setMessage(prev => prev + " " + tag);
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
      .replace(/{{אזור}}/g, customer.Area)
      .replace(/{{מחיר נכס}}/g, property.price)
      .replace(/{{חדרים בנכס}}/g, property.rooms)
      .replace(/{{מ"ר בנכס}}/g, property.square_meters)
      .replace(/{{קומה בנכס}}/g, property.floor)
      .replace(/{{קומה מקסימלית בנכס}}/g, property.max_floor)
      .replace(/{{רחוב בנכס}}/g, property.street)
      .replace(/{{מעלית}}/g, property.Elevator)
      .replace(/{{חניה}}/g, property.parking)
      .replace(/{{ממ"ד}}/g, property.saferoom)
      .replace(/{{מצב הנכס}}/g, property.condition)
      .replace(/{{פוטנציאל תמ"א}}/g, property.TMA_potential)
      .replace(/{{מרפסת}}/g, property.Balcony)
      .replace(/{{מיזוג אוויר}}/g, property.airways)
      .replace(/{{מ״ר מרפסת}}/g, property.balcony_size)
      .replace(/{{קמפיין}}/g, property.Campaigns);
  };

  const sendMediaMessage = async (chatId, caption) => {
    if (!selectedMedia) return;

    try {
      const result = await greenApi.sendFile(chatId, selectedMedia, selectedMedia.name, caption);
      console.log(`Media sent successfully for ${chatId}:`, result);
      return result;
    } catch (error) {
      console.error('Failed to send media:', error);
      throw error;
    }
  };

  const handleSendMessage = async () => {
    setSending(true);
    setSendingFeedback("מעבד הודעות...");

    let successCount = 0;
    let failCount = 0;
    let queuedCount = 0;

    for (const customer of selectedCustomers) {
      const chatId = greenApi.formatPhoneNumber(customer.Cell);
      let fullMessage = '';

      for (let i = 0; i < selectedProperties.length; i++) {
        const property = selectedProperties[i];
        const propertyMessage = generatePersonalizedMessage(customer, property);
        fullMessage += propertyMessage;

        if (i < selectedProperties.length - 1) {
          fullMessage += '\n\n_____\n\n';
        }

        if (isFromPropertiesPage && selectedMedia) {
          try {
            await sendMediaMessage(chatId, fullMessage);
            console.log(`Media sent for property: ${property.street}`);
            fullMessage = ''; // Reset fullMessage after sending media with caption
          } catch (error) {
            console.error(`Failed to send media for property: ${property.street}`, error);
          }
        }
      }

      // Send text message if there's any remaining message content
      if (fullMessage) {
        try {
          const result = await greenApi.sendMessage(chatId, fullMessage);
          if (result.status === 'queued') {
            queuedCount++;
          } else {
            successCount++;
          }
          console.log(`Message ${result.status} for ${customer.First_name} ${customer.Last_name}`);
        } catch (error) {
          console.error(`Failed to send message to ${customer.First_name} ${customer.Last_name}:`, error);
          failCount++;
        }
      }

      // Wait for 15 seconds between messages
      if (selectedCustomers.indexOf(customer) < selectedCustomers.length - 1) {
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

  useEffect(() => {
    if (selectedCustomers.length > 0 && selectedProperties.length > 0) {
      const previewCustomer = selectedCustomers[0];
      const previewProperty = selectedProperties[0];
      setPreviewMessage(generatePersonalizedMessage(previewCustomer, previewProperty));
    }
  }, [message, selectedCustomers, selectedProperties]);

  const CustomerCard = ({ customer, property, isSelected, onSelect }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const matchResult = calculateMatchPercentage(property, customer);

    const renderMatchIndicator = (detail) => {
      if (!detail) return <span className="text-gray-500">-</span>;
      return detail.score > 0 ? 
        <span className="text-green-500 font-bold">✓</span> : 
        <span className="text-red-500 font-bold">✕</span>;
    };

    const formatPropertyValue = (key, value) => {
      if (key === 'Elevator' || key === 'parking' || key === 'saferoom') {
        return isPositiveValue(value) ? 'יש' : 'אין';
      }
      return value;
    };

    // פונקציה לקיצור רשימת הדרישות שלא מתקיימות
    const getShortDealBreakers = () => {
      if (!matchResult.dealBreakers?.length) return '';
      return matchResult.dealBreakers.map(warning => {
        // מקצר כל אזהרה למילה אחת
        if (warning.includes('מעלית')) return 'מעלית';
        if (warning.includes('חניה')) return 'חניה';
        if (warning.includes('ממ"ד')) return 'ממ"ד';
        if (warning.includes('דירת גן')) return 'דירת גן';
        if (warning.includes('שקטה')) return 'שקט';
        if (warning.includes('משופץ')) return 'שיפוץ';
        return warning;
      }).join(', ');
    };

    if (!matchResult || !matchResult.matchDetails) {
      return <div>טוען...</div>;
    }

    return (
      <div className={`p-4 rounded-lg shadow-sm mb-4 transition-all duration-300 ${
        isSelected ? 'bg-gray-900 border-2 border-yellow-500' : 'bg-gray-800'
      }`}>
        {/* כרטיס מצומצם */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="text-xl font-bold text-yellow-500">
              {customer.First_name} {customer.Last_name}
            </h3>
            <span className="text-lg text-white">
              ({matchResult.score?.toFixed(1)}% התאמה)
            </span>
            {matchResult.dealBreakers?.length > 0 && (
              <div className="flex items-center">
                <span className="text-red-500 text-lg ml-2">⚠️</span>
                <span className="text-red-400 text-sm">
                  חסר: {getShortDealBreakers()}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
            >
              {isExpanded ? 'הסתר פרטים' : 'הצג פרטים'}
            </button>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onSelect(customer)}
              className="h-5 w-5"
            />
          </div>
        </div>

        {/* פרטים מורחבים */}
        {isExpanded && (
          <div className="mt-4 border-t border-gray-700 pt-4">
            <div className="flex flex-col md:flex-row gap-6">
              {/* טבלת התאמות */}
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-yellow-500 mb-3">פרטי התאמה</h4>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-gray-400 border-b border-gray-700">
                        <th className="text-right pb-2">פרמטר</th>
                        <th className="text-right pb-2">ערך נדרש</th>
                        <th className="text-right pb-2">ערך בנכס</th>
                        <th className="text-center pb-2">התאמה</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="py-1">תקציב</td>
                        <td className="py-1">₪{customer.Budget?.toLocaleString()}</td>
                        <td className="py-1">₪{property.price?.toLocaleString()}</td>
                        <td className="text-center">{renderMatchIndicator(matchResult.matchDetails.budget)}</td>
                      </tr>
                      <tr>
                        <td className="py-1">מ"ר</td>
                        <td className="py-1">{customer.Square_meters}</td>
                        <td className="py-1">{property.square_meters}</td>
                        <td className="text-center">{renderMatchIndicator(matchResult.matchDetails.squareMeters)}</td>
                      </tr>
                      <tr>
                        <td className="py-1">חדרים</td>
                        <td className="py-1">{customer.Rooms}</td>
                        <td className="py-1">{property.rooms}</td>
                        <td className="text-center">{renderMatchIndicator(matchResult.matchDetails.rooms)}</td>
                      </tr>
                      <tr>
                        <td className="py-1">מעלית</td>
                        <td className="py-1">{customer.Elevator === 'must_yes' ? 'חובה' : 'לא חובה'}</td>
                        <td className="py-1">{formatPropertyValue('Elevator', property.Elevator)}</td>
                        <td className="text-center">{renderMatchIndicator(matchResult.matchDetails.elevator)}</td>
                      </tr>
                      <tr>
                        <td className="py-1">חניה</td>
                        <td className="py-1">{customer.parking === 'must_yes' ? 'חובה' : 'לא חובה'}</td>
                        <td className="py-1">{formatPropertyValue('parking', property.parking)}</td>
                        <td className="text-center">{renderMatchIndicator(matchResult.matchDetails.parking)}</td>
                      </tr>
                      <tr>
                        <td className="py-1">ממ"ד</td>
                        <td className="py-1">{customer.saferoom === 'must_yes' ? 'חובה' : 'לא חובה'}</td>
                        <td className="py-1">{formatPropertyValue('saferoom', property.saferoom)}</td>
                        <td className="text-center">{renderMatchIndicator(matchResult.matchDetails.saferoom)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* דרישות שלא מתקיימות */}
              {matchResult.dealBreakers?.length > 0 && (
                <div className="md:w-1/3">
                  <h4 className="text-lg font-semibold text-red-500 mb-3">דרישות שלא מתקיימות</h4>
                  <div className="bg-red-900 bg-opacity-20 p-4 rounded-lg">
                    <ul className="list-disc list-inside text-red-400 space-y-2">
                      {matchResult.dealBreakers.map((warning, idx) => (
                        <li key={idx}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const isPositiveValue = (value) => {
    if (!value) return false;
    const stringValue = String(value).toLowerCase().trim();
    
    // אם מכיל את המילה "יש" או "כן" - זה חיובי
    if (stringValue.includes('יש') || stringValue === 'כן') return true;
    
    // אם מכיל את המילה "אין" או "לא" - זה שלילי
    if (stringValue.includes('אין') || stringValue === 'לא') return false;
    
    return false; // ברירת מחדל - אם לא בטוחים, נניח שאין
  };

  const renderPropertyDetails = (property) => {
    return (
      <div className="bg-gray-800 p-6 rounded-lg mb-6 shadow-lg border border-gray-700">
        {/* כותרת */}
        <div className="border-b border-gray-700 pb-4 mb-6">
          <h2 className="text-3xl font-bold text-yellow-500 flex items-center gap-3">
            <BsBuilding className="text-2xl" />
            <span>{property.street}</span>
          </h2>
          <div className="mt-2 text-gray-400 flex items-center gap-2">
            <BsPinMap />
            <span>{property.Area}</span>
          </div>
        </div>

        {/* פרטים עיקריים */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-6">
          {/* מחיר */}
          <div className="bg-gray-900 p-4 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-500 mb-1 text-sm">
              <BsCash />
              <span>מחיר</span>
            </div>
            <div className="text-xl font-bold">{property.price?.toLocaleString()} ₪</div>
          </div>

          {/* חדרים */}
          <div className="bg-gray-900 p-4 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-500 mb-1 text-sm">
              <BsDoorOpen />
              <span>חדרים</span>
            </div>
            <div className="text-xl font-bold">{property.rooms}</div>
          </div>

          {/* מ"ר */}
          <div className="bg-gray-900 p-4 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-500 mb-1 text-sm">
              <BsRulers />
              <span>שטח</span>
            </div>
            <div className="text-xl font-bold">{property.square_meters} מ"ר</div>
          </div>

          {/* קומה */}
          <div className="bg-gray-900 p-4 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-500 mb-1 text-sm">
              <BsBuilding />
              <span>קומה</span>
            </div>
            <div className="text-xl font-bold">{property.floor} מתוך {property.max_floor}</div>
          </div>
        </div>

        {/* מאפיינים */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* מעלית */}
          <div className={`flex items-center gap-3 p-3 rounded-lg ${
            isPositiveValue(property.Elevator) ? 'bg-green-900/30' : 'bg-red-900/30'
          }`}>
            <BsArrowUpSquare className={`text-xl ${
              isPositiveValue(property.Elevator) ? 'text-green-500' : 'text-red-500'
            }`} />
            <span className={isPositiveValue(property.Elevator) ? 'text-green-400' : 'text-red-400'}>
              {isPositiveValue(property.Elevator) ? 'יש מעלית' : 'אין מעלית'}
            </span>
          </div>

          {/* חניה */}
          <div className={`flex items-center gap-3 p-3 rounded-lg ${
            isPositiveValue(property.parking) ? 'bg-green-900/30' : 'bg-red-900/30'
          }`}>
            <BsFillCarFrontFill className={`text-xl ${
              isPositiveValue(property.parking) ? 'text-green-500' : 'text-red-500'
            }`} />
            <span className={isPositiveValue(property.parking) ? 'text-green-400' : 'text-red-400'}>
              {isPositiveValue(property.parking) ? 'יש חניה' : 'אין חניה'}
            </span>
          </div>

          {/* ממ"ד */}
          <div className={`flex items-center gap-3 p-3 rounded-lg ${
            isPositiveValue(property.saferoom) ? 'bg-green-900/30' : 'bg-red-900/30'
          }`}>
            <BsShieldFill className={`text-xl ${
              isPositiveValue(property.saferoom) ? 'text-green-500' : 'text-red-500'
            }`} />
            <span className={isPositiveValue(property.saferoom) ? 'text-green-400' : 'text-red-400'}>
              {isPositiveValue(property.saferoom) ? 'יש ממ"ד' : 'אין ממ"ד'}
            </span>
          </div>

          {/* מרפסת */}
          <div className={`flex items-center gap-3 p-3 rounded-lg ${
            isPositiveValue(property.Balcony) ? 'bg-green-900/30' : 'bg-red-900/30'
          }`}>
            <BsWindow className={`text-xl ${
              isPositiveValue(property.Balcony) ? 'text-green-500' : 'text-red-500'
            }`} />
            <span className={isPositiveValue(property.Balcony) ? 'text-green-400' : 'text-red-400'}>
              {isPositiveValue(property.Balcony) ? 
                (property.balcony_size ? `מרפסת ${property.balcony_size}מ"ר` : 'יש מרפסת') : 
                'אין מרפסת'}
            </span>
          </div>

          {/* מיזוג */}
          <div className={`flex items-center gap-3 p-3 rounded-lg ${
            isPositiveValue(property.airways) ? 'bg-green-900/30' : 'bg-red-900/30'
          }`}>
            <BsSnow className={`text-xl ${
              isPositiveValue(property.airways) ? 'text-green-500' : 'text-red-500'
            }`} />
            <span className={isPositiveValue(property.airways) ? 'text-green-400' : 'text-red-400'}>
              {isPositiveValue(property.airways) ? 'יש מיזוג' : 'אין מיזוג'}
            </span>
          </div>

          {/* מצב הנכס */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-900/50">
            <BsTools className="text-xl text-yellow-500" />
            <span>{property.condition || 'לא צוין'}</span>
          </div>

          {/* תמ"א */}
          {isPositiveValue(property.TMA_potential) && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-900/30">
              <BsHouseFill className="text-xl text-blue-500" />
              <span className="text-blue-400">פוטנציאל תמ"א</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex justify-center items-center z-50">
          <div className="bg-black p-6 rounded-lg shadow-xl">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-yellow-500 mx-auto"></div>
            <p className="mt-4 text-lg font-semibold text-white">טוע�� נתונים...</p>
          </div>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <div className="container mx-auto p-8 bg-black rounded-xl shadow-2xl text-white">
        {isFromPropertiesPage ? (
          selectedProperties.map(property => renderPropertyDetails(property))
        ) : (
          <h1 className="text-4xl font-bold mb-8 text-yellow-500 text-center">
            פרטי הלקוח: {selectedCustomers.map(c => `${c.First_name} ${c.Last_name}`).join(' | ')}
          </h1>
        )}
        
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <input 
              type="text" 
              placeholder={isFromPropertiesPage ? "חפש לקוחות..." : "חפש נכסים..."} 
              className="p-2 border border-yellow-500 rounded bg-gray-800 text-white"
              value={searchQuery}
              onChange={handleSearchChange}
            />
            {isFromPropertiesPage && (
              <button
                onClick={() => setSortByMatch(!sortByMatch)}
                className={`px-4 py-2 rounded transition-colors ${
                  sortByMatch 
                    ? 'bg-yellow-500 text-black' 
                    : 'bg-gray-700 text-white hover:bg-gray-600'
                }`}
              >
                {sortByMatch ? '✓ ממוין לפי התאמה' : 'מיין לפי התאמה'}
              </button>
            )}
          </div>
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
                    <CustomerCard 
                      key={customer.id} 
                      customer={customer} 
                      property={selectedProperties[0]} 
                      isSelected={selectedCustomers.includes(customer)} 
                      onSelect={handleCustomerSelection}
                    />
                  ))
                : selectedProperties.map(property => (
                    <CustomerCard 
                      key={property.id} 
                      customer={selectedCustomers[0]} 
                      property={property} 
                      isSelected={selectedCustomers.includes(selectedCustomers[0])} 
                      onSelect={handleCustomerSelection}
                    />
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
              {isFromPropertiesPage && (
               <div className="mb-4">
               <h3 className="text-lg font-bold mb-2 text-yellow-500">הוספת מדיה</h3>
               <div className="relative inline-block">
                 <button 
                   className="px-4 py-2 bg-blue-500 text-white rounded-lg opacity-50 cursor-not-allowed transition duration-300"
                   disabled
                 >
                   בחר תמונה/וידאו
                 </button>
                 <span className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                   בבנייה
                 </span>
               </div>
             </div>
              )}
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
              <div className="p-4 border border-yellow-500 rounded-lg bg-gray-900 text-white h-48 overflow-y-auto">
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