import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { createProperty } from '../utils/airtable';

const AddProperty = () => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    price: '',
    rooms: '',
    square_meters: '',
    floor: '',
    max_floor: '',
    street: '',
    Elevator: '',
    parking: '',
    saferoom: '',
    condition: '',
    potential: '',
    Balcony: '',
    airways: '',
    balcony_size: '',
    imageurl: ''
  });

  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    let updatedValue = value;

    switch (name) {
      case 'price':
        updatedValue = value.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        break;
      case 'rooms':
        updatedValue = value.replace(/[^\d.]/g, '');
        const parts = updatedValue.split('.');
        if (parts.length > 2) {
          updatedValue = parts[0] + '.' + parts.slice(1).join('');
        }
        if (parts[1] && parts[1].length > 1) {
          updatedValue = parts[0] + '.' + parts[1].slice(0, 1);
        }
        if (parts[1] && parts[1] !== '0' && parts[1] !== '5') {
          updatedValue = parts[0];
        }
        break;
      case 'square_meters':
      case 'floor':
      case 'max_floor':
        updatedValue = value.replace(/\D/g, '');
        break;
      case 'balcony_size':
        updatedValue = value.replace(/[^\d.]/g, '');
        break;
      default:
        break;
    }

    setFormData(prevState => ({
      ...prevState,
      [name]: updatedValue
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const submissionData = {
        ...formData,
        price: parseFloat(formData.price.replace(/,/g, '')),
        rooms: parseFloat(formData.rooms),
        square_meters: parseInt(formData.square_meters, 10),
        floor: parseInt(formData.floor, 10),
        max_floor: parseInt(formData.max_floor, 10),
        balcony_size: formData.balcony_size ? parseFloat(formData.balcony_size) : undefined
      };

      console.log('Submission data:', submissionData);

      await createProperty(submissionData);
      router.push('/properties');
    } catch (err) {
      console.error('Error creating property:', err);
      setError('שגיאה בהוספת נכס. נא לנסות שוב.');
    }
  };

  const inputClass = "w-full p-2 bg-gray-800 rounded border border-yellow-500 text-white";
  const radioGroupClass = "flex space-x-4 space-x-reverse";
  const radioLabelClass = "flex items-center space-x-2 space-x-reverse";
  const radioInputClass = "form-radio text-yellow-500 bg-gray-800 border-yellow-500";

  const RadioGroup = ({ name, options }) => (
    <div className={radioGroupClass}>
      {options.map((option) => (
        <label key={option} className={radioLabelClass}>
          <input
            type="radio"
            name={name}
            value={option}
            checked={formData[name] === option}
            onChange={handleChange}
            className={radioInputClass}
          />
          <span>{option}</span>
        </label>
      ))}
    </div>
  );

  return (
    <Layout>
      <div className="container mx-auto p-4 bg-black rounded-lg shadow-2xl text-white">
        <h1 className="text-2xl font-bold mb-6 text-yellow-500 text-center">הוספת נכס חדש</h1>
        
        {error && <p className="text-red-500 mb-4">{error}</p>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-yellow-500 mb-2">מחיר</label>
            <input
              type="text"
              name="price"
              value={formData.price}
              onChange={handleChange}
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className="block text-yellow-500 mb-2">מספר חדרים</label>
            <input
              type="text"
              name="rooms"
              value={formData.rooms}
              onChange={handleChange}
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className="block text-yellow-500 mb-2">מטרים רבועים</label>
            <input
              type="text"
              name="square_meters"
              value={formData.square_meters}
              onChange={handleChange}
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className="block text-yellow-500 mb-2">קומה</label>
            <input
              type="text"
              name="floor"
              value={formData.floor}
              onChange={handleChange}
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className="block text-yellow-500 mb-2">קומה מקסימלית בבניין</label>
            <input
              type="text"
              name="max_floor"
              value={formData.max_floor}
              onChange={handleChange}
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className="block text-yellow-500 mb-2">רחוב</label>
            <input
              type="text"
              name="street"
              value={formData.street}
              onChange={handleChange}
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className="block text-yellow-500 mb-2">מעלית</label>
            <RadioGroup name="Elevator" options={['יש', 'אין']} />
          </div>

          <div>
            <label className="block text-yellow-500 mb-2">חניה</label>
            <input
              type="text"
              name="parking"
              value={formData.parking}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-yellow-500 mb-2">ממ"ד</label>
            <RadioGroup name="saferoom" options={['יש', 'אין']} />
          </div>

          <div>
            <label className="block text-yellow-500 mb-2">מצב</label>
            <input
              type="text"
              name="condition"
              value={formData.condition}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-yellow-500 mb-2">פוטנציאל תמא</label>
            <RadioGroup name="potential" options={['יש', 'אין']} />
          </div>

          <div>
            <label className="block text-yellow-500 mb-2">מרפסת</label>
            <RadioGroup name="Balcony" options={['יש', 'אין']} />
          </div>

          {formData.Balcony === 'יש' && (
            <div>
              <label className="block text-yellow-500 mb-2">גודל מרפסת (במ"ר)</label>
              <input
                type="text"
                name="balcony_size"
                value={formData.balcony_size}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
          )}

          <div>
            <label className="block text-yellow-500 mb-2">כיווני אוויר</label>
            <input
              type="text"
              name="airways"
              value={formData.airways}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-yellow-500 mb-2">קישור לתמונה (לא חובה)</label>
            <input
              type="url"
              name="imageurl"
              value={formData.imageurl}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          <div className="flex justify-between">
            <button
              type="submit"
              className="bg-yellow-500 text-black px-4 py-2 rounded hover:bg-yellow-600 transition-colors"
            >
              הוסף נכס
            </button>
            <button
              type="button"
              onClick={() => router.push('/properties')}
              className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
            >
              ביטול
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default AddProperty;