// המרת מחיר מפורמט מספרי לערך מספרי
const parsePrice = (price) => {
  if (!price) return 0;
  return parseFloat(price.toString().replace('₪', '').replace(/,/g, ''));
};

// בדיקת התאמת מחיר (+-10%)
const isPriceMatch = (customerBudget, propertyPrice) => {
  const budget = parsePrice(customerBudget);
  const price = parsePrice(propertyPrice);
  const margin = budget * 0.1;
  return price >= (budget - margin) && price <= (budget + margin);
};

// בדיקת התאמת חדרים (+-0.5)
const isRoomsMatch = (customerRooms, propertyRooms) => {
  if (!customerRooms || !propertyRooms) return false;
  return Math.abs(parseFloat(customerRooms) - parseFloat(propertyRooms)) <= 0.5;
};

// בדיקת התאמת שטח (+-20%)
const isAreaMatch = (customerArea, propertyArea) => {
  if (!customerArea || !propertyArea) return false;
  const area1 = parseFloat(customerArea);
  const area2 = parseFloat(propertyArea);
  const margin = area1 * 0.2;
  return area2 >= (area1 - margin) && area2 <= (area1 + margin);
};

// בדיקת סוג הנכס
const isAssetTypeMatch = (customerAssetType, propertyType) => {
  if (!customerAssetType || !propertyType) return true;
  const customerTypes = customerAssetType.split(',').map(type => type.trim());
  return customerTypes.some(type => propertyType.includes(type));
};

// בדיקת אזור
const TLVAREA_MAPPING = {
  'צפון': [
    'הצפון הישן',
    'כוכב הצפון',
    'אפקה',
    'רמת אביב',
    'נווה אביבים',
    'רמת החייל',
    'הדר יוסף'
  ],
  'מרכז': [
    'הלב',
    'לב העיר',
    'כרם התימנים',
    'רוטשילד',
    'נווה צדק',
    'פלורנטין',
    'מונטיפיורי'
  ],
  'דרום': [
    'יפו',
    'נווה שאנן',
    'שפירא',
    'קרית שלום',
    'התקווה',
    'יד אליהו'
  ],
  'מזרח': [
    'רמת הטייסים',
    'ביצרון',
    'תל חיים',
    'נחלת יצחק'
  ],
  'מערב': [
    'פארק הירקון',
    'בבלי',
    'צהלה',
    'הצפון החדש'
  ]
};

const isAreaLocationMatch = (customerArea, propertyStreet) => {
  // בדיקה שהערכים קיימים
  if (!customerArea || !propertyStreet) return true;
  
  // וידוא שcustomerArea הוא string
  if (typeof customerArea !== 'string') return true;
  
  const customerAreas = customerArea.split(',').map(area => area.trim());
  
  // דיקה האם הרחוב נמצא באחד מהאזורים שהלקוח מעוניין בהם
  return customerAreas.some(area => {
    const streets = TLVAREA_MAPPING[area];
    if (!streets) return false;
    
    return streets.some(street => 
      propertyStreet.toLowerCase().includes(street.toLowerCase())
    );
  });
};

// בדיקת תנאי חובה
const checkMustConditions = (customer, property) => {
  const mustConditions = [];

  // מעלית
  if (customer.Elevator === 'must_yes') {
    mustConditions.push({
      name: 'מעלית',
      match: property.Elevator === 'יש',
      isMust: true
    });
  }

  // חניה
  if (customer.parking === 'must_yes') {
    mustConditions.push({
      name: 'חניה',
      match: property.parking && property.parking !== 'אין',
      isMust: true,
      type: customer.parking_type
    });
  }

  // קומת קרקע
  if (customer.land_floor === 'must_yes') {
    mustConditions.push({
      name: 'קומת קרקע',
      match: property.floor === '0',
      isMust: true
    });
  } else if (customer.land_floor === 'must_no') {
    mustConditions.push({
      name: 'לא קומת קרקע',
      match: property.floor !== '0',
      isMust: true
    });
  }

  // דירה שקטה
  if (customer.quiet === 'must_yes') {
    mustConditions.push({
      name: 'דירה שקטה',
      match: property.quiet === 'yes',
      isMust: true
    });
  }

  // מרפסת שמש
  if (customer.sun_balcony === 'must_yes') {
    mustConditions.push({
      name: 'מרפסת שמש',
      match: property.Balcony === 'יש',
      isMust: true
    });
  }

  // משופץ
  if (customer.renovated === 'must_yes') {
    mustConditions.push({
      name: 'משופץ',
      match: property.condition?.includes('משופצת') || property.condition?.includes('חדשה'),
      isMust: true
    });
  }

  return mustConditions;
};

