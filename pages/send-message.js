import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { fetchProperties, fetchCustomers } from '../utils/airtable';
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
  BsPinMap,
  BsCalendarCheck,
  BsImage,
  BsFile
} from 'react-icons/bs';

const PropertyDetails = React.memo(({ property }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-gray-800 p-4 rounded-lg mb-4 shadow-lg border border-gray-700">
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-yellow-500 flex items-center gap-3">
            <BsBuilding className="text-xl" />
            <span>{property.street}</span>
          </h2>
          <div className="flex items-center gap-4 text-lg">
            <span className="text-yellow-500">{property.price?.toLocaleString()} ₪</span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-300">{property.rooms} חדרים</span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-300">{property.square_meters} מ"ר</span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-300">קומה {property.floor}</span>
          </div>
        </div>
        <button className="text-yellow-500 transition-transform duration-300" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          ▼
        </button>
      </div>

      {isExpanded && (
        <div className="mt-4 border-t border-gray-700 pt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div className={`flex items-center gap-3 p-3 rounded-lg ${
              property.Elevator ? 'bg-green-900/30' : 'bg-red-900/30'
            }`}>
              <BsArrowUpSquare className={property.Elevator ? 'text-green-500' : 'text-red-500'} />
              <span className={property.Elevator ? 'text-green-400' : 'text-red-400'}>
                {property.Elevator ? 'יש מעלית' : 'אין מעלית'}
              </span>
            </div>

            <div className={`flex items-center gap-3 p-3 rounded-lg ${
              property.parking ? 'bg-green-900/30' : 'bg-red-900/30'
            }`}>
              <BsFillCarFrontFill className={property.parking ? 'text-green-500' : 'text-red-500'} />
              <span className={property.parking ? 'text-green-400' : 'text-red-400'}>
                {property.parking ? 'יש חניה' : 'אין חניה'}
              </span>
            </div>

            <div className={`flex items-center gap-3 p-3 rounded-lg ${
              property.saferoom ? 'bg-green-900/30' : 'bg-red-900/30'
            }`}>
              <BsShieldFill className={property.saferoom ? 'text-green-500' : 'text-red-500'} />
              <span className={property.saferoom ? 'text-green-400' : 'text-red-400'}>
                {property.saferoom ? 'יש ממ"ד' : 'אין ממ"ד'}
              </span>
            </div>

            <div className={`flex items-center gap-3 p-3 rounded-lg ${
              property.Balcony ? 'bg-green-900/30' : 'bg-red-900/30'
            }`}>
              <BsWindow className={property.Balcony ? 'text-green-500' : 'text-red-500'} />
              <span className={property.Balcony ? 'text-green-400' : 'text-red-400'}>
                {property.Balcony ? 'יש מרפסת' : 'אין מרפסת'}
              </span>
            </div>

            <div className={`flex items-center gap-3 p-3 rounded-lg ${
              property.airways ? 'bg-green-900/30' : 'bg-red-900/30'
            }`}>
              <BsSnow className={property.airways ? 'text-green-500' : 'text-red-500'} />
              <span className={property.airways ? 'text-green-400' : 'text-red-400'}>
                {property.airways ? 'יש מיזוג' : 'אין מיזוג'}
              </span>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-900/50">
              <BsTools className="text-xl text-yellow-500" />
              <span>{property.condition || 'לא צוין'}</span>
            </div>

            {property.TMA_potential && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-900/30">
                <BsHouseFill className="text-xl text-blue-500" />
                <span className="text-blue-400">פוטנציאל תמ"א</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

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
  const [sortByMatch, setSortByMatch] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState([]);
  const [scheduledTime, setScheduledTime] = useState('');
  const fileInputRef = useRef(null);
  const [mediaPreview, setMediaPreview] = useState([]);
  const [matchThreshold, setMatchThreshold] = useState(60);
  const [showThresholdDialog, setShowThresholdDialog] = useState(false);
  const [showNoResultsWarning, setShowNoResultsWarning] = useState(false);

  const customerTags = [
    '{{שם פרטי}}', '{{שם משפחה}}', '{{טלפון}}', '{{תקציב}}',
    '{{חדרים}}', '{{מטר רבוע}}', '{{קומה מועדפת}}', '{{אזור}}'
  ];

  const propertyTags = [
    '{{מחיר נכס}}', '{{חדרים בנכס}}', '{{מ"ר בנכס}}', '{{קומה בנכס}}',
    '{{קומה מקסימלית בנכס}}', '{{רחוב בנכס}}', '{{מעלית}}',
    '{{חניה}}', '{{ממ"ד}}', '{{מצב הנכס}}', '{{פוטנציאל תמ"א}}', '{{מרפסת}}',
    '{{מיזוג אוויר}}', '{{קמפיין}}'
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

  const checkFilterResults = (filtered) => {
    if (filtered.length === 0 && selectedProperties[0]) {
      setShowNoResultsWarning(true);
    } else {
      setShowNoResultsWarning(false);
    }
  };

  const filteredCustomers = React.useMemo(() => {
    let filtered = customers.filter(customer => {
      if (selectedProperties[0]) {
        const matchResult = calculateMatchPercentage(selectedProperties[0], customer);
        
        // בדיקת dealbreakers ואחוז התאמה מינימלי
        if (matchResult.dealBreakers?.length > 0 || matchResult.score < matchThreshold) {
          return false;
        }
      }

      const firstName = customer.First_name || '';
      const lastName = customer.Last_name || '';
      const cell = customer.Cell ? String(customer.Cell) : '';

      return firstName.toLowerCase().includes(searchQuery) ||
             lastName.toLowerCase().includes(searchQuery) ||
             cell.includes(searchQuery);
    });

    // בדיקת תוצאות הסינון
    checkFilterResults(filtered);

    if (sortByMatch && selectedProperties[0]) {
      filtered.sort((a, b) => {
        const matchA = calculateMatchPercentage(selectedProperties[0], a);
        const matchB = calculateMatchPercentage(selectedProperties[0], b);
        return matchB.score - matchA.score;
      });
    }

    return filtered;
  }, [customers, searchQuery, sortByMatch, selectedProperties, matchThreshold]);

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
      .replace(/{{קמפיין}}/g, property.Campaigns);
  };

  const handleMediaSelect = (event) => {
    const files = Array.from(event.target.files);
    setSelectedMedia(prev => [...prev, ...files]);
    
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setMediaPreview(prev => [...prev, { type: 'image', url: reader.result, file }]);
        };
        reader.readAsDataURL(file);
      } else if (file.type.startsWith('video/')) {
        const url = URL.createObjectURL(file);
        setMediaPreview(prev => [...prev, { type: 'video', url, file }]);
      } else {
        setMediaPreview(prev => [...prev, { type: 'file', name: file.name, size: file.size, file }]);
      }
    });
  };

  const removeMedia = (index) => {
    setSelectedMedia(prev => prev.filter((_, i) => i !== index));
    setMediaPreview(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = async () => {
    setSending(true);
    setSendingFeedback("מעבד הודעות...");

    let successCount = 0;
    let failCount = 0;
    let queuedCount = 0;

    const isScheduled = scheduledTime && new Date(scheduledTime) > new Date();

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
      }

      try {
        if (isScheduled) {
          greenApi.addToQueue(chatId, fullMessage, 'text', null, '', null, new Date(scheduledTime).getTime());
          queuedCount++;
          
          if (selectedMedia.length > 0) {
            for (const media of selectedMedia) {
              greenApi.addToQueue(chatId, '', 'file', media, fullMessage, null, new Date(scheduledTime).getTime());
            }
          }
        } else {
          const result = await greenApi.sendMessage(chatId, fullMessage);
          
          if (selectedMedia.length > 0) {
            for (const media of selectedMedia) {
              await greenApi.sendFile(chatId, media);
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }

          if (result.status === 'queued') {
            queuedCount++;
          } else {
            successCount++;
          }
        }
        
        console.log(`Message ${isScheduled ? 'scheduled' : 'sent'} for ${customer.First_name} ${customer.Last_name}`);
      } catch (error) {
        console.error(`Failed to ${isScheduled ? 'schedule' : 'send'} message to ${customer.First_name} ${customer.Last_name}:`, error);
        failCount++;
      }

      if (selectedCustomers.indexOf(customer) < selectedCustomers.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 15000));
      }
    }

    setSending(false);
    if (isScheduled) {
      setSendingFeedback(`תוזמנו ${queuedCount} הודעות לשליחה ב-${new Date(scheduledTime).toLocaleString('he-IL')}`);
    } else {
      setSendingFeedback(`נשלחו ${successCount} הודעות, ${queuedCount} בתור, ${failCount} נכשלו.`);
    }

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

  const handleSelectAll = () => {
    if (isFromPropertiesPage) {
      if (selectedCustomers.length === filteredCustomers.length) {
        setSelectedCustomers([]);
      } else {
        setSelectedCustomers(filteredCustomers);
      }
    } else {
      if (selectedProperties.length === filteredProperties.length) {
        setSelectedProperties([]);
      } else {
        setSelectedProperties(filteredProperties);
      }
    }
  };

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
        return value ? 'יש' : 'אין';
      }
      return value;
    };

    const getShortDealBreakers = () => {
      if (!matchResult?.dealBreakers?.length) return '';
      return matchResult.dealBreakers.map(warning => {
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

        {isExpanded && (
          <div className="mt-4 border-t border-gray-700 pt-4">
            <div className="flex flex-col md:flex-row gap-6">
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

  const NoResultsWarning = () => {
    return showNoResultsWarning && (
      <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4" role="alert">
        <p className="font-bold">לא נמצאו תוצאות</p>
        <p>נסה להוריד את אחוז ההתאמה המינימלי בהגדרות הסינון</p>
      </div>
    );
  };

  const ThresholdDialog = () => {
    const [newThreshold, setNewThreshold] = useState(matchThreshold);

    const handleSave = () => {
      setMatchThreshold(newThreshold);
      setShowThresholdDialog(false);
      // בדיקה מחדש של התוצאות עם האחוז החדש
      checkFilterResults(filteredCustomers);
    };

    if (!showThresholdDialog) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-xl" dir="rtl">
          <h3 className="text-lg font-bold mb-4">הגדרות סינון לקוחות</h3>
          <p className="mb-4">אחוז התאמה מינימלי להצגת לקוחות:</p>
          <div className="mb-4">
            <input
              type="range"
              min="0"
              max="100"
              value={newThreshold}
              onChange={(e) => setNewThreshold(Number(e.target.value))}
              className="w-full"
            />
            <div className="text-center mt-2 text-lg font-bold">{newThreshold}%</div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={handleSave}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              שמור
            </button>
            <button
              onClick={() => setShowThresholdDialog(false)}
              className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
            >
              ביטול
            </button>
          </div>
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
            <p className="mt-4 text-lg font-semibold text-white">טוען נתונים...</p>
          </div>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <div className="container mx-auto p-8 bg-black rounded-xl shadow-2xl text-white">
        {isFromPropertiesPage ? (
          selectedProperties.map(property => (
            <PropertyDetails key={property.id} property={property} />
          ))
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
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSortByMatch(!sortByMatch)}
                className={`px-4 py-2 rounded ${
                  sortByMatch ? 'bg-blue-500 text-white' : 'bg-gray-200'
                }`}
              >
                מיון לפי אחוזי התאמה
              </button>
              
              <button
                onClick={() => setShowThresholdDialog(true)}
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 flex items-center gap-2 text-black"
              >
                <span>הגדרות סינון</span>
                <span className="text-sm">({matchThreshold}%)</span>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={handleSelectAll}
              className="px-4 py-2 bg-yellow-500 text-black font-semibold rounded shadow hover:bg-yellow-600 transition-colors"
            >
              {isFromPropertiesPage ? 
                (selectedCustomers.length === filteredCustomers.length ? 'בטל בחירת הכל' : 'בחר הכל') :
                (selectedProperties.length === filteredProperties.length ? 'בטל בחירת הכל' : 'בחר הכל')
              }
            </button>
            <button 
              onClick={handleDeselectAll}
              className="px-4 py-2 bg-red-500 text-white font-semibold rounded shadow hover:bg-red-600 transition-colors"
            >
              נקה בחירה
            </button>
          </div>
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

              <div className="mb-4">
                <h3 className="text-lg font-bold mb-2 text-yellow-500">הוספת מדיה</h3>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
                  >
                    <BsImage />
                    <span>בחר קבצים</span>
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleMediaSelect}
                    className="hidden"
                    multiple
                    accept="image/*,video/*,application/*"
                  />
                </div>

                {selectedMedia.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {selectedMedia.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-700 p-2 rounded">
                        <span className="text-sm">{file.name}</span>
                        <button
                          onClick={() => removeMedia(index)}
                          className="text-red-500 hover:text-red-400"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mb-4">
                <h3 className="text-lg font-bold mb-2 text-yellow-500 flex items-center gap-2">
                  <BsCalendarCheck />
                  <span>תזמון שליחה</span>
                </h3>
                <input
                  type="datetime-local"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
              </div>

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
              <div className="space-y-4">
                <div className="p-4 border border-yellow-500 rounded-lg bg-gray-900 text-white h-48 overflow-y-auto">
                  <p className="whitespace-pre-wrap">{previewMessage}</p>
                </div>

                {mediaPreview.length > 0 && (
                  <div className="border border-yellow-500 rounded-lg bg-gray-900 p-4">
                    <h3 className="text-lg font-semibold mb-4 text-yellow-500">קבצים מצורפים:</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {mediaPreview.map((media, index) => (
                        <div key={index} className="relative group">
                          {media.type === 'image' && (
                            <div className="relative aspect-video">
                              <img 
                                src={media.url} 
                                alt="תצוגה מקדימה"
                                className="rounded-lg object-cover w-full h-full"
                              />
                            </div>
                          )}
                          {media.type === 'video' && (
                            <div className="relative aspect-video">
                              <video 
                                src={media.url} 
                                controls
                                className="rounded-lg w-full h-full"
                              />
                            </div>
                          )}
                          {media.type === 'file' && (
                            <div className="flex items-center gap-2 p-4 bg-gray-700 rounded-lg">
                              <BsFile className="text-yellow-500 text-2xl" />
                              <div>
                                <p className="text-sm font-medium">{media.name}</p>
                                <p className="text-xs text-gray-400">
                                  {(media.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                            </div>
                          )}
                          <button
                            onClick={() => removeMedia(index)}
                            className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center gap-4 mt-4">
              {scheduledTime ? (
                <button 
                  className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition duration-300 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleSendMessage}
                  disabled={sending || (!message.trim() && selectedMedia.length === 0) || new Date(scheduledTime) <= new Date()}
                >
                  <BsCalendarCheck />
                  <span>תזמן שליחה ל-{new Date(scheduledTime).toLocaleString('he-IL')}</span>
                </button>
              ) : (
                <button 
                  className="px-6 py-3 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 transition duration-300 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleSendMessage}
                  disabled={sending || (!message.trim() && selectedMedia.length === 0)}
                >
                  {sending ? (
                    <>
                      <span className="animate-spin">⌛</span>
                      <span>שולח...</span>
                    </>
                  ) : (
                    <span>שלח עכשיו</span>
                  )}
                </button>
              )}
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