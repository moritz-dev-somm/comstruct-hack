export type Product = {
  id: number;
  name: string;
  spec: string;
  category: string;
  supplier: string;
  flag: string; // emoji flag
  price: number; // CHF
  packSize: number;
  packUnit: string;
  keywords: string[];
};

export type Bundle = {
  id: string;
  name: string;
  description: string;
  price: number;
  productIds: number[];
};

export const CATALOG: Product[] = [
  { id: 1043, name: "Spax Universal Screw", spec: "3.5 × 35 mm · Torx, fine thread", category: "Fasteners", supplier: "Spax", flag: "🇩🇪", price: 12.40, packSize: 100, packUnit: "screws", keywords: ["drywall", "gypsum", "metal stud", "screw", "fine thread"] },
  { id: 1044, name: "Rigips Drywall Screw", spec: "3.5 × 25 mm · phosphate, fine", category: "Fasteners", supplier: "Rigips", flag: "🇨🇭", price: 8.90, packSize: 100, packUnit: "screws", keywords: ["drywall", "gypsum", "screw", "rigips"] },
  { id: 1045, name: "SFS Self-Drilling Screw", spec: "4.2 × 13 mm · zinc plated", category: "Fasteners", supplier: "SFS", flag: "🇨🇭", price: 14.20, packSize: 100, packUnit: "screws", keywords: ["metal", "stud", "self drilling", "screw"] },
  { id: 1046, name: "Fischer Universal Plug", spec: "UX 8 × 50 · nylon", category: "Fasteners", supplier: "Fischer", flag: "🇩🇪", price: 9.50, packSize: 50, packUnit: "plugs", keywords: ["plug", "wall plug", "anchor", "concrete"] },
  { id: 1047, name: "Hilti HUS3 Concrete Screw", spec: "6 × 60 mm", category: "Fasteners", supplier: "Hilti", flag: "🇱🇮", price: 28.00, packSize: 50, packUnit: "screws", keywords: ["concrete", "screw", "hilti", "anchor"] },

  { id: 1080, name: "Knauf Joint Tape", spec: "50 mm × 90 m · paper", category: "Tape", supplier: "Knauf", flag: "🇩🇪", price: 7.20, packSize: 1, packUnit: "roll", keywords: ["drywall", "gypsum", "joint", "tape", "seam"] },
  { id: 1081, name: "Tesa Window Sealing Tape", spec: "50 mm × 25 m", category: "Tape", supplier: "Tesa", flag: "🇩🇪", price: 18.50, packSize: 1, packUnit: "roll", keywords: ["window", "seal", "tape", "vapor"] },
  { id: 1087, name: "Knauf Uniflott Joint Filler", spec: "5 kg bag", category: "Sealants", supplier: "Knauf", flag: "🇩🇪", price: 14.80, packSize: 1, packUnit: "bag", keywords: ["drywall", "gypsum", "filler", "joint", "spackle"] },
  { id: 1088, name: "Sika Window Silicone", spec: "300 ml cartridge · grey", category: "Sealants", supplier: "Sika", flag: "🇨🇭", price: 9.90, packSize: 1, packUnit: "cartridge", keywords: ["window", "seal", "silicone", "sika"] },
  { id: 1089, name: "Soudal Expanding Foam", spec: "750 ml · low expansion", category: "Sealants", supplier: "Soudal", flag: "🇧🇪", price: 11.50, packSize: 1, packUnit: "can", keywords: ["window", "foam", "insulation", "gap"] },

  { id: 1100, name: "uvex Phynomic Gloves", spec: "size 10 · cut level B", category: "PPE", supplier: "uvex", flag: "🇩🇪", price: 4.20, packSize: 1, packUnit: "pair", keywords: ["ppe", "gloves", "hand", "worker"] },
  { id: 1101, name: "3M Aura Dust Mask", spec: "FFP3 · valved", category: "PPE", supplier: "3M", flag: "🇺🇸", price: 6.80, packSize: 10, packUnit: "masks", keywords: ["ppe", "mask", "dust", "ffp3", "concrete"] },
  { id: 1102, name: "uvex Safety Glasses", spec: "i-3 clear · anti-fog", category: "PPE", supplier: "uvex", flag: "🇩🇪", price: 12.00, packSize: 1, packUnit: "pair", keywords: ["ppe", "glasses", "eye", "safety"] },
  { id: 1103, name: "Helly Hansen Hi-Vis Vest", spec: "yellow · size L", category: "PPE", supplier: "Helly Hansen", flag: "🇳🇴", price: 22.50, packSize: 1, packUnit: "vest", keywords: ["ppe", "vest", "hi-vis", "safety"] },
  { id: 1104, name: "Petzl Vertex Helmet", spec: "white · vented", category: "PPE", supplier: "Petzl", flag: "🇫🇷", price: 78.00, packSize: 1, packUnit: "helmet", keywords: ["ppe", "helmet", "head", "hardhat"] },

  { id: 1120, name: "Bosch SDS-Plus Drill Bit", spec: "8 × 160 mm", category: "Tools", supplier: "Bosch", flag: "🇩🇪", price: 9.40, packSize: 1, packUnit: "bit", keywords: ["drill", "bit", "concrete", "sds"] },
  { id: 1121, name: "Stanley Utility Knife Blades", spec: "0.6 mm · pack of 10", category: "Tools", supplier: "Stanley", flag: "🇺🇸", price: 5.50, packSize: 10, packUnit: "blades", keywords: ["knife", "blade", "cutter"] },
  { id: 1140, name: "Milwaukee M18 Battery", spec: "5.0 Ah Li-Ion", category: "Batteries", supplier: "Milwaukee", flag: "🇺🇸", price: 119.00, packSize: 1, packUnit: "battery", keywords: ["battery", "m18", "cordless", "milwaukee"] },
];

export const BUNDLES: Bundle[] = [
  {
    id: "drywall_50m2",
    name: "Drywall kit · 50 m²",
    description: "Screws, tape, filler — enough for 50 m² of gypsum on metal studs.",
    price: 89.00,
    productIds: [1043, 1080, 1087],
  },
  {
    id: "basic_ppe",
    name: "Basic PPE pack",
    description: "Helmet, glasses, vest, gloves, dust masks for one new worker.",
    price: 125.00,
    productIds: [1100, 1101, 1102, 1103, 1104],
  },
  {
    id: "window_seal",
    name: "Window sealing kit",
    description: "Foam, silicone, vapor tape for sealing around a window.",
    price: 39.00,
    productIds: [1081, 1088, 1089],
  },
];

export function findProductMentions(text: string): number[] {
  const lower = text.toLowerCase();
  const found: number[] = [];
  for (const p of CATALOG) {
    const hay = [p.name, p.spec, ...p.keywords].join(" ").toLowerCase();
    // match by supplier+name pieces
    const nameTokens = p.name.toLowerCase().split(/\s+/).filter((t) => t.length > 3);
    const hit =
      lower.includes(p.name.toLowerCase()) ||
      nameTokens.filter((t) => lower.includes(t)).length >= 2 ||
      p.keywords.some((k) => k.length > 4 && lower.includes(k));
    if (hit && !found.includes(p.id)) found.push(p.id);
    // also: hay used for future fuzzy
    void hay;
  }
  return found;
}
