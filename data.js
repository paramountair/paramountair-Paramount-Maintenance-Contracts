const COSTING_RULES = {
  "Split System": { labourHours: 1.25, visits: 4, baseMaterials: 18, scope: ["Inspect indoor and outdoor unit operation", "Clean return air filters where accessible", "Check refrigerant pipework condition", "Confirm controller operation and set points"] },
  "Package Unit": { labourHours: 2.5, visits: 4, baseMaterials: 55, scope: ["Inspect compressors, fans and electrical components", "Check operating pressures and temperatures", "Inspect condensate drains and trays", "Confirm safety controls and operational sequence"] },
  "Air Handling Unit": { labourHours: 2.75, visits: 4, baseMaterials: 70, scope: ["Inspect fan, motor and bearing condition", "Inspect filters, coils and access panels", "Check belts, pulleys and flexible connections", "Verify controls, sensors and airflow operation"] },
  "Chiller": { labourHours: 5.5, visits: 4, baseMaterials: 155, scope: ["Inspect refrigeration circuit and operating conditions", "Check compressor operation and electrical load", "Verify safety controls and alarms", "Review condenser condition and service access"] },
  "Cooling Tower": { labourHours: 3.75, visits: 12, baseMaterials: 120, scope: ["Inspect tower condition, fan and drive assembly", "Check water distribution and drift eliminators", "Inspect basins, strainers and access points", "Coordinate with water treatment provider where required"] },
  "Exhaust Fan": { labourHours: 0.85, visits: 2, baseMaterials: 12, scope: ["Inspect fan operation and mounting condition", "Check motor current and electrical connections", "Inspect grilles, duct connections and access", "Confirm airflow operation where accessible"] },
  "BMS / Controls": { labourHours: 2, visits: 4, baseMaterials: 35, scope: ["Review controller operation and alarms", "Verify time schedules and operating set points", "Inspect field devices where accessible", "Confirm communication with connected HVAC assets"] }
};

const LABOUR_RATE = 135;
const VEHICLE_RATE = 35;
const ADMIN_PERCENT = 0.08;
const OVERHEAD_PERCENT = 0.12;
const DEFAULT_MARGIN = 35;

const demoContracts = [
  {
    id: "PMA-26001", customerName: "Southbank Data Hall", siteAddress: "81 Riverside Drive, Southbank VIC", contactPerson: "Operations Lead", email: "ops@southbankdatahall.com.au", phone: "03 9000 1111", startDate: "2026-07-01", term: 12, margin: 38, status: "Active",
    assets: [{type:"Chiller", quantity:2, frequency:"Quarterly"},{type:"Air Handling Unit", quantity:8, frequency:"Quarterly"},{type:"BMS / Controls", quantity:1, frequency:"Quarterly"}]
  },
  {
    id: "PMA-26002", customerName: "Mulgrave Business Park", siteAddress: "39 Geddes Street, Mulgrave VIC", contactPerson: "Facilities Manager", email: "facilities@example.com", phone: "03 9561 3333", startDate: "2026-06-15", term: 12, margin: 35, status: "Outstanding",
    assets: [{type:"Package Unit", quantity:6, frequency:"Quarterly"},{type:"Exhaust Fan", quantity:10, frequency:"Six Monthly"}]
  },
  {
    id: "PMA-26003", customerName: "Alexandria Logistics", siteAddress: "34 Ralph Street, Alexandria NSW", contactPerson: "Site Manager", email: "site@example.com", phone: "02 8271 0822", startDate: "2026-05-01", term: 12, margin: 32, status: "Draft",
    assets: [{type:"Split System", quantity:18, frequency:"Quarterly"},{type:"Air Handling Unit", quantity:2, frequency:"Quarterly"}]
  }
];
