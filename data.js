const COSTING_RULES = {
  "Split System": { labourHours: 1.25, visits: 4, materials: 18, risk: "Low" },
  "Package Unit": { labourHours: 2.5, visits: 4, materials: 55, risk: "Medium" },
  "Air Handling Unit": { labourHours: 2.75, visits: 4, materials: 70, risk: "Medium" },
  "Fan Coil Unit": { labourHours: 0.85, visits: 4, materials: 16, risk: "Low" },
  "Chiller": { labourHours: 5.5, visits: 4, materials: 155, risk: "High" },
  "Cooling Tower": { labourHours: 3.75, visits: 12, materials: 120, risk: "High" },
  "Exhaust Fan": { labourHours: 0.85, visits: 2, materials: 12, risk: "Low" },
  "BMS / Controls": { labourHours: 2, visits: 4, materials: 35, risk: "High" }
};

const FINANCIAL_RULES = {
  labourRate: 118,
  vehiclePerVisit: 38,
  overheadPercent: 0.18,
  adminPercent: 0.08,
  contingencyPercent: 0.08
};

const SAMPLE_CONTRACTS = [
  {
    id: "PMA-26001", customerName: "Southbank Data Hall", siteAddress: "81 Riverside Drive, Southbank VIC", contactPerson: "Operations Lead", email: "ops@southbankdatahall.com.au", phone: "03 9000 1111", startDate: "2026-07-01", term: 36, targetMargin: 38, status: "Active",
    assets: [asset("Chiller",2,"Quarterly","Roof Plantroom"), asset("Air Handling Unit",8,"Quarterly","Plantroom Levels 1-4"), asset("BMS / Controls",1,"Quarterly","Control Room")]
  },
  {
    id: "PMA-26002", customerName: "Mulgrave Business Park", siteAddress: "39 Geddes Street, Mulgrave VIC", contactPerson: "Facilities Manager", email: "facilities@mulgravebp.com.au", phone: "03 9561 3333", startDate: "2026-06-15", term: 12, targetMargin: 35, status: "Outstanding",
    assets: [asset("Package Unit",6,"Quarterly","Tenancy Roof Area"), asset("Exhaust Fan",10,"Six Monthly","Amenities and Carpark")]
  },
  {
    id: "PMA-26003", customerName: "Alexandria Logistics", siteAddress: "34 Ralph Street, Alexandria NSW", contactPerson: "Site Manager", email: "site@alexandrialogistics.com.au", phone: "02 8271 0822", startDate: "2026-05-01", term: 12, targetMargin: 32, status: "Draft",
    assets: [asset("Split System",18,"Quarterly","Office and Dispatch"), asset("Air Handling Unit",2,"Quarterly","Warehouse Plant Deck")]
  },
  {
    id: "PMA-26004", customerName: "Morningside Industrial", siteAddress: "160 Lytton Road, Morningside QLD", contactPerson: "Maintenance Manager", email: "maintenance@morningsideindustrial.com.au", phone: "07 0000 0000", startDate: "2026-04-01", term: 12, targetMargin: 36, status: "Active",
    assets: [asset("Cooling Tower",1,"Monthly","Roof"), asset("Package Unit",4,"Quarterly","Production Area")]
  }
];

function asset(type, quantity, frequency, location){ return { type, quantity:Number(quantity), frequency, location: location || "Site" }; }