// בדיקת העדפות רגילות
const checkPreferences = (customer, property) => {
  const preferences = [];

  // מעלית - העדפה
  if (customer.Elevator === 'yes') {
    preferences.push({
      name: 'מעלית',
      match: property.Elevator === 'יש'
    });
  }

  // חניה - העדפה
  if (customer.parking === 'yes') {
    preferences.push({
      name: 'חניה',
      match: property.parking && property.parking !== 'אין',
      type: customer.parking_type
    });
  }

  // קומת קרקע - העדפה
  if (customer.land_floor === 'yes') {
    preferences.push({
      name: 'קומת קרקע',
      match: property.floor === '0'
    });
  }

  // שקט - העדפה
  if (customer.quiet === 'yes') {
    preferences.push({
      name: 'דירה שקטה',
      match: property.quiet === 'yes'
    });
  }

  // מרפסת שמש - העדפה
  if (customer.sun_balcony === 'yes') {
    preferences.push({
      name: 'מרפסת שמש',
      match: property.Balcony === 'יש'
    });
  }

  // משופץ - העדפה
  if (customer.renovated === 'yes') {
    preferences.push({
      name: 'משופץ',
      match: property.condition?.includes('משופצת') || property.condition?.includes('חדשה')
    });
  }

  // פוטנציאל תמ"א
  if (customer.TMA_potential === 'yes') {
    preferences.push({
      name: 'פוטנציאל תמ"א',
      match: property.potential === 'yes'
    });
  }

  return preferences;
};

const parseBudget = (budget) => {
  if (typeof budget === 'number') return budget;
  if (typeof budget === 'string') {
    return parseInt(budget.replace('₪', '').replace(/,/g, ''));
  }
  return 0;
};

const getAllCriteria = (customer, property) => {
  const criteria = [];

  // תקציב
  if (customer.Budget) {
    const budget = parseBudget(customer.Budget);
    criteria.push({
      name: 'Budget',
      customerValue: `${budget.toLocaleString()} ₪`,
      propertyValue: property.price ? `${property.price.toLocaleString()} ₪` : 'לא צוין',
      match: property.price ? (property.price >= budget - 600000 && property.price <= budget + 600000) : false
    });
  }

  // חדרים
  if (customer.Rooms) {
    criteria.push({
      name: 'Rooms',
      customerValue: customer.Rooms.toString(),
      propertyValue: property.rooms ? property.rooms.toString() : 'לא צוין',
      match: property.rooms ? (Math.abs(property.rooms - customer.Rooms) <= 1) : false
    });
  }

  // מ"ר
  if (customer.Square_meters) {
    criteria.push({
      name: 'Square meters',
      customerValue: customer.Square_meters.toString(),
      propertyValue: property.square_meters ? property.square_meters.toString() : 'לא צוין',
      match: property.square_meters ? (Math.abs(property.square_meters - customer.Square_meters) <= 10) : false
    });
  }

  // מעלית
  if (customer.Elevator) {
    criteria.push({
      name: 'Elevator',
      customerValue: customer.Elevator,
      propertyValue: property.elevator ? 'yes' : 'no',
      match: customer.Elevator === 'must_yes' ? property.elevator : true
    });
  }

  // חניה
  if (customer.parking_type) {
    criteria.push({
      name: 'Parking',
      customerValue: customer.parking_type,
      propertyValue: property.parking ? property.parking_type || 'yes' : 'no',
      match: customer.parking_type === 'must_yes' ? property.parking : true
    });
  }

  // ממ"ד
  if (customer.saferoom) {
    criteria.push({
      name: 'Saferoom',
      customerValue: customer.saferoom,
      propertyValue: property.saferoom ? 'yes' : 'no',
      match: customer.saferoom === 'must_yes' ? property.saferoom : true
    });
  }

  // מרפסת שמש
  if (customer.sun_balcony) {
    criteria.push({
      name: 'Sun balcony',
      customerValue: customer.sun_balcony,
      propertyValue: property.Balcony ? 'yes' : 'no',
      match: customer.sun_balcony === 'must_yes' ? property.Balcony : true
    });
  }

  // אזור
  if (customer.area) {
    criteria.push({
      name: 'Area',
      customerValue: customer.area,
      propertyValue: property.street || 'לא צוין',
      match: isAreaLocationMatch(customer.area, property.street)
    });
  }

  return criteria;
};

