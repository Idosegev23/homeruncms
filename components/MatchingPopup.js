import React, { useState, useEffect } from 'react';
import { calculateMatchPercentage } from '../utils/matching';
import { fetchProperties } from '../utils/airtable';
import { BsX, BsCheckCircle, BsXCircle, BsExclamationCircle } from 'react-icons/bs';

const MatchingPopup = ({ customer, onClose }) => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('match'); // 'match', 'price', 'area'
  const [sortDirection, setSortDirection] = useState('desc');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const loadProperties = async () => {
      try {
        const propertiesData = await fetchProperties();
        const propertiesWithMatch = propertiesData.map(property => ({
          ...property,
          matchResult: calculateMatchPercentage(property, customer)
        }));
        setProperties(propertiesWithMatch);
      } catch (error) {
        console.error('Error loading properties:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProperties();
  }, [customer]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('desc');
    }
  };

  const sortedProperties = [...properties].sort((a, b) => {
    const direction = sortDirection === 'asc' ? 1 : -1;
    switch (sortBy) {
      case 'match':
        return (a.matchResult.score - b.matchResult.score) * direction;
      case 'price':
        return (a.price - b.price) * direction;
      case 'area':
        return (a.Area?.localeCompare(b.Area) || 0) * direction;
      default:
        return 0;
    }
  }).filter(property => 
    property.street.toLowerCase().includes(filter.toLowerCase()) ||
    property.Area?.toLowerCase().includes(filter.toLowerCase())
  );

  const getMatchColor = (score) => {
    if (score >= 85) return 'bg-green-500/20 text-green-300 border-green-500/30';
    if (score >= 70) return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    if (score >= 50) return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    return 'bg-red-500/20 text-red-300 border-red-500/30';
  };

  const formatValue = (value, type) => {
    switch (type) {
      case 'price':
        return `₪${value?.toLocaleString()}`;
      case 'boolean':
        return value ? 'יש' : 'אין';
      default:
        return value || '-';
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-gray-800 p-8 rounded-xl shadow-xl">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500 mx-auto"></div>
          <p className="text-gray-300 mt-4">טוען נתונים...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl shadow-xl max-w-7xl w-full max-h-[90vh] flex flex-col">
        {/* כותרת */}
        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-amber-400">
            התאמת נכסים ל{customer.First_name} {customer.Last_name}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <BsX className="text-2xl text-gray-400" />
          </button>
        </div>

        {/* סרגל כלים */}
        <div className="p-4 border-b border-gray-800 flex gap-4">
          <input
            type="text"
            placeholder="חיפוש לפי כתובת או אזור..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 focus:outline-none focus:border-amber-500/50"
          />
          <div className="flex gap-2">
            <button
              onClick={() => handleSort('match')}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                sortBy === 'match' ? 'bg-amber-500/20 border-amber-500/30' : 'border-gray-700'
              }`}
            >
              מיין לפי התאמה
            </button>
            <button
              onClick={() => handleSort('price')}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                sortBy === 'price' ? 'bg-amber-500/20 border-amber-500/30' : 'border-gray-700'
              }`}
            >
              מיין לפי מחיר
            </button>
            <button
              onClick={() => handleSort('area')}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                sortBy === 'area' ? 'bg-amber-500/20 border-amber-500/30' : 'border-gray-700'
              }`}
            >
              מיין לפי אזור
            </button>
          </div>
        </div>

        {/* טבלת נכסים */}
        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="bg-gray-800/50 sticky top-0">
              <tr>
                <th className="p-3 text-right">התאמה</th>
                <th className="p-3 text-right">כתובת</th>
                <th className="p-3 text-right">אזור</th>
                <th className="p-3 text-right">מחיר</th>
                <th className="p-3 text-right">חדרים</th>
                <th className="p-3 text-right">מ"ר</th>
                <th className="p-3 text-right">קומה</th>
                <th className="p-3 text-center">מעלית</th>
                <th className="p-3 text-center">חניה</th>
                <th className="p-3 text-center">ממ"ד</th>
                <th className="p-3 text-center">מרפסת</th>
                <th className="p-3 text-right">מצב</th>
                <th className="p-3 text-right">חריגות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {sortedProperties.map(property => (
                <tr 
                  key={property.id}
                  className={`hover:bg-gray-800/30 transition-colors ${
                    property.matchResult.score < 50 ? 'bg-red-900/10' : ''
                  }`}
                >
                  <td className="p-3">
                    <span className={`px-3 py-1 rounded-lg border ${getMatchColor(property.matchResult.score)}`}>
                      {property.matchResult.score.toFixed(1)}%
                    </span>
                  </td>
                  <td className="p-3">{property.street}</td>
                  <td className="p-3">{property.Area}</td>
                  <td className="p-3">{formatValue(property.price, 'price')}</td>
                  <td className="p-3">{property.rooms}</td>
                  <td className="p-3">{property.square_meters}</td>
                  <td className="p-3">{property.floor} מתוך {property.max_floor}</td>
                  <td className="p-3 text-center">
                    {property.Elevator ? (
                      <BsCheckCircle className="mx-auto text-green-500" />
                    ) : (
                      <BsXCircle className="mx-auto text-red-500" />
                    )}
                  </td>
                  <td className="p-3 text-center">
                    {property.parking ? (
                      <BsCheckCircle className="mx-auto text-green-500" />
                    ) : (
                      <BsXCircle className="mx-auto text-red-500" />
                    )}
                  </td>
                  <td className="p-3 text-center">
                    {property.saferoom ? (
                      <BsCheckCircle className="mx-auto text-green-500" />
                    ) : (
                      <BsXCircle className="mx-auto text-red-500" />
                    )}
                  </td>
                  <td className="p-3 text-center">
                    {property.Balcony ? (
                      <BsCheckCircle className="mx-auto text-green-500" />
                    ) : (
                      <BsXCircle className="mx-auto text-red-500" />
                    )}
                  </td>
                  <td className="p-3">{property.condition}</td>
                  <td className="p-3">
                    {property.matchResult.dealBreakers.length > 0 && (
                      <div className="group relative">
                        <BsExclamationCircle className="text-red-500" />
                        <div className="absolute bottom-full right-0 mb-2 w-48 bg-gray-800 p-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <ul className="text-sm text-red-300 list-disc list-inside">
                            {property.matchResult.dealBreakers.map((warning, idx) => (
                              <li key={idx}>{warning}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* סיכום */}
        <div className="p-4 border-t border-gray-800">
          <div className="flex justify-between items-center">
            <div className="text-gray-400">
              סה"כ נמצאו {sortedProperties.length} נכסים
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-gray-400">התאמה גבוהה (85%+)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-gray-400">התאמה טובה (70-84%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <span className="text-gray-400">התאמה בינונית (50-69%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-gray-400">התאמה נמוכה (0-49%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchingPopup; 