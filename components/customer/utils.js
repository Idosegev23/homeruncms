export const calculateMatchPercentage = (customer, property) => {
    let matchScore = 0;
    let totalCriteria = 0;
  
    // תקציב (40%)
    if (customer.Budget !== undefined && property.price !== undefined) {
      totalCriteria += 40;
      const maxPropertyPrice = customer.Budget + 600000;
      const minPropertyPrice = customer.Budget - 600000;
      if (property.price <= maxPropertyPrice && property.price >= minPropertyPrice) {
        matchScore += 40;
      }
    }
  
    // מ"ר (8%)
    if (customer.Square_meters !== undefined && property.square_meters !== undefined) {
      totalCriteria += 8;
      if (property.square_meters >= customer.Square_meters) {
        matchScore += 8;
      }
    }
  
    // מעלית (8%)
    if (customer.Elevator !== undefined && property.elevator !== undefined) {
      totalCriteria += 8;
      if (customer.Elevator === 'must_yes' && property.elevator === true) {
        matchScore += 8;
      }
    }
  
    // חניה (8%)
    if (customer.parking !== undefined && property.parking !== undefined) {
      totalCriteria += 8;
      if (customer.parking === 'must_yes' && property.parking === true) {
        matchScore += 8;
      }
    }
  
    // אזורים (8%)
    if (customer.area && customer.area.length > 0 && property.area !== undefined) {
      totalCriteria += 8;
      if (customer.area.includes(property.area)) {
        matchScore += 8;
      }
    }
  
    // ממ"ד (8%)
    if (customer.saferoom !== undefined && property.saferoom !== undefined) {
      totalCriteria += 8;
      if (customer.saferoom === 'must_yes' && property.saferoom === true) {
        matchScore += 8;
      }
    }
  
    // התחשבות ב"השקעה" – אם מסומן "כן", מתעלמים מכל שאר הפרמטרים ומתייחסים רק לתקציב
    if (customer.investment === 'yes') {
      return totalCriteria > 0 ? Math.round((matchScore / totalCriteria) * 100) : 0;
    }
  
    // חישוב סופי
    const matchPercentage = totalCriteria > 0 ? Math.round((matchScore / totalCriteria) * 100) : 0;
  
    // אפשרות גמישות במידה ויש יותר מ-85% התאמה
    if (matchPercentage > 85) {
      return matchPercentage;
    }
  
    return matchPercentage;
  };
  
  export const getAllCriteria = (customer, property) => {
    const criteria = [
      { name: 'תקציב', customerValue: customer.Budget, propertyValue: property.price },
      { name: 'מ"ר', customerValue: customer.Square_meters, propertyValue: property.square_meters },
      { name: 'מעלית', customerValue: customer.Elevator, propertyValue: property.elevator },
      { name: 'חניה', customerValue: customer.parking, propertyValue: property.parking },
      { name: 'אזור', customerValue: customer.area, propertyValue: property.area },
      { name: 'ממ"ד', customerValue: customer.saferoom, propertyValue: property.saferoom },
      { name: 'סוג נכס', customerValue: customer.Asset_type, propertyValue: property.asset_type },
      { name: 'השקעה', customerValue: customer.investment, propertyValue: property.investment },
      { name: 'קומת קרקע', customerValue: customer.land_floor, propertyValue: property.floor === 0 },
      { name: 'דירת גן', customerValue: customer.garden_apt, propertyValue: property.garden_apt },
      { name: 'שקטה', customerValue: customer.quiet, propertyValue: property.quiet },
      { name: 'מרפסת שמש', customerValue: customer.sun_balcony, propertyValue: property.sun_balcony },
      { name: 'משופץ', customerValue: customer.renovated, propertyValue: property.renovated },
      { name: 'פוטנציאל תמ"א', customerValue: customer.TMA_potential, propertyValue: property.tma_potential },
      { name: 'מגדלים', customerValue: customer.tower_is_ok, propertyValue: property.is_tower },
      { name: 'דירה מפרויקט', customerValue: customer.apt_from_project, propertyValue: property.from_project },
      { name: 'מקלט', customerValue: customer.shelter_is_ok, propertyValue: property.shelter }
    ];
  
    return criteria.map(c => ({
      name: c.name,
      customerValue: c.customerValue !== undefined ? c.customerValue : 'לא זמין',
      propertyValue: c.propertyValue !== undefined ? c.propertyValue : 'לא זמין',
      match: calculateMatch(c.name, c.customerValue, c.propertyValue)
    }));
  };
  
  const calculateMatch = (name, customerValue, propertyValue) => {
    if (customerValue === undefined || propertyValue === undefined) {
      return false;
    }
  
    if (name === 'תקציב') {
      return propertyValue >= (customerValue - 600000) && propertyValue <= (customerValue + 600000);
    }
  
    if (Array.isArray(customerValue)) {
      return customerValue.includes(propertyValue);
    }
  
    if (typeof customerValue === 'boolean') {
      return customerValue === propertyValue;
    }
  
    if (customerValue === 'must_yes') {
      return propertyValue === true;
    }
  
    if (customerValue === 'must_no') {
      return propertyValue === false;
    }
  
    return customerValue === propertyValue;
  };