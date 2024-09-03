import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { createCustomer } from '../utils/airtable';

const AddCustomer = () => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    First_name: '',
    Last_name: '',
    Cell: '',
    Budget: '',
    Rooms: '',
    Square_meters: '',
    Preferred_floor: '',
    City: '',
    Area: ''
  });

  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'Budget') {
      // Remove non-digit characters and format with commas
      const formattedValue = value.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      setFormData(prevState => ({
        ...prevState,
        [name]: formattedValue
      }));
    } else {
      setFormData(prevState => ({
        ...prevState,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      // Remove commas from Budget before sending to API
      const submissionData = {
        ...formData,
        Budget: formData.Budget.replace(/,/g, '')
      };
      await createCustomer(submissionData);
      router.push('/customers');
    } catch (err) {
      setError('שגיאה בהוספת לקוח. נא לנסות שוב.');
    }
  };

  return (
    <Layout>
      <div className="container mx-auto p-4 bg-black rounded-lg shadow-2xl text-white">
        <h1 className="text-2xl font-bold mb-6 text-yellow-500 text-center">הוספת לקוח חדש</h1>
        
        {error && <p className="text-red-500 mb-4">{error}</p>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-yellow-500 mb-2">שם פרטי</label>
            <input
              type="text"
              name="First_name"
              value={formData.First_name}
              onChange={handleChange}
              className="w-full p-2 bg-gray-800 rounded border border-yellow-500 text-white"
              required
            />
          </div>

          <div>
            <label className="block text-yellow-500 mb-2">שם משפחה</label>
            <input
              type="text"
              name="Last_name"
              value={formData.Last_name}
              onChange={handleChange}
              className="w-full p-2 bg-gray-800 rounded border border-yellow-500 text-white"
              required
            />
          </div>

          <div>
            <label className="block text-yellow-500 mb-2">מספר טלפון</label>
            <input
              type="tel"
              name="Cell"
              value={formData.Cell}
              onChange={handleChange}
              className="w-full p-2 bg-gray-800 rounded border border-yellow-500 text-white"
              required
            />
          </div>

          <div>
            <label className="block text-yellow-500 mb-2">תקציב</label>
            <input
              type="text"
              name="Budget"
              value={formData.Budget}
              onChange={handleChange}
              className="w-full p-2 bg-gray-800 rounded border border-yellow-500 text-white"
              required
            />
          </div>

          <div>
            <label className="block text-yellow-500 mb-2">מספר חדרים</label>
            <input
              type="number"
              name="Rooms"
              value={formData.Rooms}
              onChange={handleChange}
              className="w-full p-2 bg-gray-800 rounded border border-yellow-500 text-white"
              step="0.5"
              required
            />
          </div>

          <div>
            <label className="block text-yellow-500 mb-2">מטרים רבועים</label>
            <input
              type="number"
              name="Square_meters"
              value={formData.Square_meters}
              onChange={handleChange}
              className="w-full p-2 bg-gray-800 rounded border border-yellow-500 text-white"
              required
            />
          </div>

          <div>
            <label className="block text-yellow-500 mb-2">קומה מועדפת</label>
            <input
              type="number"
              name="Preferred_floor"
              value={formData.Preferred_floor}
              onChange={handleChange}
              className="w-full p-2 bg-gray-800 rounded border border-yellow-500 text-white"
              required
            />
          </div>

          <div>
            <label className="block text-yellow-500 mb-2">עיר</label>
            <input
              type="text"
              name="City"
              value={formData.City}
              onChange={handleChange}
              className="w-full p-2 bg-gray-800 rounded border border-yellow-500 text-white"
              required
            />
          </div>

          <div>
            <label className="block text-yellow-500 mb-2">אזור</label>
            <input
              type="text"
              name="Area"
              value={formData.Area}
              onChange={handleChange}
              className="w-full p-2 bg-gray-800 rounded border border-yellow-500 text-white"
              required
            />
          </div>

          <div className="flex justify-between">
            <button
              type="submit"
              className="bg-yellow-500 text-black px-4 py-2 rounded hover:bg-yellow-600 transition-colors"
            >
              הוסף לקוח
            </button>
            <button
              type="button"
              onClick={() => router.push('/customers')}
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

export default AddCustomer;