function calculateMatchPercentage(property, customer) {
  let totalScore = 0;
  let dealBreakers = [];

  // Budget check (40%)
  const propertyPrice = typeof property.price === 'string' ? 
    parseFloat(property.price.replace('₪', '').replace(',', '')) : 
    property.price;
    
  const customerBudget = typeof customer.Budget === 'string' ? 
    parseFloat(customer.Budget.replace('₪', '').replace(',', '')) : 
    customer.Budget;

  // חישוב 10% מעל ומתחת לתקציב
  const maxBudget = customerBudget * 1.1;  // 10% מעל
  const minBudget = customerBudget * 0.9;  // 10% מתחת
  
  const budgetScore = (propertyPrice >= minBudget && propertyPrice <= maxBudget) ? 40 : 0;

  // Square meters check (8%)
  const sqmScore = Math.abs(property.square_meters - customer.Square_meters) <= 20 ? 8 : 0;

  // Investment property check
  if (customer.investment === 'yes') {
    const score = (propertyPrice >= minBudget && propertyPrice <= maxBudget) ? 100 : 0;
    return {
      score,
      warning: false,
      dealBreakers: [],
      lowMatch: score < 50
    };
  }

  // Elevator check (8%)
  const elevatorScore = property.Elevator ? 8 : 0;
  if (customer.Elevator === 'must_yes' && !property.Elevator) {
    dealBreakers.push('Elevator required');
  }

  // Parking check (8%)
  let parkingScore = 0;
  if (property.parking) {
    if (property.parking_type === 'shared') {
      parkingScore = 4;
    } else {
      parkingScore = 8;
    }
  }
  if (customer.parking === 'must_yes' && !property.parking) {
    dealBreakers.push('Parking required');
  }

  // Area check (8%)
  let areaScore = 8;
  if (customer.area && property.street) {
    areaScore = 8;
    
    if (customer.area_is_must === 'yes') {
      dealBreakers.push('Area verification needed');
    }
  }

  // Safe room (8%)
  const saferoomScore = property.saferoom ? 8 : 0;
  if (customer.saferoom === 'yes' && !property.saferoom) {
    dealBreakers.push('Safe room required');
  }

  // Calculate total score
  totalScore = budgetScore + sqmScore + elevatorScore + parkingScore + areaScore + saferoomScore;

  // If there are deal breakers but score is above 85%, return warning
  if (dealBreakers.length > 0 && totalScore > 85) {
    return {
      score: Math.min(100, totalScore),
      warning: true,
      dealBreakers,
      lowMatch: totalScore < 50
    };
  }

  // If there are deal breakers, return 0
  if (dealBreakers.length > 0) {
    return {
      score: 0,
      warning: false,
      dealBreakers,
      lowMatch: true
    };
  }

  return {
    score: Math.min(100, totalScore),
    warning: false,
    dealBreakers: [],
    lowMatch: totalScore < 50
  };
}

// פונקציה להצגת סיבות לאי התאמה
export const getFailureReasons = (customer, property) => {
  const failureReasons = [];
  
  // בדיקת תנאי סף
  if (!isPriceMatch(customer.Budget, property.price)) {
    failureReasons.push({
      type: 'תנאי סף',
      reason: 'מחיר לא בטווח המבוקש',
      customerValue: customer.Budget,
      propertyValue: property.price
    });
  }

  if (!isRoomsMatch(customer.Rooms, property.rooms)) {
    failureReasons.push({
      type: 'תנאי סף',
      reason: 'מספר חדרים לא מתאים',
      customerValue: customer.Rooms,
      propertyValue: property.rooms
    });
  }

  if (!isAreaMatch(customer.Square_meters, property.square_meters)) {
    failureReasons.push({
      type: 'תנאי סף',
      reason: 'שטח לא בטווח המבוקש',
      customerValue: customer.Square_meters,
      propertyValue: property.square_meters
    });
  }

  if (!isAssetTypeMatch(customer.Asset_type, property.type)) {
    failureReasons.push({
      type: 'תנאי סף',
      reason: 'סוג נכס לא מתאים',
      customerValue: customer.Asset_type,
      propertyValue: property.type
    });
  }

  // בדיקת תנאי חובה
  const mustConditions = checkMustConditions(customer, property);
  mustConditions.forEach(condition => {
    if (condition.isMust && !condition.match) {
      failureReasons.push({
        type: 'תנאי חובה',
        reason: `חובה: ${condition.name}`,
        customerValue: 'חובה',
        propertyValue: 'לא קיים'
      });
    }
  });

  return failureReasons;
};

// ייצוא מרוכז של כל הפונקציות
export { 
  isAreaLocationMatch, 
  getAllCriteria, 
  calculateMatchPercentage, 
  parseBudget 
};