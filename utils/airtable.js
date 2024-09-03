// utils/airtable.js
import Airtable from 'airtable';
import { AIRTABLE_API_KEY, AIRTABLE_BASE_ID } from '../config';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken'; // הוספנו את jwt ליצירת טוקן


Airtable.configure({
  apiKey: AIRTABLE_API_KEY
});

const base = Airtable.base(AIRTABLE_BASE_ID);

export const checkEmailExists = async (email) => {
  const allowedEmails = [
    'Shimi.Homerun@gmail.com',
    'Triroars@gmail.com',
    'meirbs.homerun@gmail.com',
    'shimi.homerun@gmail.com',
    'triroars@gmail.com'
  ];

  if (!allowedEmails.includes(email.toLowerCase())) {
    throw new Error('האימייל אינו מורשה');
  }

  const records = await base('Users').select({
    filterByFormula: `LOWER({Email}) = '${email.toLowerCase()}'`,
  }).firstPage();

  if (!records || records.length === 0) {
    return false;
  }

  return records[0].get('Password') !== '';
};



export const setPasswordForEmail = async ({ email, password }) => {
  const hashedPassword = await bcrypt.hash(password, 10);

  const records = await base('Users').select({
    filterByFormula: `LOWER({Email}) = '${email.toLowerCase()}'`,
  }).firstPage();

  let userId;
  if (records && records.length > 0) {
    await base('Users').update(records[0].id, {
      Password: hashedPassword,
    });
    userId = records[0].id;
  } else {
    const createdRecord = await base('Users').create([
      {
        fields: {
          Email: email.toLowerCase(),
          Password: hashedPassword,
        },
      },
    ]);
    userId = createdRecord[0].id;
  }

  return { id: userId, email: email.toLowerCase() };
};


export const authenticateUser = async ({ email, password }) => {
  const records = await base('Users').select({
    filterByFormula: `LOWER({Email}) = '${email.toLowerCase()}'`,
  }).firstPage();

  if (!records || records.length === 0) {
    throw new Error('המשתמש לא נמצא');
  }

  const user = records[0];
  const storedPassword = user.get('Password');

  if (!storedPassword) {
    throw new Error('סיסמה לא הוגדרה עבור משתמש זה');
  }

  const validPassword = await bcrypt.compare(password, storedPassword);

  if (!validPassword) {
    throw new Error('סיסמה שגויה');
  }

  return {
    id: user.id,
    email: user.get('Email').toLowerCase(),
  };
};

export const handleAuthFlow = async (email, password, confirmPassword, step) => {
  if (!email || typeof email !== 'string') {
    throw new Error('כתובת אימייל לא תקינה');
  }

  if (!step || typeof step !== 'string') {
    throw new Error('שלב לא תקין');
  }

  if (step === 'email') {
    const hasPassword = await checkEmailExists(email);
    return { step: hasPassword ? 'login' : 'setPassword' };
  } else if (step === 'login') {
    if (!password || typeof password !== 'string') {
      throw new Error('סיסמה לא תקינה');
    }
    try {
      const user = await authenticateUser({ email, password });
      const tokenResponse = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      });
      const { token } = await tokenResponse.json();
      return { ...user, token };
    } catch (error) {
      console.error('Authentication error:', error);
      throw new Error(error.message || 'שגיאה באימות. אנא נסה שנית.');
    }
  } else {
    throw new Error('שלב לא חוקי');
  }
};
export const checkAuthentication = () => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        // בדיקה בסיסית של תוקף הטוקן
        const decodedToken = jwt.decode(token);
        if (decodedToken && decodedToken.exp * 1000 > Date.now()) {
          return token;
        }
      } catch (error) {
        console.error('Error decoding token:', error);
      }
    }
    // אם הגענו לכאן, הטוקן לא תקין או לא קיים
    localStorage.removeItem('authToken'); // מסיר טוקן לא תקין
  }
  return null;
};


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
    fields: [
      'price', 
      'rooms', 
      'square_meters', 
      'floor', 
      'max_floor',
      'street', 
      'Elevator',
      'parking',
      'saferoom',
      'condition',
      'potential',
      'Balcony',
      'airways',
      'balcony_size',
      'imageurl'
    ],
  }).all();

  return records.map(record => ({
    id: record.id,
    price: record.get('price'),
    rooms: record.get('rooms'),
    square_meters: record.get('square_meters'),
    floor: record.get('floor'),
    max_floor: record.get('max_floor'),
    street: record.get('street'),
    Elevator: record.get('Elevator'),
    parking: record.get('parking'),
    saferoom: record.get('saferoom'),
    condition: record.get('condition'),
    potential: record.get('potential'),
    Balcony: record.get('Balcony'),
    airways: record.get('airways'),
    balcony_size: record.get('balcony_size'),
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
  await base('Properties').update(id, fields);
  return property;
};

// Delete a property from the 'Properties' table
export const deleteProperty = async (id) => {
  await base('Properties').destroy(id);
};
export const createProperty = async (propertyData) => {
  console.log('Sending request to Airtable with data:', propertyData);
  try {
    const createdRecord = await base('Properties').create(propertyData);
    console.log('Airtable response:', createdRecord);
    return createdRecord;
  } catch (error) {
    console.error('Airtable error:', error);
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