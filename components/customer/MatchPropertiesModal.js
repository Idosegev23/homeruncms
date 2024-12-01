import React, { useState, useMemo } from 'react';
import { calculateMatchPercentage, getAllCriteria } from './utils';
import { FaCheck, FaTimes } from 'react-icons/fa'; // ספרייה להצגת אייקונים

const MatchPropertiesModal = ({ customer, properties, onClose, onSendMessage }) => {
  const [selectedProperties, setSelectedProperties] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [criteriaVisibility, setCriteriaVisibility] = useState({}); // מצב להצגת קריטריונים לפי נכס
  const [showLowMatches, setShowLowMatches] = useState(false);

  // פונקציה לבחירת נכס
  const togglePropertySelection = (property) => {
    setSelectedProperties(prev => 
      prev.some(p => p.id === property.id)
        ? prev.filter(p => p.id !== property.id)
        : [...prev, property]
    );
  };

  // פונקציה להחלפת מצב הצגת הקריטריונים עבור כל נכס
  const toggleCriteriaVisibility = (propertyId) => {
    setCriteriaVisibility(prev => ({
      ...prev,
      [propertyId]: !prev[propertyId] // החלפה בין הצגה להסתרה של הקריטריונים עבור הנכס המסוים
    }));
  };

  // סינון הנכסים והצגת אחוזי ההתאמה והקריטריונים (תואמים ולא תואמים)
  const filteredProperties = useMemo(() => {
    return properties
      .map(property => ({
        ...property,
        matchPercentage: calculateMatchPercentage(customer, property),
        allCriteria: getAllCriteria(customer, property), // החלפה ל-getAllCriteria
      }))
      .filter(property => property.matchPercentage > 0)
      .filter(property => 
        (property.street && property.street.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (property.city && property.city.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      .sort((a, b) => b.matchPercentage - a.matchPercentage);
  }, [properties, searchTerm, customer]);

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-90 overflow-y-auto h-full w-full flex justify-center items-start pt-10 z-50">
      <div className="bg-gray-800 p-6 rounded-lg max-w-6xl w-full min-w-[100vw] max-h-[100vh] overflow-hidden flex flex-col relative shadow-2xl"> {/* הגדלת רוחב המינימום */}
        
        {/* כותרת הפופאפ */}
        <div className="flex justify-between items-center mb-4 sticky top-0 bg-gray-800 z-10 pb-4 border-b border-yellow-500">
          <h2 className="text-xl font-bold text-yellow-500">
            נכסים מתאימים עבור {customer.First_name} {customer.Last_name}
          </h2>
          <button onClick={onClose} className="text-red-500 text-3xl font-bold hover:text-red-700 transition">&times;</button>
        </div>

        {/* שדה חיפוש */}
        <div className="mb-4 sticky top-16 bg-gray-800 z-10 pb-4">
          <input
            type="text"
            placeholder="חיפוש לפי כתובת או עיר..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-3 border border-yellow-500 rounded bg-gray-700 text-white focus:outline-none focus:ring focus:ring-yellow-500"
          />
        </div>

        {/* הצגת נכסים מסוננים ב-4 עמודות */}
        <div className="overflow-y-auto flex-grow">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"> {/* שינוי ל-4 עמודות */}
            {filteredProperties.map(property => (
              <div 
                key={property.id} 
                className="relative border p-4 rounded transition-all bg-gray-700 hover:shadow-md"
              >
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-bold text-white">{property.street}, {property.city}</h3>
                  <span className="text-lg font-bold text-yellow-500">{property.matchPercentage}% התאמה</span>
                </div>
                <p className="text-white">מחיר: ₪{property.price ? Number(property.price).toLocaleString() : 'לא זמין'}</p>
                <p className="text-white">חדרים: {property.rooms}</p>
                <p className="text-white">שטח: {property.square_meters} מ"ר</p>
                <p className="text-white">קומה: {property.floor}</p>

                {/* כפתור להצגת הקריטריונים */}
                <button 
                  onClick={() => toggleCriteriaVisibility(property.id)} 
                  className="mb-2 px-3 py-2 bg-blue-500 text-white font-bold rounded shadow hover:bg-blue-600 transition-colors"
                >
                  {criteriaVisibility[property.id] ? 'הסתר קריטריונים' : 'הצג קריטריונים'}
                </button>

                {/* כפתור לבחירת הנכס לשליחת הודעה */}
                <button 
                  onClick={() => togglePropertySelection(property)} 
                  className={`px-3 py-2 mt-2 font-bold rounded shadow ${selectedProperties.some(p => p.id === property.id) ? 'bg-green-500 text-white' : 'bg-yellow-500 text-black'} hover:bg-green-600 transition-colors`}
                >
                  {selectedProperties.some(p => p.id === property.id) ? 'נבחר' : 'בחר נכס'}
                </button>

                {/* הצגת הקריטריונים בטבלה מסודרת */}
                {criteriaVisibility[property.id] && property.allCriteria.length > 0 && (
                  <div className="mt-2 p-2 bg-gray-700 rounded-lg overflow-auto">
                    <p className="font-bold text-yellow-500 mb-2">קריטריונים:</p>
                    <table className="w-full text-sm text-white border-collapse border border-yellow-500">
                      <thead>
                        <tr>
                          <th style={{ width: '25%' }} className="text-left p-2 border border-yellow-500">קריטריון</th>
                          <th style={{ width: '25%' }} className="text-left p-2 border border-yellow-500">מה ביקש הלקוח</th>
                          <th style={{ width: '25%' }} className="text-left p-2 border border-yellow-500">מה יש בנכס</th>
                          <th style={{ width: '25%' }} className="text-center p-2 border border-yellow-500">התאמה</th>
                        </tr>
                      </thead>
                      <tbody>
                        {property.allCriteria.map((criteria, index) => (
                          <tr key={index} className="border border-yellow-500">
                            <td className="p-2 border border-yellow-500">{translateCriteria(criteria.name)}</td>
                            <td className="p-2 border border-yellow-500">{translateCriteriaValue(criteria.customerValue)}</td>
                            <td className="p-2 border border-yellow-500">{translateCriteriaValue(criteria.propertyValue)}</td>
                            <td className="text-center p-2 border border-yellow-500">
                              {criteria.match ? <FaCheck className="text-green-500" /> : <FaTimes className="text-red-500" />}
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

        {/* כפתורי פעולות */}
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
            className={`px-6 py-3 bg-yellow-500 text-black font-semibold rounded shadow hover:bg-yellow-600 transition-colors ${selectedProperties.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            שלח הודעה עם הנכסים שנבחרו
          </button>
        </div>
      </div>
    </div>
  );
};

// פונקציה לתרגום הקריטריונים מאנגלית לעברית
const translateCriteria = (key) => {
  const translations = {
    'Budget': 'תקציב',
    'Rooms': 'חדרים',
    'Square meters': 'שטח',
    'Elevator': 'מעלית',
    'Parking': 'חניה',
    'Area': 'אזור',
    'Saferoom': 'ממ"ד',
    'Asset type': 'סוג נכס',
    'Investment': 'השקעה',
    'Land floor': 'קומת קרקע',
    'Garden apartment': 'דירת גן',
    'Quiet': 'שקטה',
    'Renovated': 'משופץ',
    'Sun balcony': 'מרפסת שמש',
    'TMA potential': 'פוטנציאל תמ"א',
    'Tower': 'מגדל',
    'Apartment from project': 'דירה מפרויקט',
    'Shelter': 'מקלט'
  };
  
  return translations[key] || key;
};

const translateCriteriaValue = (value) => {
  const translations = {
    'yes': 'כן',
    'no': 'לא',
    'must_yes': 'חובה כן',
    'must_no': 'חובה לא'
  };
  
  return translations[value] || value;
};

export default MatchPropertiesModal;
