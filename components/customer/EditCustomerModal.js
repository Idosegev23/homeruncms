import React, { useState, useEffect } from 'react';

const EditCustomerModal = ({ customer, onSave, onClose }) => {
  const [editedCustomer, setEditedCustomer] = useState(customer || {});
  const [formattedBudget, setFormattedBudget] = useState('');
  const [allAreasSelected, setAllAreasSelected] = useState(false);
  const [errors, setErrors] = useState({});

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
    if (editedCustomer?.Budget) {
      setFormattedBudget(Number(editedCustomer.Budget).toLocaleString());
    }
  }, []);

  const validateField = (name, value) => {
    if (value === '' || value === undefined || value === null) return true;
    
    switch (name) {
      case 'Square_meters':
        const sqm = Number(value);
        return Number.isInteger(sqm) && sqm > 0;
      case 'Rooms':
        const rooms = Number(value);
        return rooms > 0 && Number.isInteger(rooms * 2); // Allow .5 values
      case 'Budget':
        return Number.isInteger(Number(value)) && Number(value) > 0;
      case 'Cell':
        return /^\d{9,10}$/.test(value); // Israeli phone number validation
      default:
        return true;
    }
  };

  const getErrorMessage = (name) => {
    switch (name) {
      case 'Square_meters':
        return 'יש להזין מספר שלם חיובי';
      case 'Rooms':
        return 'יש להזין מספר חיובי (מותר חצאי חדרים)';
      case 'Budget':
        return 'יש להזין סכום חיובי ללא אגורות';
      case 'Cell':
        return 'יש להזין מספר טלפון תקין (9-10 ספרות)';
      default:
        return 'ערך לא תקין';
    }
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    let processedValue = value;
    let formattedValue = value;

    if (name === 'Budget') {
      const numericValue = value.replace(/\D/g, '');
      processedValue = numericValue ? Number(numericValue) : '';
      formattedValue = processedValue ? Number(processedValue).toLocaleString() : '';
      setFormattedBudget(formattedValue);
    } else if (type === 'number') {
      processedValue = value === '' ? '' : Number(value);
    } else if (type === 'select-multiple') {
      const options = Array.from(e.target.options);
      processedValue = options
        .filter(option => option.selected)
        .map(option => option.value);
    }

    // Validate field
    if (!validateField(name, processedValue)) {
      setErrors(prev => ({
        ...prev,
        [name]: getErrorMessage(name)
      }));
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    setEditedCustomer(prev => ({
      ...prev,
      [name]: processedValue
    }));
  };

  const handleMultiSelectClick = (e, fieldName) => {
    e.preventDefault();
    const value = e.target.value;
    const currentValues = editedCustomer[fieldName] || [];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    
    setEditedCustomer(prev => ({
      ...prev,
      [fieldName]: newValues
    }));

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
            className={`p-2 border rounded bg-gray-800 text-white w-full ${
              errors[name] ? 'border-red-500' : 'border-yellow-500'
            }`}
          />
          {errors[name] && (
            <span className="text-red-500 text-sm mt-1">{errors[name]}</span>
          )}
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
            className={`p-2 border rounded bg-gray-800 text-white w-full ${
              errors[name] ? 'border-red-500' : 'border-yellow-500'
            }`}
          >
            <option value="">בחר אפשרות</option>
            {options.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        ) : (
          <>
            <input
              name={name}
              type={type}
              value={editedCustomer[name] || ''}
              onChange={handleChange}
              placeholder={label}
              className={`p-2 border rounded bg-gray-800 text-white w-full ${
                errors[name] ? 'border-red-500' : 'border-yellow-500'
              }`}
              step={name === 'Rooms' ? '0.5' : '1'}
              min="0"
            />
            {errors[name] && (
              <span className="text-red-500 text-sm mt-1">{errors[name]}</span>
            )}
          </>
        )}
      </div>
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate all fields before submission
    const newErrors = {};
    ['Square_meters', 'Rooms', 'Budget', 'Cell'].forEach(field => {
      if (editedCustomer[field] && !validateField(field, editedCustomer[field])) {
        newErrors[field] = getErrorMessage(field);
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Clean up empty values before saving
    const cleanedCustomer = Object.fromEntries(
      Object.entries(editedCustomer).filter(([_, value]) => 
        value !== '' && value !== null && value !== undefined
      )
    );

    try {
      await onSave(cleanedCustomer);
    } catch (error) {
      console.error('Error saving customer:', error);
      // Add any error handling UI here if needed
    }
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

          <div className="flex justify-end mt-6 gap-2">
            <button
              type="submit"
              disabled={Object.keys(errors).length > 0}
              className={`px-4 py-2 rounded ${
                Object.keys(errors).length > 0
                  ? 'bg-gray-500 cursor-not-allowed'
                  : 'bg-yellow-500 hover:bg-yellow-600'
              } text-black`}
            >
              שמור
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-black rounded"
            >
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditCustomerModal;
