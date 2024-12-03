import React, { useState, useEffect } from 'react';

const EditCustomerModal = ({ customer, onSave, onClose }) => {
  const [editedCustomer, setEditedCustomer] = useState(customer);
  const [formattedBudget, setFormattedBudget] = useState('');
  const [allAreasSelected, setAllAreasSelected] = useState(false);

  useEffect(() => {
    if (allAreasSelected) {
      setEditedCustomer(prev => ({
        ...prev,
        area: allAreas.map(a => a.value)
      }));
    }
  }, [allAreasSelected]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  useEffect(() => {
    // Format the initial budget value
    if (editedCustomer.Budget) {
      setFormattedBudget(Number(editedCustomer.Budget).toLocaleString());
    }
  }, []);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    
    if (name === 'Budget') {
      // הסרת תווים שאינם מספרים והמרה למספר
      const numericValue = value.replace(/\D/g, '');
      if (numericValue === '') {
        setEditedCustomer({ ...editedCustomer, [name]: '' });
        setFormattedBudget('');
      } else {
        setEditedCustomer({ ...editedCustomer, [name]: numericValue });
        setFormattedBudget(Number(numericValue).toLocaleString());
      }
    } else if (type === 'number') {
      // טיפול בשדות מספריים אחרים
      const numericValue = value === '' ? '' : Number(value);
      setEditedCustomer({ ...editedCustomer, [name]: numericValue });
    } else if (type === 'select-multiple') {
      const options = Array.from(e.target.options);
      const selectedValues = options
        .filter(option => option.selected)
        .map(option => option.value);
      if (selectedValues.length > 0) {
        setEditedCustomer({ ...editedCustomer, [name]: selectedValues });
      } else {
        const newCustomer = { ...editedCustomer };
        delete newCustomer[name];
        setEditedCustomer(newCustomer);
      }
    } else {
      setEditedCustomer({ ...editedCustomer, [name]: value });
    }
  };

  const handleMultiSelectClick = (e, fieldName) => {
    e.preventDefault();
    const value = e.target.value;
    const currentValues = editedCustomer[fieldName] || [];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    setEditedCustomer({ ...editedCustomer, [fieldName]: newValues });

    if (fieldName === 'area') {
      setAllAreasSelected(newValues.length === allAreas.length);
    }
  };

  const handleSelectAllAreas = (e) => {
    e.preventDefault();
    const newAllAreasSelected = !allAreasSelected;
    setAllAreasSelected(newAllAreasSelected);
    setEditedCustomer(prev => ({
      ...prev,
      area: newAllAreasSelected ? allAreas.map(a => a.value) : []
    }));
  };

  const renderMultiSelect = (name, options, label) => (
    <div className="flex flex-col">
      <label className="mb-1 text-yellow-500">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map(option => (
          <button
            key={option.value}
            onClick={(e) => handleMultiSelectClick(e, name)}
            value={option.value}
            className={`px-2 py-1 rounded ${
              editedCustomer[name]?.includes(option.value)
                ? 'bg-yellow-500 text-black'
                : 'bg-gray-700 text-white'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );

  const renderField = (name, label, type = 'text', options = null) => {
    if (name === 'Budget') {
      return (
        <div className="flex flex-col">
          <label className="mb-1 text-yellow-500">{label}</label>
          <input
            name={name}
            type="text"
            value={formattedBudget}
            onChange={handleChange}
            placeholder={label}
            className="p-2 border border-yellow-500 rounded bg-gray-800 text-white w-full"
          />
        </div>
      );
    }
    
    return (
      <div className="flex flex-col">
        <label className="mb-1 text-yellow-500">{label}</label>
        {type === 'select' ? (
          <select
            name={name}
            value={editedCustomer[name] || ''}
            onChange={handleChange}
            className="p-2 border border-yellow-500 rounded bg-gray-800 text-white w-full"
          >
            <option value="">בחר אפשרות</option>
            {options.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        ) : (
          <input
            name={name}
            type={type}
            value={editedCustomer[name] || ''}
            onChange={handleChange}
            placeholder={label}
            className="p-2 border border-yellow-500 rounded bg-gray-800 text-white w-full"
          />
        )}
      </div>
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // המרת שדות מספריים
    const processedCustomer = {
      ...editedCustomer,
      Cell: Number(editedCustomer.Cell),
      Budget: Number(editedCustomer.Budget),
      Rooms: Number(editedCustomer.Rooms),
      Square_meters: Number(editedCustomer.Square_meters)
    };

    // סינון מערכים ריקים
    Object.keys(processedCustomer).forEach(key => {
      if (Array.isArray(processedCustomer[key]) && processedCustomer[key].length === 0) {
        delete processedCustomer[key];
      }
    });

    onSave(processedCustomer);
  };

  const allAreas = [
    { value: 'בבלי', label: 'בבלי' },
    { value: 'לב העיר', label: 'לב העיר' },
    { value: 'פלורנטין', label: 'פלורנטין' },
    { value: 'לב העיר מערב', label: 'לב העיר מערב' },
    { value: 'צפון ישן', label: 'צפון ישן' },
    { value: 'צפון חדש', label: 'צפון חדש' },
    { value: 'מרכז', label: 'מרכז' },
    { value: 'קו הים', label: 'קו הים' },
    { value: 'נוה צדק', label: 'נוה צדק' },
    { value: 'כרם התימנים', label: 'כרם התימנים' }
  ];

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex justify-center items-start overflow-y-auto p-4 z-50">
      <div className="bg-black p-6 rounded-lg w-full max-w-7xl my-8">
        <h2 className="text-xl text-yellow-500 mb-4">ערוך לקוח</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {renderField('First_name', 'שם פרטי')}
            {renderField('Last_name', 'שם משפחה')}
            {renderField('Cell', 'טלפון')}
            {renderField('Budget', 'תקציב')}
            {renderField('Rooms', 'חדרים', 'number')}
            {renderField('Square_meters', 'מ״ר', 'number')}

            {renderMultiSelect('Asset_type', [
              { value: 'דירה', label: 'דירה' },
              { value: 'דירת גן', label: 'דירת גן' },
              { value: 'דירה רגילה', label: 'דירה רגילה' },
              { value: 'פנטהאוז', label: 'פנטהאוז' },
              { value: 'בית פרטי', label: 'בית פרטי' }
            ], 'סוג נכס (ניתן לבחור מספר אפשרויות)')}

            {renderField('investment', 'השקעה?', 'select', [
              { value: 'yes', label: 'כן' },
              { value: 'no', label: 'לא' }
            ])}

            {renderField('land_floor', 'קומת קרקע?', 'select', [
              { value: 'yes', label: 'כן' },
              { value: 'no', label: 'לא' },
              { value: 'must_yes', label: 'חובה כן' },
              { value: 'must_no', label: 'חובה לא' }
            ])}

            {(editedCustomer.land_floor === 'yes' || editedCustomer.land_floor === 'must_yes') && 
              renderField('garden_apt', 'דירת גן?', 'select', [
                { value: 'yes', label: 'כן' },
                { value: 'no', label: 'לא' },
                { value: 'must_yes', label: 'חובה כן' },
                { value: 'must_no', label: 'חובה לא' }
              ])
            }

            {renderField('quiet', 'שקט?', 'select', [
              { value: 'yes', label: 'כן' },
              { value: 'no', label: 'לא' },
              { value: 'must_yes', label: 'חובה כן' }
            ])}

            {renderField('Elevator', 'מעלית?', 'select', [
              { value: 'yes', label: 'כן' },
              { value: 'no', label: 'לא' },
              { value: 'must_yes', label: 'חובה כן' }
            ])}

            {renderField('parking', 'חניה?', 'select', [
              { value: 'yes', label: 'כן' },
              { value: 'no', label: 'לא' },
              { value: 'must_yes', label: 'חובה כן' }
            ])}

            {(editedCustomer.parking === 'yes' || editedCustomer.parking === 'must_yes') &&
              renderMultiSelect('parking_type', [
                { value: 'normal', label: 'רגילה' },
                { value: 'robotic', label: 'רובוטית' },
                { value: 'shared', label: 'משותפת' },
                { value: 'semi-shared', label: 'חצי משותפת' }
              ], 'סוג חניה (ניתן לבחור מספר אפשרויות)')
            }

            {renderField('renovated', 'משופץ?', 'select', [
              { value: 'yes', label: 'כן' },
              { value: 'no', label: 'לא' },
              { value: 'must_yes', label: 'חובה כן' }
            ])}

            {renderField('sun_balcony', 'מרפסת שמש?', 'select', [
              { value: 'yes', label: 'כן' },
              { value: 'no', label: 'לא' },
              { value: 'must_yes', label: 'חובה כן' }
            ])}

            {renderField('TMA_potential', 'פוטנציאל תמ"א?', 'select', [
              { value: 'yes', label: 'כן' },
              { value: 'no', label: 'לא' },
              { value: 'must_yes', label: 'חובה כן' },
              { value: 'must_no', label: 'חובה לא' }
            ])}

            {renderField('saferoom', 'ממ"ד?', 'select', [
              { value: 'yes', label: 'כן' },
              { value: 'no', label: 'לא' },
              { value: 'must_yes', label: 'חובה כן' }
            ])}

            {editedCustomer.saferoom === 'yes' &&
              renderField('shelter_is_ok', 'האם מקלט בסדר?', 'select', [
                { value: 'yes', label: 'כן' },
                { value: 'no', label: 'לא' }
              ])
            }

            <div className="flex flex-col">
              <label className="mb-1 text-yellow-500">אזור (ניתן לבחור מספר אפשרויות)</label>
              <button
                onClick={handleSelectAllAreas}
                className={`mb-2 px-2 py-1 rounded ${
                  allAreasSelected ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-white'
                }`}
              >
                {allAreasSelected ? 'בטל בחירת הכל' : 'בחר הכל'}
              </button>
              {renderMultiSelect('area', allAreas, '')}
            </div>

            {editedCustomer.area?.length > 0 &&
              renderField('area_is_must', 'האם האזור הכרחי?', 'select', [
                { value: 'yes', label: 'כן' },
                { value: 'no', label: 'לא' }
              ])
            }

            {renderField('tower_is_ok', 'האם מגדל בסדר?', 'select', [
              { value: 'yes', label: 'כן' },
              { value: 'no', label: 'לא' },
              { value: 'must_no', label: 'חובה לא' },
              { value: 'must_yes', label: 'חובה כן' }
            ])}

            {renderField('apt_from_project', 'דירה מפרויקט?', 'select', [
              { value: 'yes', label: 'כן' },
              { value: 'no', label: 'לא' },
              { value: 'must_yes', label: 'חובה כן' },
              { value: 'must_no', label: 'חובה לא' }
            ])}
          </div>
          <div className="flex justify-end mt-6">
            <button type="submit" className="px-4 py-2 bg-yellow-500 text-black rounded mr-2">שמור</button>
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 text-black rounded">ביטול</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditCustomerModal;