// Sample call data — replace with Google Sheets integration in Phase 3
// Each row = one recorded Zoom call analyzed by ChatGPT via Zapier

export const rawCalls = [
  // --- May 3 ---
  { id: 1,  employee: 'Isaac',  date: '2026-05-03', customer: 'Evergreen Insurance',      score: 9.4, frustrated: false, category: 'Onboarding' },
  { id: 2,  employee: 'Maria',  date: '2026-05-03', customer: 'Coastal Risk Group',       score: 7.2, frustrated: false, category: 'Support' },

  // --- May 5 ---
  { id: 3,  employee: 'Karen',  date: '2026-05-05', customer: 'Summit Agency',            score: 8.9, frustrated: false, category: 'Onboarding' },
  { id: 4,  employee: 'Juan E', date: '2026-05-05', customer: 'Lakewood Benefits',        score: 6.1, frustrated: true,  category: 'Support' },
  { id: 5,  employee: 'Carlos', date: '2026-05-05', customer: 'Prairie Shield Co',        score: 7.8, frustrated: false, category: 'Customer Service' },

  // --- May 7 ---
  { id: 6,  employee: 'Isaac',  date: '2026-05-07', customer: 'Northstar Insurance',      score: 9.1, frustrated: false, category: 'Onboarding' },
  { id: 7,  employee: 'Karen',  date: '2026-05-07', customer: 'Riverbend Agency',         score: 8.6, frustrated: false, category: 'Support' },
  { id: 8,  employee: 'Maria',  date: '2026-05-07', customer: 'Blue Horizon Brokers',     score: 5.4, frustrated: true,  category: 'Support' },

  // --- May 9 ---
  { id: 9,  employee: 'Juan E', date: '2026-05-09', customer: 'Capital Coverage LLC',     score: 8.2, frustrated: false, category: 'Onboarding' },
  { id: 10, employee: 'Carlos', date: '2026-05-09', customer: 'Redwood Risk Partners',    score: 6.8, frustrated: false, category: 'Customer Service' },

  // --- May 12 ---
  { id: 11, employee: 'Karen',  date: '2026-05-12', customer: 'Skyline Benefits Group',   score: 9.3, frustrated: false, category: 'Onboarding' },
  { id: 12, employee: 'Isaac',  date: '2026-05-12', customer: 'Heartland Insurance',      score: 9.7, frustrated: false, category: 'Customer Service' },
  { id: 13, employee: 'Juan E', date: '2026-05-12', customer: 'Mountain West Agency',     score: 5.8, frustrated: true,  category: 'Support' },

  // --- May 14 ---
  { id: 14, employee: 'Maria',  date: '2026-05-14', customer: 'Clearwater Assurance',     score: 8.0, frustrated: false, category: 'Onboarding' },
  { id: 15, employee: 'Carlos', date: '2026-05-14', customer: 'Sunstate Risk Advisors',   score: 7.5, frustrated: false, category: 'Customer Service' },
  { id: 16, employee: 'Karen',  date: '2026-05-14', customer: 'Midwest Brokers Inc',      score: 8.4, frustrated: false, category: 'Support' },

  // --- May 16 ---
  { id: 17, employee: 'Isaac',  date: '2026-05-16', customer: 'Pacific Shield Agency',    score: 9.0, frustrated: false, category: 'Onboarding' },
  { id: 18, employee: 'Juan E', date: '2026-05-16', customer: 'Granite State Coverage',   score: 7.9, frustrated: false, category: 'Customer Service' },

  // --- May 19 ---
  { id: 19, employee: 'Carlos', date: '2026-05-19', customer: 'Golden Gate Insurance',    score: 4.9, frustrated: true,  category: 'Support' },
  { id: 20, employee: 'Maria',  date: '2026-05-19', customer: 'Bluegrass Benefits Co',    score: 8.3, frustrated: false, category: 'Onboarding' },
  { id: 21, employee: 'Karen',  date: '2026-05-19', customer: 'Lone Star Risk Group',     score: 9.1, frustrated: false, category: 'Customer Service' },

  // --- May 21 ---
  { id: 22, employee: 'Isaac',  date: '2026-05-21', customer: 'Cascade Insurance LLC',    score: 8.8, frustrated: false, category: 'Support' },
  { id: 23, employee: 'Juan E', date: '2026-05-21', customer: 'Great Plains Agency',      score: 6.4, frustrated: true,  category: 'Customer Service' },

  // --- May 23 ---
  { id: 24, employee: 'Karen',  date: '2026-05-23', customer: 'Shoreline Benefits',       score: 8.7, frustrated: false, category: 'Onboarding' },
  { id: 25, employee: 'Maria',  date: '2026-05-23', customer: 'Desert Sun Insurance',     score: 7.6, frustrated: false, category: 'Support' },
  { id: 26, employee: 'Carlos', date: '2026-05-23', customer: 'Ozark Risk Partners',      score: 8.1, frustrated: false, category: 'Customer Service' },

  // --- May 26 ---
  { id: 27, employee: 'Isaac',  date: '2026-05-26', customer: 'Tidewater Agency Group',   score: 9.5, frustrated: false, category: 'Onboarding' },
  { id: 28, employee: 'Juan E', date: '2026-05-26', customer: 'Centennial Coverage Co',   score: 8.0, frustrated: false, category: 'Support' },
  { id: 29, employee: 'Karen',  date: '2026-05-26', customer: 'Frontier Insurance Inc',   score: 8.2, frustrated: false, category: 'Customer Service' },

  // --- May 28 ---
  { id: 30, employee: 'Maria',  date: '2026-05-28', customer: 'Bayou Brokers LLC',        score: 6.7, frustrated: false, category: 'Support' },
  { id: 31, employee: 'Carlos', date: '2026-05-28', customer: 'High Plains Agency',       score: 5.2, frustrated: true,  category: 'Customer Service' },

  // --- May 30 ---
  { id: 32, employee: 'Isaac',  date: '2026-05-30', customer: 'Riverview Risk Group',     score: 9.2, frustrated: false, category: 'Onboarding' },
  { id: 33, employee: 'Karen',  date: '2026-05-30', customer: 'Clearmont Insurance',      score: 8.8, frustrated: false, category: 'Support' },

  // --- Jun 1 ---
  { id: 34, employee: 'Juan E', date: '2026-06-01', customer: 'Keystone Benefits Group',  score: 8.5, frustrated: false, category: 'Onboarding' },
  { id: 35, employee: 'Maria',  date: '2026-06-01', customer: 'Copper State Agency',      score: 7.9, frustrated: false, category: 'Customer Service' },
  { id: 36, employee: 'Carlos', date: '2026-06-01', customer: 'Pinnacle Risk Advisors',   score: 7.3, frustrated: false, category: 'Support' },
]
