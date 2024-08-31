import { useState } from 'react';

export default function CustomerDetails({ customer, relevantProperties, onSendPropertyDetails }) {
  if (!customer) {
    return <div className="p-4 text-gray-500">Select a chat to view customer details</div>;
  }

  return (
    <div className="p-4 h-full overflow-y-auto">
      <h2 className="text-xl font-bold mb-4">{customer.First_name} {customer.Last_name}</h2>
      <p className="mb-2"><span className="font-semibold">Phone:</span> {customer.Cell}</p>
      <p className="mb-2"><span className="font-semibold">Budget:</span> ${customer.Budget}</p>
      <p className="mb-2"><span className="font-semibold">Preferred City:</span> {customer.City}</p>
      <p className="mb-2"><span className="font-semibold">Rooms:</span> {customer.Rooms}</p>
      <p className="mb-2"><span className="font-semibold">Area:</span> {customer.Square_meters} sqm</p>
      <p className="mb-2"><span className="font-semibold">Preferred Floor:</span> {customer.Preferred_floor}</p>
      
      <h3 className="text-lg font-bold mt-6 mb-2">Relevant Properties</h3>
      {relevantProperties.map(property => (
        <div key={property.id} className="mb-4 p-3 border rounded bg-white shadow-sm">
          <p className="font-semibold">{property.street}, {property.city}</p>
          <p>Price: ${property.price}</p>
          <p>{property.rooms} rooms, {property.square_meters} sqm</p>
          <button 
            onClick={() => onSendPropertyDetails(property)}
            className="mt-2 bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            Send Details
          </button>
        </div>
      ))}
    </div>
  );
}