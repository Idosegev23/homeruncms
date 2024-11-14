import React, { useState, useEffect } from 'react';

const EditCustomerModal = ({ customer, onSave, onClose }) => {
  const [editedCustomer, setEditedCustomer] = useState(customer || {});
  const [formattedBudget, setFormattedBudget] = useState('');
  const [allAreasSelected, setAllAreasSelected] = useState(false);
  const [errors, setErrors] = useState({});

  // Define all valid options based on Airtable schema
  const validOptions = {
    Asset_type: [
      'דירה',
      'דירת גן',
      'דירה רגילה',
      'פנטהאוז',
      'בית פרטי'
    ],
    parking_type: [
      'normal',
      'robotic',
      'shared',
      'semi-shared'
    ],
    area: [
      'בבלי',
      'לב העיר',
      'פלורנטין',
      'לב העיר מערב',
      'צפון ישן',
      'צפון חדש',
      'מרכז',
      'קו הים',
      'נוה צדק',
      'כרם התימנים'
    ],
    defaultValues: {
      yesNo: ['yes', 'no'],
      yesNoMust: ['yes', 'no', 'must_yes'],
      yesNoMustFull: ['yes', 'no', 'must_yes', 'must_no']
    }
  };

  useEffect(() => {
    if (customer?.Budget) {
      setFormattedBudget(Number(customer.Budget).toLocaleString());
    }
    setAllAreasSelected(customer?.area?.length === validOptions.area.length);
  }, [customer]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
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

    // Handle different field types
    if (name === 'Budget') {
      const numericValue = value.replace(/\D/g, '');
      processedValue = numericValue ? Number(numericValue) : undefined;
      setFormattedBudget(numericValue ? Number(numericValue).toLocaleString() : '');
    } else if (type === 'number') {
      processedValue = value === '' ? undefined : Number(value);
    } else if (value === '') {
      processedValue = undefined;
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
      [fieldName]: newValues.length > 0 ? newValues : undefined
    }));

    if (fieldName === 'area') {
      setAllAreasSelected(newValues.length === validOptions.area.length);
    }
  };

  const handleSelectAllAreas = (e) => {
    e.preventDefault();
    const newAllAreasSelected = !allAreasSelected;
    setAllAreasSelected(newAllAreasSelected);
    
    setEditedCustomer(prev => ({
      ...prev,
      area: newAllAreasSelected ? validOptions.area : undefined
    }));
  };

  const renderMultiSelect = (name, options, label) => (
    <div className="flex flex-col">
      <label className="mb-1 text-yellow-500">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map(option => (
          <button
            key={option}
            onClick={(e) => handleMultiSelectClick(e, name)}
            value={option}
            className={`px-2 py-1 rounded ${
              editedCustomer[name]?.includes(option)
                ? 'bg-yellow-500 text-black'
                : 'bg-gray-700 text-white'
            }`}
          >
            {option}
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
              <option key={option} value={option}>{option}</option>
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

    try {
      await onSave(editedCustomer);
    } catch (error) {
      console.error('Error saving customer:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex justify-center items-start overflow-y-auto p-4 z-50">
      <div className="bg-black p-6 rounded-lg w-full max-w-7xl my-8">
        <h2 className="text-xl text-yellow-500 mb-4">
          {customer?.id ? 'ערוך לקוח' : 'הוספת לקוח חדש'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {renderField('First_name', 'שם פרטי')}
            {renderField('Last_name', 'שם משפחה')}
            {renderField('Cell', 'טלפון')}
            {renderField('Budget', 'תקציב')}
            {renderField('Rooms', 'חדרים', 'number')}
            {renderField('Square_meters', 'מ״ר', 'number')}

            {renderMultiSelect('Asset_type', validOptions.Asset_type, 'סוג נכס')}
            
            {renderField('investment', 'השקעה?', 'select', validOptions.defaultValues.yesNo)}
            {renderField('land_floor', 'קומת קרקע?', 'select', validOptions.defaultValues.yesNoMustFull)}
            
            {(editedCustomer.land_floor === 'yes' || editedCustomer.land_floor === 'must_yes') && 
              renderField('garden_apt', 'דירת גן?', 'select', validOptions.defaultValues.yesNoMustFull)
            }

            {renderField('quiet', 'שקט?', 'select', validOptions.defaultValues.yesNoMust)}
            {renderField('Elevator', 'מעלית?', 'select', validOptions.defaultValues.yesNoMust)}
            {renderField('parking', 'חניה?', 'select', validOptions.defaultValues.yesNoMust)}

            {(editedCustomer.parking === 'yes' || editedCustomer.parking === 'must_yes') &&
              renderMultiSelect('parking_type', validOptions.parking_type, 'סוג חניה')
            }

            {renderField('renovated', 'משופץ?', 'select', validOptions.defaultValues.yesNoMust)}
            {renderField('sun_balcony', 'מרפסת שמש?', 'select', validOptions.defaultValues.yesNoMust)}
            {renderField('TMA_potential', 'פוטנציאל תמ"א?', 'select', validOptions.defaultValues.yesNoMustFull)}
            {renderField('saferoom', 'ממ"ד?', 'select', validOptions.defaultValues.yesNoMust)}

            {editedCustomer.saferoom === 'yes' &&
              renderField('shelter_is_ok', 'האם מקלט בסדר?', 'select', validOptions.defaultValues.yesNo)
            }

            <div className="flex flex-col">
              <label className="mb-1 text-yellow-500">אזור</label>
              <button
                onClick={handleSelectAllAreas}
                className={`mb-2 px-2 py-1 rounded ${
                  allAreasSelected ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-white'
                }`}
              >
                {allAreasSelected ? 'בטל בחירת הכל' : 'בחר הכל'}
              </button>
              {renderMultiSelect('area', validOptions.area, '')}
            </div>

            {editedCustomer.area?.length > 0 &&
              renderField('area_is_must', 'האם האזור הכרחי?', 'select', validOptions.defaultValues.yesNo)
            }

            {renderField('tower_is_ok', 'האם מגדל בסדר?', 'select', validOptions.defaultValues.yesNoMustFull)}
            {renderField('apt_from_project', 'דירה מפרויקט?', 'select', validOptions.defaultValues.yesNoMustFull)}
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
