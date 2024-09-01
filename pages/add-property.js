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
    city: '',
    street: '',
    imageurl: ''
  });

  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      await createProperty(formData);
      router.push('/properties');
    } catch (err) {
      setError('שגיאה בהוספת נכס. נא לנסות שוב.');
    }
  };

  return (
    <Layout>
      <div className="container mx-auto p-4 bg-black rounded-lg shadow-2xl text-white">
        <h1 className="text-2xl font-bold mb-6 text-yellow-500 text-center">הוספת נכס חדש</h1>
        
        {error && <p className="text-red-500 mb-4">{error}</p>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-yellow-500 mb-2">מחיר</label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              className="w-full p-2 bg-gray-800 rounded border border-yellow-500 text-white"
              required
            />
          </div>

          <div>
            <label className="block text-yellow-500 mb-2">מספר חדרים</label>
            <input
              type="number"
              name="rooms"
              value={formData.rooms}
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
              name="square_meters"
              value={formData.square_meters}
              onChange={handleChange}
              className="w-full p-2 bg-gray-800 rounded border border-yellow-500 text-white"
              required
            />
          </div>

          <div>
            <label className="block text-yellow-500 mb-2">קומה</label>
            <input
              type="number"
              name="floor"
              value={formData.floor}
              onChange={handleChange}
              className="w-full p-2 bg-gray-800 rounded border border-yellow-500 text-white"
              required
            />
          </div>

          <div>
            <label className="block text-yellow-500 mb-2">קומה מקסימלית בבניין</label>
            <input
              type="number"
              name="max_floor"
              value={formData.max_floor}
              onChange={handleChange}
              className="w-full p-2 bg-gray-800 rounded border border-yellow-500 text-white"
              required
            />
          </div>

          <div>
            <label className="block text-yellow-500 mb-2">עיר</label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              className="w-full p-2 bg-gray-800 rounded border border-yellow-500 text-white"
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
              className="w-full p-2 bg-gray-800 rounded border border-yellow-500 text-white"
              required
            />
          </div>

          <div>
            <label className="block text-yellow-500 mb-2">קישור לתמונה (לא חובה)</label>
            <input
              type="url"
              name="imageurl"
              value={formData.imageurl}
              onChange={handleChange}
              className="w-full p-2 bg-gray-800 rounded border border-yellow-500 text-white"
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