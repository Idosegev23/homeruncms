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
export const createCustomer = async (customerData) => {
  try {
    const createdRecords = await base('Customers').create([{ fields: customerData }]);
    return {
      id: createdRecords[0].id,
      ...createdRecords[0].fields
    };
  } catch (error) {
    console.error('Error creating customer:', error);
    throw error;
  }
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
export const createProperty = async (propertyData) => {
  try {
    const createdRecords = await base('Properties').create([{ fields: propertyData }]);
    return {
      id: createdRecords[0].id,
      ...createdRecords[0].fields
    };
  } catch (error) {
    console.error('Error creating property:', error);
    throw error;
  }
};

// Fetch chat records
export const fetchChatRecords = async (params = {}) => {
  const records = await base('Chat').select(params).all();
  return records.map(record => ({
    id: record.id,
    chatid: record.get('chatid'),
    First_name: record.get('First_name'),
    Last_name: record.get('Last_name'),
    cell: record.get('cell'),
    customerId: record.get('customerId'),
    chat_history: parseChatHistoryFromAirtable(record.get('chat_history'))
  }));
};

// Fetch a single chat record
export const fetchChatRecord = async (recordId) => {
  const record = await base('Chat').find(recordId);
  return {
    id: record.id,
    chatid: record.get('chatid'),
    First_name: record.get('First_name'),
    Last_name: record.get('Last_name'),
    cell: record.get('cell'),
    customerId: record.get('customerId'),
    chat_history: parseChatHistoryFromAirtable(record.get('chat_history'))
  };
};

// Create chat records
export const createChatRecords = async (records) => {
  const createdRecords = await base('Chat').create(records);
  return createdRecords.map(record => ({
    id: record.id,
    ...record.fields,
    chat_history: parseChatHistoryFromAirtable(record.fields.chat_history)
  }));
};

// Update chat records
export const updateChatRecords = async (records) => {
  const updatedRecords = await base('Chat').update(records);
  return updatedRecords.map(record => ({
    id: record.id,
    ...record.fields,
    chat_history: parseChatHistoryFromAirtable(record.fields.chat_history)
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

// פונקציה לשמירת היסטוריית צ'אט עבור לקוח מסוים
export const saveChatHistory = async (customerId, chatHistory) => {
  try {
    const existingRecords = await base('Chat').select({
      filterByFormula: `{customerId} = '${customerId}'`
    }).firstPage();

    const formattedChatHistory = formatChatHistoryForAirtable(chatHistory);

    if (existingRecords.length > 0) {
      // עדכון הרשומה הקיימת
      const updatedRecord = await base('Chat').update(existingRecords[0].id, {
        chat_history: formattedChatHistory
      });
      return {
        id: updatedRecord.id,
        ...updatedRecord.fields,
        chat_history: parseChatHistoryFromAirtable(updatedRecord.fields.chat_history)
      };
    } else {
      // יצירת רשומה חדשה אם לא קיימת
      const createdRecord = await base('Chat').create({
        customerId: customerId,
        chat_history: formattedChatHistory
      });
      return {
        id: createdRecord.id,
        ...createdRecord.fields,
        chat_history: parseChatHistoryFromAirtable(createdRecord.fields.chat_history)
      };
    }
  } catch (error) {
    console.error('Error saving chat history:', error);
    throw error;
  }
};

// פונקציה לאחזור היסטוריית צ'אט עבור לקוח מסוים
export const fetchChatHistory = async (customerId) => {
  try {
    const records = await base('Chat').select({
      filterByFormula: `{customerId} = '${customerId}'`
    }).firstPage();

    if (records.length > 0) {
      const chatHistory = parseChatHistoryFromAirtable(records[0].get('chat_history'));
      return chatHistory;
    } else {
      console.warn('No chat history found for customerId:', customerId);
      return [];
    }
  } catch (error) {
    console.error('Error fetching chat history:', error);
    throw error;
  }
};

// פונקציה עזר לפורמט היסטוריית הצ'אט לפורמט של Airtable
const formatChatHistoryForAirtable = (chatHistory) => {
  return [{
    type: "paragraph",
    value: chatHistory.map(message => ({
      type: "paragraphLine",
      value: [{
        type: "text",
        value: JSON.stringify(message)
      }]
    }))
  }];
};

// פונקציה עזר לפענוח היסטוריית הצ'אט מהפורמט של Airtable
const parseChatHistoryFromAirtable = (airtableChatHistory) => {
  if (!airtableChatHistory || !Array.isArray(airtableChatHistory)) {
    return [];
  }
  
  return airtableChatHistory
    .flatMap(paragraph => paragraph.value)
    .flatMap(line => line.value)
    .map(text => {
      try {
        return JSON.parse(text.value);
      } catch (error) {
        console.error('Error parsing chat message:', error);
        return null;
      }
    })
    .filter(message => message !== null);
};