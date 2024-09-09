import React from 'react';
import { PencilSquareIcon, TrashIcon, HomeIcon, XMarkIcon } from '@heroicons/react/24/outline';

const CustomerDetailsModal = ({ customer, onClose, onEdit, onDelete, onMatchProperties }) => {
  if (!customer) return null;

  const translateValue = (value) => {
    const translations = {
      'yes': 'כן',
      'no': 'לא',
      'must_yes': 'חובה כן',
      'must_no': 'חובה לא',
      'true': 'כן',
      'false': 'לא',
      'normal': 'רגילה',
      'robotic': 'רובוטית',
      'shared': 'משותפת',
      'semi-shared': 'משותפת לא 100%',
      // הוסף תרגומים נוספים כאן
    };
    return translations[value] || value;
  };

  const formatValue = (value, type, isPhone = false) => {
    if (value == null || value === '') return 'לא צוין';
    
    switch (type) {
      case 'number':
        return isPhone ? value.toString() : Number(value).toLocaleString('he-IL');
      case 'currency':
        return `₪${Number(value).toLocaleString('he-IL')}`;
      case 'single_select':
        return translateValue(value);
      case 'multiple_select':
        return Array.isArray(value) 
          ? value.map(translateValue).join(', ')
          : value.split(',').map(v => translateValue(v.trim())).join(', ');
      default:
        return value;
    }
  };

  const detailSections = [
    {
      title: 'פרטים אישיים',
      details: [
        { label: 'שם פרטי', value: customer.First_name, type: 'text' },
        { label: 'שם משפחה', value: customer.Last_name, type: 'text' },
        { label: 'טלפון', value: customer.Cell, type: 'number', isPhone: true },
        { label: 'תקציב', value: customer.Budget, type: 'currency' },
      ]
    },
    {
      title: 'פרטי נכס מבוקש',
      details: [
        { label: 'חדרים', value: customer.Rooms, type: 'number' },
        { label: 'מ"ר', value: customer.Square_meters, type: 'number' },
        { label: 'סוג נכס', value: customer.Asset_type, type: 'multiple_select' },
        { label: 'השקעה', value: customer.investment, type: 'single_select' },
        { label: 'קומת קרקע', value: customer.land_floor, type: 'single_select' },
        { label: 'דירת גן', value: customer.garden_apt, type: 'single_select' },
        { label: 'שקט', value: customer.quiet, type: 'single_select' },
        { label: 'מעלית', value: customer.Elevator, type: 'single_select' },
        { label: 'חניה', value: customer.parking, type: 'single_select' },
        { label: 'סוג חניה', value: customer.parking_type, type: 'multiple_select' },
      ]
    },
    {
      title: 'העדפות נוספות',
      details: [
        { label: 'משופץ', value: customer.renovated, type: 'single_select' },
        { label: 'מרפסת שמש', value: customer.sun_balcony, type: 'single_select' },
        { label: 'פוטנציאל תמ"א', value: customer.TMA_potential, type: 'single_select' },
        { label: 'אזור', value: customer.area, type: 'multiple_select' },
        { label: 'אזור הכרחי', value: customer.area_is_must, type: 'single_select' },
        { label: 'מגדל בסדר', value: customer.tower_is_ok, type: 'single_select' },
        { label: 'דירה מפרויקט', value: customer.apt_from_project, type: 'single_select' },
        { label: 'ממ"ד', value: customer.saferoom, type: 'single_select' },
        { label: 'מקלט בסדר', value: customer.shelter_is_ok, type: 'single_select' },
      ]
    }
  ];

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
      <div className="relative bg-black p-8 border border-gray-700 rounded-lg shadow-xl max-w-5xl w-full">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <XMarkIcon className="h-6 w-6" />
        </button>
        <h2 className="text-2xl font-bold mb-6 text-yellow-500">פרטי לקוח</h2>
        <div className="grid grid-cols-3 gap-6">
          {detailSections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-xl font-semibold mb-4 text-yellow-500">{section.title}</h3>
              {section.details.map((detail, detailIndex) => (
                <div key={detailIndex} className="mb-2">
                  <span className="font-semibold text-yellow-500">{detail.label}: </span>
                  <span className="text-white">
                    {formatValue(detail.value, detail.type, detail.isPhone)}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-end space-x-4">
          <button 
            onClick={() => onEdit(customer)} 
            className="p-2 bg-transparent border border-yellow-500 text-yellow-500 rounded hover:bg-yellow-500 hover:text-black transition-colors flex items-center"
          >
            <PencilSquareIcon className="h-5 w-5 mr-2" />
            ערוך
          </button>
          <button 
            onClick={() => onMatchProperties(customer)} 
            className="p-2 bg-transparent border border-green-500 text-green-500 rounded hover:bg-green-500 hover:text-black transition-colors flex items-center"
          >
            <HomeIcon className="h-5 w-5 mr-2" />
            התאם נכסים
          </button>
          <button 
            onClick={() => onDelete(customer.id)} 
            className="p-2 bg-transparent border border-red-500 text-red-500 rounded hover:bg-red-500 hover:text-black transition-colors flex items-center"
          >
            <TrashIcon className="h-5 w-5 mr-2" />
            מחק
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerDetailsModal;