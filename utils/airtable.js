// utils/airtable.js
import Airtable from 'airtable';
import { AIRTABLE_API_KEY, AIRTABLE_BASE_ID } from '../config';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import greenApi from './greenApi';

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
  console.log(`Handling auth flow. Step: ${step}, Email: ${email}`);

  if (!email || typeof email !== 'string') {
    throw new Error('כתובת אימייל לא תקינה');
  }

  if (!step || typeof step !== 'string') {
    throw new Error(`שלב לא תקין: ${step}`);
  }

  switch (step) {
    case 'email':
      const hasPassword = await checkEmailExists(email);
      console.log(`Email check result: ${hasPassword ? 'has password' : 'no password'}`);
      return { step: hasPassword ? 'login' : 'setPassword' };
    
    case 'setPassword':
      if (!password || typeof password !== 'string') {
        throw new Error('סיסמה לא תקינה');
      }
      if (!confirmPassword || typeof confirmPassword !== 'string') {
        throw new Error('אימות סיסמה לא תקין');
      }
      if (password !== confirmPassword) {
        throw new Error('הסיסמאות אינן תואמות');
      }
      const user = await setPasswordForEmail({ email, password });
      const tokenResponse = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      });
      const { token } = await tokenResponse.json();
      return { ...user, token };
    
    case 'login':
      if (!password || typeof password !== 'string') {
        throw new Error('סיסמה לא תקינה');
      }
      const authenticatedUser = await authenticateUser({ email, password });
      const loginTokenResponse = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: authenticatedUser.id, email: authenticatedUser.email }),
      });
      const { token: loginToken } = await loginTokenResponse.json();
      return { ...authenticatedUser, token: loginToken };
    
    default:
      console.error(`Invalid step received: ${step}`);
      throw new Error(`שלב לא חוקי: ${step}`);
  }
};

export const checkAuthentication = () => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        const decodedToken = jwt.decode(token);
        if (decodedToken && decodedToken.exp * 1000 > Date.now()) {
          return token;
        }
      } catch (error) {
        console.error('Error decoding token:', error);
      }
    }
    localStorage.removeItem('authToken');
  }
  return null;
};

export const fetchMsgSentRecords = async () => {
  const records = await base('msgsent').select().all();
  return records.map(record => ({
    id: record.id,
    userid: record.get('userid'),
    chatid: record.get('chatid'),
    date: record.get('date')
  }));
};

export const addMsgSentRecord = async (record) => {
  try {
    const existingRecords = await base('msgsent').select({
      filterByFormula: `{userid} = '${record.userid}'`
    }).firstPage();

    if (existingRecords.length > 0) {
      const updatedRecord = await base('msgsent').update(existingRecords[0].id, record);
      return {
        id: updatedRecord.id,
        ...updatedRecord.fields
      };
    } else {
      const createdRecord = await base('msgsent').create([{ fields: record }]);
      return {
        id: createdRecord[0].id,
        ...createdRecord[0].fields
      };
    }
  } catch (error) {
    console.error('Error adding/updating msgsent record:', error);
    throw error;
  }
};

export const fetchCustomers = async () => {
  console.log('Fetching customers...');
  const records = await base('Customers').select().all();
  console.log(`Fetched ${records.length} customer records`);
  
  const msgSentRecords = await fetchMsgSentRecords();
  console.log(`Fetched ${msgSentRecords.length} msgSent records`);

  const customers = records.map(record => {
    const customerChatInfo = msgSentRecords.find(msgRecord => msgRecord.userid === record.id);
    const customer = {
      id: record.id,
      First_name: record.get('First_name'),
      Last_name: record.get('Last_name'),
      Cell: record.get('Cell'),
      Budget: record.get('Budget'),
      Rooms: record.get('Rooms'),
      Square_meters: record.get('Square_meters'),
      Asset_type: record.get('Asset_type'),
      investment: record.get('investment'),
      land_floor: record.get('land_floor'),
      garden_apt: record.get('garden_apt'),
      quiet: record.get('quiet'),
      Elevator: record.get('Elevator'),
      parking: record.get('parking'),
      parking_type: record.get('parking_type'),
      renovated: record.get('renovated'),
      sun_balcony: record.get('sun_balcony'),
      TMA_potential: record.get('TMA_potential'),
      area: record.get('area'),
      area_is_must: record.get('area_is_must'),
      tower_is_ok: record.get('tower_is_ok'),
      apt_from_project: record.get('apt_from_project'),
      saferoom: record.get('saferoom'),
      shelter_is_ok: record.get('shelter_is_ok'),
      chatId: customerChatInfo ? customerChatInfo.chatid : record.get('Cell'),
      lastMessageDate: customerChatInfo ? customerChatInfo.date : null
    };
    console.log(`Processed customer: ${customer.id} - ${customer.First_name} ${customer.Last_name}`);
    return customer;
  });

  console.log('Finished processing all customers');
  return customers;
};

export const createCustomer = async (customerData) => {
  try {
    console.log('Creating customer with data:', customerData);
    
    // Ensure numeric fields are numbers
    const processedData = {
      ...customerData,
      Cell: Number(customerData.Cell),
      Budget: Number(customerData.Budget),
      Rooms: Number(customerData.Rooms),
      Square_meters: Number(customerData.Square_meters)
    };

    // Validate data
    const validationErrors = validateCustomerData(processedData);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
    }

    const createdRecords = await base('Customers').create([{ fields: processedData }]);
    
    const newCustomer = {
      id: createdRecords[0].id,
      ...createdRecords[0].fields
    };

    console.log('Customer created successfully:', newCustomer);
    return newCustomer;
  } catch (error) {
    console.error('Error creating customer:', error);
    throw error;
  }
};

const validateCustomerData = (data) => {
  const errors = [];

  if (!data.First_name) errors.push("שם פרטי הוא שדה חובה");
  if (!data.Last_name) errors.push("שם משפחה הוא שדה חובה");
  if (!data.Cell || !Number.isInteger(data.Cell)) errors.push("מספר טלפון חייב להיות מספר שלם");
  if (!data.Budget || isNaN(data.Budget)) errors.push("תקציב חייב להיות מספר");
  if (!data.Rooms || isNaN(data.Rooms)) errors.push("מספר חדרים חייב להיות מספר");
  if (!data.Square_meters || isNaN(data.Square_meters)) errors.push("מ\"ר חייב להיות מספר");
  
  const validAssetTypes = ["דירה", "דירת גן", "דירה רגילה", "פנטהאוז", "בית פרטי"];
  if (!data.Asset_type || !data.Asset_type.every(type => validAssetTypes.includes(type))) {
    errors.push("סוג נכס לא תקין");
  }

  const validOptions = ["yes", "no", "must_yes", "must_no"];
  if (!validOptions.includes(data.investment)) errors.push("ערך לא תקין עבור שדה השקעה");
  if (!validOptions.includes(data.land_floor)) errors.push("ערך לא תקין עבור שדה קומת קרקע");
  if (data.garden_apt && !validOptions.includes(data.garden_apt)) errors.push("ערך לא תקין עבור שדה דירת גן");
  if (!validOptions.includes(data.quiet)) errors.push("ערך לא תקין עבור שדה שקט");
  if (!validOptions.includes(data.Elevator)) errors.push("ערך לא תקין עבור שדה מעלית");
  if (!validOptions.includes(data.parking)) errors.push("ערך לא תקין עבור שדה חניה");
  if (!validOptions.includes(data.renovated)) errors.push("ערך לא תקין עבור שדה משופץ");
  if (!validOptions.includes(data.sun_balcony)) errors.push("ערך לא תקין עבור שדה מרפסת שמש");
  if (!validOptions.includes(data.TMA_potential)) errors.push("ערך לא תקין עבור שדה פוטנציאל תמ\"א");
  if (!validOptions.includes(data.saferoom)) errors.push("ערך לא תקין עבור שדה ממ\"ד");
  if (data.shelter_is_ok && !validOptions.includes(data.shelter_is_ok)) errors.push("ערך לא תקין עבור שדה האם מקלט בסדר");
  if (!validOptions.includes(data.area_is_must)) errors.push("ערך לא תקין עבור שדה האם האזור הכרחי");
  if (!validOptions.includes(data.tower_is_ok)) errors.push("ערך לא תקין עבור שדה האם מגדל בסדר");
  if (!validOptions.includes(data.apt_from_project)) errors.push("ערך לא תקין עבור שדה דירה מפרויקט");

  const validParkingTypes = ["normal", "robotic", "shared", "semi-shared"];
  if (data.parking_type && !data.parking_type.every(type => validParkingTypes.includes(type))) {
    errors.push("סוג חניה לא תקין");
  }

  const validAreas = ["בבלי", "לב העיר", "פלורנטין", "לב העיר מערב", "צפון ישן", "צפון חדש", "מרכז", "קו הים", "נוה צדק", "כרם התימנים"];
  if (!data.area || !data.area.every(area => validAreas.includes(area))) {
    errors.push("אזור לא תקין");
  }

  return errors;
};

