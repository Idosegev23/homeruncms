export const calculateMatchPercentage = (property, customer) => {
  let totalScore = 0;
  let dealBreakers = [];
  let matchDetails = {};

  // Budget check (40%)
  const propertyPrice = property.price;
  const customerBudget = customer.Budget;
  const maxBudget = customerBudget * 1.1;
  const minBudget = customerBudget * 0.9;
  const budgetScore = (propertyPrice >= minBudget && propertyPrice <= maxBudget) ? 40 : 
    (40 * (1 - Math.min(Math.abs(propertyPrice - customerBudget) / customerBudget, 1)));
  matchDetails.budget = {
    score: budgetScore,
    details: `תקציב לקוח: ₪${customerBudget?.toLocaleString()} | מחיר נכס: ₪${propertyPrice?.toLocaleString()}`
  };
  totalScore += budgetScore;

  // Investment property check - אם זה נכס להשקעה, מחזירים רק את ציון התקציב
  if (customer.investment === 'yes') {
    return {
      score: budgetScore,
      matchDetails: { budget: matchDetails.budget },
      dealBreakers: [],
      isInvestment: true
    };
  }

  // Square meters check (8%)
  const sqmScore = Math.abs(property.square_meters - customer.Square_meters) <= 20 ? 8 : 
    (8 * (1 - Math.min(Math.abs(property.square_meters - customer.Square_meters) / customer.Square_meters, 1)));
  matchDetails.squareMeters = {
    score: sqmScore,
    details: `מ"ר מבוקש: ${customer.Square_meters} | מ"ר בנכס: ${property.square_meters}`
  };
  totalScore += sqmScore;

  // Rooms check (8%)
  const roomScore = Math.abs(property.rooms - customer.Rooms) <= 1 ? 8 : 
    (8 * (1 - Math.min(Math.abs(property.rooms - customer.Rooms), 2) / 2));
  matchDetails.rooms = {
    score: roomScore,
    details: `חדרים מבוקשים: ${customer.Rooms} | חדרים בנכס: ${property.rooms}`
  };
  totalScore += roomScore;

  // Ground floor check - דירת גן
  if (customer.ground_floor === 'must_yes' && property.floor !== 0) {
    dealBreakers.push('נדרשת דירת גן');
  }

  // Quiet apartment check - דירה שקטה
  if (customer.quiet === 'must_yes' && !property.quiet) {
    dealBreakers.push('נדרשת דירה שקטה');
  }

  // Elevator check (8%)
  if (customer.Elevator === 'must_yes' && !property.Elevator) {
    dealBreakers.push('נדרשת מעלית');
  }
  const elevatorScore = property.Elevator ? 8 : 0;
  matchDetails.elevator = {
    score: elevatorScore,
    details: `מעלית נדרשת: ${customer.Elevator === 'must_yes' ? 'כן' : 'לא'} | מעלית בנכס: ${property.Elevator ? 'כן' : 'לא'}`
  };
  totalScore += elevatorScore;

  // Parking check (8%)
  if (customer.parking === 'must_yes' && !property.parking) {
    dealBreakers.push('נדרשת חניה');
  }
  const parkingScore = property.parking ? 8 : 0;
  matchDetails.parking = {
    score: parkingScore,
    details: `חניה נדרשת: ${customer.parking === 'must_yes' ? 'כן' : 'לא'} | חניה בנכס: ${property.parking || 'אין'}`
  };
  totalScore += parkingScore;

  // Safe room check (8%)
  if (customer.saferoom === 'must_yes' && !property.saferoom) {
    dealBreakers.push('נדרש ממ"ד');
  }
  const saferoomScore = property.saferoom ? 8 : 0;
  matchDetails.saferoom = {
    score: saferoomScore,
    details: `ממ"ד נדרש: ${customer.saferoom === 'must_yes' ? 'כן' : 'לא'} | ממ"ד בנכס: ${property.saferoom ? 'כן' : 'לא'}`
  };
  totalScore += saferoomScore;

  // Balcony check
  if (customer.Balcony === 'must_yes' && !property.Balcony) {
    dealBreakers.push('נדרשת מרפסת');
  }

  // Renovation check
  if (customer.renovated === 'must_yes' && property.condition !== 'משופץ') {
    dealBreakers.push('נדרש נכס משופץ');
  }

  // TAMA check
  if (customer.TMA_potential === 'must_yes' && !property.TMA_potential) {
    dealBreakers.push('נדרש פוטנציאל תמ"א');
  }

  // Area check (8%)
  let areaScore = 0;
  if (customer.Area && property.area) {
    const customerAreas = Array.isArray(customer.Area) ? customer.Area : [customer.Area];
    const propertyAreas = Array.isArray(property.area) ? property.area : [property.area];
    
    const hasMatchingArea = customerAreas.some(area => propertyAreas.includes(area));
    if (hasMatchingArea) {
      areaScore = 8;
    } else if (customer.Area === 'must_specific') {
      dealBreakers.push('אזור לא מתאים');
    }
  }
  matchDetails.area = {
    score: areaScore,
    details: `אזורים מבוקשים: ${customer.Area} | אזור הנכס: ${property.area}`
  };
  totalScore += areaScore;

  // High-rise building check
  if (customer.high_rise === 'no' && property.max_floor > 9) {
    dealBreakers.push('לא מעוניין במגדלים');
  }

  // New project check
  if (customer.new_project === 'no' && property.project === 'yes') {
    dealBreakers.push('לא מעוניין בפרויקט חדש');
  }

  // Shelter check
  if (customer.shelter === 'no' && property.shelter === 'yes') {
    dealBreakers.push('לא מעוניין במקלט');
  }

  return {
    score: Math.min(totalScore, 100),
    matchDetails,
    dealBreakers,
    warning: dealBreakers.length > 0 && totalScore >= 85
  };
}; 