import React, { useState, useEffect } from 'react';
import { fetchProperties } from '../../utils/airtable';
import { calculateMatchPercentage, getAllCriteria } from '../../utils/matching';
import { FaCheck, FaTimes, FaPhone, FaWhatsapp } from 'react-icons/fa';

const MatchPropertiesModal = ({ customer, onClose, onSendMessage }) => {
  const [properties, setProperties] = useState([]);
  const [selectedProperties, setSelectedProperties] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [criteriaVisibility, setCriteriaVisibility] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadProperties = async () => {
      try {
        const propertiesData = await fetchProperties();
        const propertiesWithMatch = propertiesData.map(property => {
          const matchResult = calculateMatchPercentage(customer, property);
          return {
            ...property,
            matchResult,
            allCriteria: getAllCriteria(customer, property)
          };
        });
        setProperties(propertiesWithMatch);
      } catch (err) {
        console.error('Error loading properties:', err);
        setError('אירעה שגיאה בטעינת הנכסים');
      } finally {
        setLoading(false);
      }
    };

    loadProperties();
  }, [customer]);

  const togglePropertySelection = (property) => {
    setSelectedProperties(prev => 
      prev.some(p => p.id === property.id)
        ? prev.filter(p => p.id !== property.id)
        : [...prev, property]
    );
  };

  const toggleCriteriaVisibility = (propertyId) => {
    setCriteriaVisibility(prev => ({
      ...prev,
      [propertyId]: !prev[propertyId]
    }));
  };

  const filteredProperties = properties
    .filter(property => property.matchResult.score > 0)
    .filter(property => 
      !searchTerm || 
      property.street?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => b.matchResult.score - a.matchResult.score);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-900 bg-opacity-90 flex justify-center items-center">
        <div className="text-white text-xl">טוען נכסים...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-gray-900 bg-opacity-90 flex justify-center items-center">
        <div className="text-red-500 text-xl">{error}</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-90 overflow-y-auto h-full w-full flex justify-center items-start pt-10 z-50">
      <div className="bg-gray-800 p-6 rounded-lg max-w-6xl w-full min-w-[100vw] max-h-[100vh] overflow-hidden flex flex-col relative shadow-2xl">
        <div className="bg-gray-900 p-4 rounded-lg mb-4">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-yellow-500 mb-2">
                {customer.First_name} {customer.Last_name}
              </h2>
              <div className="grid grid-cols-2 gap-4 text-white">
                <div>
                  <p><span className="text-yellow-500">תקציב:</span> ₪{customer.Budget?.toLocaleString()}</p>
                  <p><span className="text-yellow-500">חדרים:</span> {customer.Rooms}</p>
                  <p><span className="text-yellow-500">שטח מבוקש:</span> {customer.Square_meters} מ"ר</p>
                </div>
                <div>
                  <p><span className="text-yellow-500">טלפון:</span> {customer.Phone}</p>
                  <p><span className="text-yellow-500">אזורים מבוקשים:</span> {customer.area?.join(', ')}</p>
                  <div className="flex gap-2 mt-2">
                    <a href={`tel:${customer.Phone}`} className="flex items-center gap-1 text-blue-400 hover:text-blue-300">
                      <FaPhone /> חייג
                    </a>
                    <a href={`https://wa.me/972${customer.Phone?.substring(1)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-green-400 hover:text-green-300">
                      <FaWhatsapp /> ווטסאפ
                    </a>
                  </div>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="text-red-500 text-3xl font-bold hover:text-red-700 transition">&times;</button>
          </div>
        </div>

        <div className="mb-4 sticky top-16 bg-gray-800 z-10 pb-4">
          <input
            type="text"
            placeholder="חיפוש פי כתובת..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-3 border border-yellow-500 rounded bg-gray-700 text-white focus:outline-none focus:ring focus:ring-yellow-500"
          />
        </div>

        <div className="overflow-y-auto flex-grow">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProperties.map(property => (
              <div 
                key={property.id} 
                className={`relative border p-4 rounded transition-all ${
                  property.matchResult.score >= 80 ? 'bg-green-900/20 border-green-500' :
                  property.matchResult.score >= 60 ? 'bg-yellow-900/20 border-yellow-500' :
                  'bg-red-900/20 border-red-500'
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-bold text-white">{property.street}</h3>
                  <span className={`text-lg font-bold ${
                    property.matchResult.score >= 80 ? 'text-green-500' :
                    property.matchResult.score >= 60 ? 'text-yellow-500' :
                    'text-red-500'
                  }`}>
                    {property.matchResult.score}% התאמה
                  </span>
                </div>

                <div className="space-y-2 text-white">
                  <p className="text-lg font-bold">₪{property.price?.toLocaleString()}</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p>חדרים: {property.rooms}</p>
                    <p>שטח: {property.square_meters} מ"ר</p>
                    <p>קומה: {property.floor}</p>
                    <p>מעלית: {property.Elevator ? 'יש' : 'אין'}</p>
                    <p>חניה: {property.parking ? 'יש' : 'אין'}</p>
                    <p>מרפסת: {property.Balcony ? 'יש' : 'אין'}</p>
                  </div>
                </div>

                {property.matchResult.dealBreakers.length > 0 && (
                  <div className="mt-2 p-2 bg-red-900/30 rounded">
                    <p className="text-red-400 font-bold">חריגות:</p>
                    <ul className="list-disc list-inside text-red-300 text-sm">
                      {property.matchResult.dealBreakers.map((dealBreaker, index) => (
                        <li key={index}>{dealBreaker}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-4 space-y-2">
                  <button 
                    onClick={() => toggleCriteriaVisibility(property.id)}
                    className="w-full px-3 py-2 bg-blue-500 text-white font-bold rounded shadow hover:bg-blue-600 transition-colors"
                  >
                    {criteriaVisibility[property.id] ? 'הסתר פרטים' : 'הצג פרטים'}
                  </button>

                  <button 
                    onClick={() => togglePropertySelection(property)}
                    className={`w-full px-3 py-2 font-bold rounded shadow transition-colors ${
                      selectedProperties.some(p => p.id === property.id)
                        ? 'bg-green-500 text-white hover:bg-green-600'
                        : 'bg-yellow-500 text-black hover:bg-yellow-600'
                    }`}
                  >
                    {selectedProperties.some(p => p.id === property.id) ? 'נבחר' : 'בחר נכס'}
                  </button>
                </div>

                {criteriaVisibility[property.id] && (
                  <div className="mt-4">
                    <table className="w-full text-sm text-white">
                      <thead>
                        <tr className="border-b border-gray-600">
                          <th className="text-right py-2">קריטריון</th>
                          <th className="text-right py-2">דרישת הלקוח</th>
                          <th className="text-right py-2">בנכס</th>
                          <th className="text-center py-2">התאמה</th>
                        </tr>
                      </thead>
                      <tbody>
                        {property.allCriteria.map((criteria, index) => (
                          <tr key={index} className="border-b border-gray-700">
                            <td className="py-2">{criteria.name}</td>
                            <td className="py-2">{criteria.customerValue}</td>
                            <td className="py-2">{criteria.propertyValue}</td>
                            <td className="text-center py-2">
                              {criteria.match ? (
                                <FaCheck className="inline text-green-500" />
                              ) : (
                                <FaTimes className="inline text-red-500" />
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="sticky bottom-0 left-0 w-full bg-gray-900 p-4 flex justify-between border-t border-yellow-500 mt-4">
          <button 
            onClick={onClose}
            className="px-6 py-3 bg-red-500 text-white font-semibold rounded shadow hover:bg-red-600 transition-colors"
          >
            יציאה
          </button>
          <button 
            onClick={() => onSendMessage(selectedProperties)}
            disabled={selectedProperties.length === 0}
            className={`px-6 py-3 bg-yellow-500 text-black font-semibold rounded shadow hover:bg-yellow-600 transition-colors ${
              selectedProperties.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            שלח הודעה עם הנכסים שנבחרו ({selectedProperties.length})
          </button>
        </div>
      </div>
    </div>
  );
};

export default MatchPropertiesModal;
