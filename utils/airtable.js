// utils/airtable.js
import Airtable from 'airtable';
import { AIRTABLE_API_KEY, AIRTABLE_BASE_ID } from '../config';

Airtable.configure({
  apiKey: AIRTABLE_API_KEY
});

const base = Airtable.base(AIRTABLE_BASE_ID);

// Fetch all customers from the 'Customers' table
export const fetchCustomers = async () => {
  const records = await base('Customers').select().all();
  return records.map(record => ({
    id: record.id,
    First_name: record.get('First_name'),
    Last_name: record.get('Last_name'),
    Cell: record.get('Cell'),
    Budget: record.get('Budget'),
    Rooms: record.get('Rooms'),
    Square_meters: record.get('Square_meters'),
    Preferred_floor: record.get('Preferred_floor'),
    City: record.get('City'),
    Area: record.get('Area'),
  }));
};

// Fetch all properties from the 'Properties' table
export const fetchProperties = async () => {
  const records = await base('Properties').select({
    fields: ['price', 'rooms', 'square_meters', 'floor', 'city', 'street', 'imageurl'],
  }).all();

  return records.map(record => ({
    id: record.id,
    price: record.get('price'),
    rooms: record.get('rooms'),
    square_meters: record.get('square_meters'),
    floor: record.get('floor'),
    city: record.get('city'),
    street: record.get('street'),
    imageurl: record.get('imageurl'),
  }));
};

// Function to get relevant properties for a customer
export const getRelevantProperties = (customer, properties = []) => {
  if (!properties || !Array.isArray(properties)) {
    return []; // מחזיר מערך ריק אם properties אינו מוגדר או אינו מערך
  }

  const minPropertyPrice = customer.Budget - 1000000;
  const maxPropertyPrice = customer.Budget * 1.15;
  
  return properties.filter(property => 
    property.price >= minPropertyPrice && property.price <= maxPropertyPrice
  );
};

// Update a customer in the 'Customers' table
export const updateCustomer = async (customer) => {
  const { id, ...fields } = customer;
  await base('Customers').update(id, fields);
  return customer;
};

// Delete a customer from the 'Customers' table
export const deleteCustomer = async (id) => {
  await base('Customers').destroy(id);
};

// Update a property in the 'Properties' table
export const updateProperty = async (property) => {
  const { id, ...fields } = property;
  await base('tbljuncsdRRGyo660').update(id, fields);
  return property;
};

// Delete a property from the 'Properties' table
export const deleteProperty = async (id) => {
  await base('tbljuncsdRRGyo660').destroy(id);
};
export const fetchChatRecords = async (params = {}) => {
  const records = await base('Chat').select(params).all();
  return records.map(record => ({
    id: record.id,
    createdTime: record.createdTime,
    ...record.fields
  }));
};

// Fetch a single chat record
export const fetchChatRecord = async (recordId) => {
  const record = await base('Chat').find(recordId);
  return {
    id: record.id,
    createdTime: record.createdTime,
    ...record.fields
  };
};

// Create chat records
export const createChatRecords = async (records) => {
  const createdRecords = await base('Chat').create(records);
  return createdRecords.map(record => ({
    id: record.id,
    createdTime: record.createdTime,
    fields: record.fields
  }));
};

// Update chat records
export const updateChatRecords = async (records) => {
  const updatedRecords = await base('Chat').update(records);
  return updatedRecords.map(record => ({
    id: record.id,
    createdTime: record.createdTime,
    fields: record.fields
  }));
};

// Delete chat records
export const deleteChatRecords = async (recordIds) => {
  const deletedRecords = await base('Chat').destroy(recordIds);
  return deletedRecords.map(record => ({
    id: record.id,
    deleted: true
  }));
};