export const fetchProperties = async () => {
  const records = await base('Properties').select().all();
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

export const getRelevantProperties = (customer, properties = []) => {
  if (!properties || !Array.isArray(properties)) {
    return [];
  }

  const minPropertyPrice = customer.Budget - 1000000;
  const maxPropertyPrice = customer.Budget * 1.15;
  
  return properties.filter(property => 
    property.price >= minPropertyPrice && property.price <= maxPropertyPrice
  );
};

export const updateCustomer = async (customer) => {
  const { id, lastMessageDate, chatId, ...fields } = customer;

  // המרת שדות מספריים
  const processedFields = {
    ...fields,
    Cell: Number(fields.Cell),
    Budget: Number(fields.Budget),
    Rooms: Number(fields.Rooms),
    Square_meters: Number(fields.Square_meters)
  };

  // ולידציה של הנתונים
  const validationErrors = validateCustomerData(processedFields);
  if (validationErrors.length > 0) {
    throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
  }

  // רשימת השדות התקפים בטבלת Customers
  const validFields = [
    'First_name',
    'Last_name',
    'Cell',
    'Budget',
    'Rooms',
    'Square_meters',
    'Asset_type',
    'investment',
    'land_floor',
    'garden_apt',
    'quiet',
    'Elevator',
    'parking',
    'parking_type',
    'renovated',
    'sun_balcony',
    'TMA_potential',
    'area',
    'area_is_must',
    'tower_is_ok',
    'apt_from_project',
    'saferoom',
    'shelter_is_ok'
  ];

  // סינון השדות כך שרק שדות תקפים יישלחו לאירטייבל
  const validUpdates = Object.keys(processedFields)
    .filter(key => validFields.includes(key))
    .reduce((obj, key) => {
      // וידוא שמערכים לא ריקים
      if (Array.isArray(processedFields[key]) && processedFields[key].length === 0) {
        return obj;
      }
      obj[key] = processedFields[key];
      return obj;
    }, {});

  try {
    // עדכון נתוני הלקוח בטבלת Customers
    const updatedRecord = await base('Customers').update(id, validUpdates);

    // החזרת האובייקט המעודכן
    return {
      id,
      ...updatedRecord.fields
    };
  } catch (error) {
    console.error('Error updating customer:', error);
    throw error;
  }
};

export const deleteCustomer = async (id) => {
  await base('Customers').destroy(id);

  const msgSentRecords = await fetchMsgSentRecords();
  const recordToDelete = msgSentRecords.find(record => record.userid === id);
  if (recordToDelete) {
    await base('msgsent').destroy(recordToDelete.id);
  }
};

export const updateProperty = async (property) => {
  const { id, ...fields } = property;
  await base('Properties').update(id, fields);
  return property;
};

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

export const createChatRecords = async (records) => {
  const createdRecords = await base('Chat').create(records);
  return createdRecords.map(record => ({
    id: record.id,
    ...record.fields,
    chat_history: parseChatHistoryFromAirtable(record.fields.chat_history)
  }));
};

export const updateChatRecords = async (records) => {
  const updatedRecords = await base('Chat').update(records);
  return updatedRecords.map(record => ({
    id: record.id,
    ...record.fields,
    chat_history: parseChatHistoryFromAirtable(record.fields.chat_history)
  }));
};

export const deleteChatRecords = async (recordIds) => {
  const deletedRecords = await base('Chat').destroy(recordIds);
  return deletedRecords.map(record => ({
    id: record.id,
    deleted: true
  }));
};

export const unifyAndSortMessages = async (chatId) => {
  try {
    const chatRecords = await fetchChatRecords({ filterByFormula: `{chatid} = '${chatId}'` });
    const incomingMessages = await greenApi.getLastIncomingMessages(1440, chatId);
    const outgoingMessages = await greenApi.getLastOutgoingMessages(1440, chatId);

    let allMessages = [
      ...chatRecords.flatMap(record => record.chat_history),
      ...incomingMessages,
      ...outgoingMessages
    ];

    allMessages = allMessages.filter((message, index, self) =>
      index === self.findIndex((t) => t.id === message.id)
    );

    allMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return allMessages;
  } catch (error) {
    console.error('Error in unifyAndSortMessages:', error);
    throw error;
  }
};

export const saveChatHistory = async (customerId, chatId, chatHistory) => {
  try {
    const formattedChatHistory = formatChatHistoryForAirtable(chatHistory);
    const existingRecords = await base('Chat').select({
      filterByFormula: `{customerId} = '${customerId}'`
    }).firstPage();

    if (existingRecords.length > 0) {
      const updatedRecord = await base('Chat').update(existingRecords[0].id, {
        chat_history: formattedChatHistory,
        chatid: chatId
      });
      return {
        id: updatedRecord.id,
        ...updatedRecord.fields,
        chat_history: parseChatHistoryFromAirtable(updatedRecord.fields.chat_history)
      };
    } else {
      const createdRecord = await base('Chat').create({
        customerId: customerId,
        chatid: chatId,
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

export default {
  checkEmailExists,
  setPasswordForEmail,
  authenticateUser,
  handleAuthFlow,
  checkAuthentication,
  fetchMsgSentRecords,
  addMsgSentRecord,
  fetchCustomers,
  createCustomer,
  fetchProperties,
  getRelevantProperties,
  updateCustomer,
  deleteCustomer,
  updateProperty,
  deleteProperty,
  createProperty,
  fetchChatRecords,
  fetchChatRecord,
  createChatRecords,
  updateChatRecords,
  deleteChatRecords,
  unifyAndSortMessages,
  saveChatHistory,
  fetchChatHistory
};