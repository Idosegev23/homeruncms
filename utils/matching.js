const translateValue = (value) => {
  const translations = {
    'yes': 'כן',
    'no': 'לא',
    'must_yes': 'חובה כן',
    'must_no': 'חובה לא'
  };
  return translations[value] || value;
};

export const getAllCriteria = (customer, property) => {
  const criteria = [];

  // תקציב
  criteria.push({
    name: 'תקציב',
    customerValue: `₪${customer?.Budget?.toLocaleString() || 0}`,
    propertyValue: `₪${property?.price?.toLocaleString() || 0}`,
    match: Math.abs((property?.price || 0) - (customer?.Budget || 0)) <= (customer?.Budget || 0) * 0.1
  });

  // חדרים
  criteria.push({
    name: 'חדרים',
    customerValue: customer?.Rooms?.toString() || '0',
    propertyValue: property?.rooms?.toString() || '0',
    match: Math.abs((property?.rooms || 0) - (customer?.Rooms || 0)) <= 0.5
  });

  // שטח
  criteria.push({
    name: 'מטר רבוע',
    customerValue: `${customer?.Square_meters || 0} מ"ר`,
    propertyValue: `${property?.square_meters || 0} מ"ר`,
    match: Math.abs((property?.square_meters || 0) - (customer?.Square_meters || 0)) <= 20
  });

  // מעלית
  if (customer?.Elevator) {
    criteria.push({
      name: 'מעלית',
      customerValue: translateValue(customer.Elevator),
      propertyValue: property?.Elevator ? 'יש' : 'אין',
      match: customer.Elevator === 'must_yes' ? property?.Elevator : true
    });
  }

  // חניה
  if (customer?.parking) {
    criteria.push({
      name: 'חניה',
      customerValue: translateValue(customer.parking),
      propertyValue: property?.parking ? (property.parking_type === 'shared' ? 'חניה משותפת' : 'יש') : 'אין',
      match: customer.parking === 'must_yes' ? property?.parking : true
    });
  }

  // אזור
  if (customer?.area?.length > 0) {
    criteria.push({
      name: 'אזור',
      customerValue: customer.area.join(', '),
      propertyValue: property?.neighborhood || property?.street || 'לא צוין',
      match: customer?.area?.includes(property?.neighborhood)
    });
  }

  // ממ"ד
  if (customer?.saferoom) {
    criteria.push({
      name: 'ממ"ד',
      customerValue: translateValue(customer.saferoom),
      propertyValue: property?.saferoom ? 'יש' : 'אין',
      match: customer.saferoom === 'must_yes' ? property?.saferoom : true
    });
  }

  // מרפסת שמש
  if (customer?.balcony) {
    criteria.push({
      name: 'מרפסת שמש',
      customerValue: translateValue(customer.balcony),
      propertyValue: property?.Balcony ? 'יש' : 'אין',
      match: customer.balcony === 'must_yes' ? property?.Balcony : true
    });
  }

  // מצב הנכס
  if (customer?.renovated) {
    criteria.push({
      name: 'מצב הנכס',
      customerValue: translateValue(customer.renovated),
      propertyValue: property?.condition || 'לא צוין',
      match: customer.renovated === 'must_yes' ? property?.condition === 'renovated' : true
    });
  }

  return criteria;
};

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
    (40 * (1 - Math.abs(propertyPrice - customerBudget) / customerBudget));
  matchDetails.budget = {
    score: budgetScore,
    details: `תקציב לקוח: ₪${customerBudget.toLocaleString()} | מחיר נכס: ₪${propertyPrice.toLocaleString()}`
  };
  totalScore += budgetScore;

  // Investment property check
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
    (8 * (1 - Math.abs(property.square_meters - customer.Square_meters) / customer.Square_meters));
  matchDetails.squareMeters = {
    score: sqmScore,
    details: `מ"ר מבוקש: ${customer.Square_meters} | מ"ר בנכס: ${property.square_meters}`
  };
  totalScore += sqmScore;

  // Ground floor check
  if (customer.ground_floor === 'must_yes' && !property.is_ground_floor) {
    dealBreakers.push('חובה דירת גן');
  }

  // Quiet apartment check
  if (customer.quiet === 'must_yes' && !property.is_quiet) {
    dealBreakers.push('חובה דירה שקטה');
  }

  // Elevator check (8%)
  const elevatorScore = property.Elevator ? 8 : 0;
  matchDetails.elevator = {
    score: elevatorScore,
    details: `מעלית נדרשת: ${customer.Elevator === 'must_yes' ? 'כן' : 'לא'} | קיימת בנכס: ${property.Elevator ? 'כן' : 'לא'}`
  };
  if (customer.Elevator === 'must_yes' && !property.Elevator) {
    dealBreakers.push('חובה מעלית');
  }
  totalScore += elevatorScore;

  // Parking check (8%)
  let parkingScore = 0;
  if (property.parking) {
    parkingScore = property.parking_type === 'shared' ? 4 : 8;
  }
  matchDetails.parking = {
    score: parkingScore,
    details: `חניה נדרשת: ${customer.parking === 'must_yes' ? 'כן' : 'לא'} | סוג: ${property.parking_type || 'אין'}`
  };
  if (customer.parking === 'must_yes' && !property.parking) {
    dealBreakers.push('חובה חניה');
  }
  totalScore += parkingScore;

  // Area check (8%)
  const areaScore = customer.area?.includes(property.neighborhood) ? 8 : 0;
  matchDetails.area = {
    score: areaScore,
    details: `אזורים מבוקשים: ${customer.area?.join(', ')} | שכונת הנכס: ${property.neighborhood}`
  };
  if (customer.area_is_must === 'yes' && !customer.area?.includes(property.neighborhood)) {
    dealBreakers.push('אזור לא מתאים');
  }
  totalScore += areaScore;

  // Safe room check (8%)
  const saferoomScore = property.saferoom ? 8 : 0;
  matchDetails.saferoom = {
    score: saferoomScore,
    details: `ממ"ד נדרש: ${customer.saferoom === 'must_yes' ? 'כן' : 'לא'} | קיים בנכס: ${property.saferoom ? 'כן' : 'לא'}`
  };
  if (customer.saferoom === 'must_yes' && !property.saferoom) {
    dealBreakers.push('חובה ממ"ד');
  }
  totalScore += saferoomScore;

  return {
    score: Math.round(Math.min(100, totalScore)),
    matchDetails,
    dealBreakers,
    warning: dealBreakers.length > 0 && totalScore > 85
  };
};