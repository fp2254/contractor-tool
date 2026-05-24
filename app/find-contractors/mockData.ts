const U = (id: string, w = 600, h = 300) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;

export type Contractor = {
  id: string;
  slug: string;
  name: string;
  trade: string;
  services: string[];
  tagline: string;
  description: string;
  location: string;
  city: string;
  distance: number;
  rating_google: number;
  reviews_google: number;
  rating_tb: number;
  reviews_tb: number;
  verified_projects: number;
  repeat_customers: number;
  licensed: boolean;
  insured: boolean;
  emergency: boolean;
  verified: boolean;
  veteran_owned: boolean;
  years_in_business: number;
  jobs_completed: number;
  cover_color: string;
  cover_photo: string;
  project_photos: string[];
  avatar_color: string;
  lat: number;
  lng: number;
  featured: boolean;
  response_time: string;
};

export type Project = {
  id: string;
  slug: string;
  contractor_id: string;
  contractor_slug: string;
  contractor_name: string;
  avatar_color: string;
  trade: string;
  title: string;
  location: string;
  photo: string;
  time_ago: string;
};

export type ProjectDetail = {
  slug: string;
  contractor_id: string;
  contractor_slug: string;
  contractor_name: string;
  contractor_tagline: string;
  avatar_color: string;
  cover_color: string;
  trade: string;
  title: string;
  location: string;
  photos: string[];
  before_photo?: string;
  after_photo?: string;
  description: string;
  scope: string[];
  materials: string[];
  duration: string;
  completed_date: string;
  time_ago: string;
  rating_google: number;
  reviews_google: number;
  rating_tb: number;
  reviews_tb: number;
  verified: boolean;
  licensed: boolean;
  insured: boolean;
  veteran_owned: boolean;
  verified_projects: number;
  customer_quote: string;
  customer_name: string;
};

export const CONTRACTORS: Contractor[] = [
  {
    id: "1",
    slug: "mike-sullivan-roofing",
    name: "Sullivan Roofing Co.",
    trade: "Roofing",
    services: ["Roof Replacement", "Roof Repair", "Gutters", "Skylights", "Metal Roofing"],
    tagline: "Portland's most trusted roofer since 2003",
    description: "Family-owned roofing company with 20+ years serving the Portland metro. We specialize in asphalt shingle, metal roofing, and flat roofs. Free estimates always.",
    location: "Portland, OR",
    city: "Portland",
    distance: 1.2,
    rating_google: 4.9,
    reviews_google: 312,
    rating_tb: 4.8,
    reviews_tb: 47,
    verified_projects: 47,
    repeat_customers: 68,
    licensed: true,
    insured: true,
    emergency: false,
    verified: true,
    veteran_owned: true,
    years_in_business: 21,
    jobs_completed: 1840,
    cover_color: "from-slate-700 to-slate-900",
    cover_photo: U("1582268611958-ebfd161ef9cf"),
    project_photos: [
      U("1568605114-ccfd63f70d8e", 160, 100),
      U("1570129477492-7b76ee02d73c", 160, 100),
      U("1558618666-fcd25c85cd64", 160, 100),
    ],
    avatar_color: "#1B3A6B",
    lat: 45.521,
    lng: -122.675,
    featured: true,
    response_time: "~2 hrs",
  },
  {
    id: "2",
    slug: "portland-electric",
    name: "Portland Electric Co.",
    trade: "Electrician",
    services: ["Panel Upgrades", "EV Chargers", "Wiring", "Lighting", "Smart Home"],
    tagline: "Licensed electricians — same-day service available",
    description: "Full-service electrical contractor for residential and light commercial. Specializing in panel upgrades, EV charger installations, and smart home wiring.",
    location: "NE Portland, OR",
    city: "Portland",
    distance: 2.7,
    rating_google: 4.8,
    reviews_google: 198,
    rating_tb: 5.0,
    reviews_tb: 31,
    verified_projects: 31,
    repeat_customers: 54,
    licensed: true,
    insured: true,
    emergency: true,
    verified: true,
    veteran_owned: false,
    years_in_business: 12,
    jobs_completed: 920,
    cover_color: "from-yellow-600 to-amber-800",
    cover_photo: U("1621905252507-b35492cc74b4"),
    project_photos: [
      U("1581094288338-2314dddb0f7b", 160, 100),
      U("1565814329452-e7fcdb4820a4", 160, 100),
      U("1606760329800-74a6b1538ee6", 160, 100),
    ],
    avatar_color: "#D97706",
    lat: 45.548,
    lng: -122.643,
    featured: true,
    response_time: "~1 hr",
  },
  {
    id: "3",
    slug: "pacific-plumbing",
    name: "Pacific Plumbing & Drain",
    trade: "Plumbing",
    services: ["Drain Cleaning", "Water Heaters", "Repiping", "Leak Repair", "Sewer"],
    tagline: "Fast, reliable plumbing — we stop leaks fast",
    description: "Licensed master plumber serving Portland and Beaverton. Specializing in drain cleaning, water heater replacement, and leak detection. 24/7 emergency calls welcome.",
    location: "Beaverton, OR",
    city: "Beaverton",
    distance: 5.3,
    rating_google: 4.7,
    reviews_google: 241,
    rating_tb: 4.7,
    reviews_tb: 28,
    verified_projects: 28,
    repeat_customers: 61,
    licensed: true,
    insured: true,
    emergency: true,
    verified: true,
    veteran_owned: false,
    years_in_business: 9,
    jobs_completed: 1340,
    cover_color: "from-blue-700 to-blue-900",
    cover_photo: U("1603796846097-bee99e4a601f"),
    project_photos: [
      U("1585771724684-38269d6639fd", 160, 100),
      U("1552321554-5fefe8c9ef14", 160, 100),
      U("1556909172-8c2f746b8d72", 160, 100),
    ],
    avatar_color: "#1D4ED8",
    lat: 45.487,
    lng: -122.803,
    featured: false,
    response_time: "~3 hrs",
  },
  {
    id: "4",
    slug: "summit-hvac",
    name: "Summit HVAC & Comfort",
    trade: "HVAC",
    services: ["AC Install", "Furnace Repair", "Heat Pumps", "Air Quality", "Mini Splits"],
    tagline: "Year-round comfort for your home",
    description: "NATE-certified HVAC technicians serving Lake Oswego and surrounding areas. Expert installation of all major brands. Energy-efficient heat pump specialists.",
    location: "Lake Oswego, OR",
    city: "Lake Oswego",
    distance: 8.1,
    rating_google: 4.9,
    reviews_google: 156,
    rating_tb: 4.9,
    reviews_tb: 22,
    verified_projects: 22,
    repeat_customers: 43,
    licensed: true,
    insured: true,
    emergency: false,
    verified: true,
    veteran_owned: true,
    years_in_business: 15,
    jobs_completed: 780,
    cover_color: "from-cyan-700 to-teal-900",
    cover_photo: U("1581094288338-2314dddb0f7b"),
    project_photos: [
      U("1525785967-5e5bed3e3a92", 160, 100),
      U("1558618047-3c95c7f0b8c4", 160, 100),
      U("1504307651254-35680f356dfd", 160, 100),
    ],
    avatar_color: "#0891B2",
    lat: 45.421,
    lng: -122.701,
    featured: false,
    response_time: "~4 hrs",
  },
  {
    id: "5",
    slug: "nw-painting-pros",
    name: "NW Painting Pros",
    trade: "Painting",
    services: ["Interior Painting", "Exterior Painting", "Cabinet Refinishing", "Deck Staining"],
    tagline: "Flawless finishes — on time, every time",
    description: "Professional residential painting with meticulous prep and premium materials. Interior and exterior specialists with a 2-year workmanship guarantee on all projects.",
    location: "SW Portland, OR",
    city: "Portland",
    distance: 3.4,
    rating_google: 4.6,
    reviews_google: 87,
    rating_tb: 4.8,
    reviews_tb: 19,
    verified_projects: 19,
    repeat_customers: 38,
    licensed: true,
    insured: true,
    emergency: false,
    verified: false,
    veteran_owned: false,
    years_in_business: 6,
    jobs_completed: 430,
    cover_color: "from-purple-700 to-purple-900",
    cover_photo: U("1562259929-b4e1fd3aef09"),
    project_photos: [
      U("1589939018090-7b0f0d7b9a05", 160, 100),
      U("1568605114-ccfd63f70d8e", 160, 100),
      U("1570129477492-7b76ee02d73c", 160, 100),
    ],
    avatar_color: "#7C3AED",
    lat: 45.497,
    lng: -122.695,
    featured: false,
    response_time: "~6 hrs",
  },
  {
    id: "6",
    slug: "concrete-masters-nw",
    name: "Concrete Masters NW",
    trade: "Concrete",
    services: ["Driveways", "Patios", "Foundations", "Stamped Concrete", "Walkways"],
    tagline: "Built to last — concrete work you can be proud of",
    description: "Decorative and structural concrete specialists for Portland homeowners. Driveways, patios, walkways, and exposed aggregate. 30-year family legacy.",
    location: "Gresham, OR",
    city: "Gresham",
    distance: 11.6,
    rating_google: 4.8,
    reviews_google: 124,
    rating_tb: 4.6,
    reviews_tb: 14,
    verified_projects: 14,
    repeat_customers: 29,
    licensed: true,
    insured: true,
    emergency: false,
    verified: true,
    veteran_owned: false,
    years_in_business: 30,
    jobs_completed: 2100,
    cover_color: "from-stone-600 to-stone-800",
    cover_photo: U("1504307651254-35680f356dfd"),
    project_photos: [
      U("1501854140801-50d01698950b", 160, 100),
      U("1503708928676-1cb796a0891e", 160, 100),
      U("1570129477492-7b76ee02d73c", 160, 100),
    ],
    avatar_color: "#78716C",
    lat: 45.502,
    lng: -122.431,
    featured: false,
    response_time: "~1 day",
  },
  {
    id: "7",
    slug: "clean-gutter-co",
    name: "Clean Gutter Co.",
    trade: "Gutters",
    services: ["Gutter Cleaning", "Gutter Guards", "Downspout Repair", "Fascia", "Leaf Guards"],
    tagline: "Keep water where it belongs",
    description: "Gutter cleaning, repair, and guard installation for Portland homes. Seasonal maintenance plans available. Fully insured. Same-week scheduling most of the year.",
    location: "Tigard, OR",
    city: "Tigard",
    distance: 6.8,
    rating_google: 4.7,
    reviews_google: 203,
    rating_tb: 4.5,
    reviews_tb: 38,
    verified_projects: 38,
    repeat_customers: 72,
    licensed: false,
    insured: true,
    emergency: false,
    verified: false,
    veteran_owned: false,
    years_in_business: 4,
    jobs_completed: 610,
    cover_color: "from-green-700 to-emerald-900",
    cover_photo: U("1558618666-fcd25c85cd64"),
    project_photos: [
      U("1568605114-ccfd63f70d8e", 160, 100),
      U("1582268611958-ebfd161ef9cf", 160, 100),
      U("1570129477492-7b76ee02d73c", 160, 100),
    ],
    avatar_color: "#16A34A",
    lat: 45.431,
    lng: -122.771,
    featured: false,
    response_time: "~5 hrs",
  },
  {
    id: "8",
    slug: "cascade-tile-stone",
    name: "Cascade Tile & Stone",
    trade: "Tile & Flooring",
    services: ["Tile Installation", "Hardwood", "LVP Flooring", "Bathroom Remodel", "Custom Mosaic"],
    tagline: "Precision tile work for lasting beauty",
    description: "Award-winning tile and flooring installation with 15+ years of experience. Kitchens, bathrooms, showers, and custom mosaic work. Museum-quality finishes.",
    location: "NW Portland, OR",
    city: "Portland",
    distance: 4.1,
    rating_google: 5.0,
    reviews_google: 91,
    rating_tb: 5.0,
    reviews_tb: 11,
    verified_projects: 11,
    repeat_customers: 45,
    licensed: true,
    insured: true,
    emergency: false,
    verified: true,
    veteran_owned: false,
    years_in_business: 16,
    jobs_completed: 890,
    cover_color: "from-rose-700 to-rose-900",
    cover_photo: U("1556909114-f6e7ad7d3136"),
    project_photos: [
      U("1552321554-5fefe8c9ef14", 160, 100),
      U("1536566482680-fca31930a0bd", 160, 100),
      U("1556909172-8c2f746b8d72", 160, 100),
    ],
    avatar_color: "#E11D48",
    lat: 45.533,
    lng: -122.700,
    featured: false,
    response_time: "~2 hrs",
  },
];

export const PROJECTS: Project[] = [
  {
    id: "p1",
    slug: "full-roof-replacement-se-portland",
    contractor_id: "1",
    contractor_slug: "mike-sullivan-roofing",
    contractor_name: "Sullivan Roofing",
    avatar_color: "#1B3A6B",
    trade: "Roofing",
    title: "Full Roof Replacement",
    location: "SE Portland",
    photo: U("1582268611958-ebfd161ef9cf", 340, 220),
    time_ago: "2 days ago",
  },
  {
    id: "p2",
    slug: "master-bath-tile-remodel-nw-portland",
    contractor_id: "8",
    contractor_slug: "cascade-tile-stone",
    contractor_name: "Cascade Tile",
    avatar_color: "#E11D48",
    trade: "Tile & Flooring",
    title: "Master Bath Tile Remodel",
    location: "NW Portland",
    photo: U("1556909114-f6e7ad7d3136", 340, 220),
    time_ago: "4 days ago",
  },
  {
    id: "p3",
    slug: "ev-charger-panel-upgrade-ne-portland",
    contractor_id: "2",
    contractor_slug: "portland-electric",
    contractor_name: "Portland Electric",
    avatar_color: "#D97706",
    trade: "Electrician",
    title: "EV Charger + Panel Upgrade",
    location: "NE Portland",
    photo: U("1621905252507-b35492cc74b4", 340, 220),
    time_ago: "1 week ago",
  },
  {
    id: "p4",
    slug: "stamped-concrete-patio-gresham",
    contractor_id: "6",
    contractor_slug: "concrete-masters-nw",
    contractor_name: "Concrete Masters",
    avatar_color: "#78716C",
    trade: "Concrete",
    title: "Stamped Concrete Patio",
    location: "Gresham",
    photo: U("1504307651254-35680f356dfd", 340, 220),
    time_ago: "1 week ago",
  },
  {
    id: "p5",
    slug: "whole-home-exterior-paint-sw-portland",
    contractor_id: "5",
    contractor_slug: "nw-painting-pros",
    contractor_name: "NW Painting Pros",
    avatar_color: "#7C3AED",
    trade: "Painting",
    title: "Whole-Home Exterior Paint",
    location: "SW Portland",
    photo: U("1562259929-b4e1fd3aef09", 340, 220),
    time_ago: "2 weeks ago",
  },
  {
    id: "p6",
    slug: "tankless-water-heater-beaverton",
    contractor_id: "3",
    contractor_slug: "pacific-plumbing",
    contractor_name: "Pacific Plumbing",
    avatar_color: "#1D4ED8",
    trade: "Plumbing",
    title: "Tankless Water Heater Install",
    location: "Beaverton",
    photo: U("1603796846097-bee99e4a601f", 340, 220),
    time_ago: "2 weeks ago",
  },
  {
    id: "p7",
    slug: "heat-pump-air-handler-lake-oswego",
    contractor_id: "4",
    contractor_slug: "summit-hvac",
    contractor_name: "Summit HVAC",
    avatar_color: "#0891B2",
    trade: "HVAC",
    title: "Heat Pump + Air Handler",
    location: "Lake Oswego",
    photo: U("1581094288338-2314dddb0f7b", 340, 220),
    time_ago: "3 weeks ago",
  },
  {
    id: "p8",
    slug: "metal-roof-skylights-sellwood",
    contractor_id: "1",
    contractor_slug: "mike-sullivan-roofing",
    contractor_name: "Sullivan Roofing",
    avatar_color: "#1B3A6B",
    trade: "Roofing",
    title: "Metal Roof + Skylights",
    location: "Sellwood",
    photo: U("1570129477492-7b76ee02d73c", 340, 220),
    time_ago: "1 month ago",
  },
];

export const PROJECT_DETAILS: ProjectDetail[] = [
  {
    slug: "full-roof-replacement-se-portland",
    contractor_id: "1",
    contractor_slug: "mike-sullivan-roofing",
    contractor_name: "Sullivan Roofing Co.",
    contractor_tagline: "Portland's most trusted roofer since 2003",
    avatar_color: "#1B3A6B",
    cover_color: "from-slate-700 to-slate-900",
    trade: "Roofing",
    title: "Full Roof Replacement",
    location: "SE Portland, OR",
    photos: [
      U("1582268611958-ebfd161ef9cf", 1200, 600),
      U("1568605114-ccfd63f70d8e", 800, 500),
      U("1570129477492-7b76ee02d73c", 800, 500),
      U("1558618666-fcd25c85cd64", 800, 500),
    ],
    description: "Complete tear-off and replacement of a 2,400 sq ft residential roof in SE Portland. The homeowner had an aging 25-year-old asphalt shingle roof showing significant granule loss, two active leak points, and deteriorating flashing around the chimney. Sullivan Roofing performed a full tear-off to the decking, inspected and replaced damaged sheathing, and installed a premium 50-year architectural shingle system with ice and water shield throughout the valley areas.",
    scope: [
      "Full tear-off of existing 3-tab shingles",
      "Replacement of 4 sheets of deteriorated plywood decking",
      "Ice and water shield in all valleys and eaves",
      "New synthetic underlayment over entire deck",
      "50-year architectural shingles (Owens Corning Duration)",
      "Full chimney re-flashing with copper step flashing",
      "New ridge cap and hip shingles",
      "Gutter cleaning and realignment post-install",
    ],
    materials: [
      "Owens Corning Duration 50-yr architectural shingles",
      "Grace Ice & Water Shield",
      "Rhino Synthetic Underlayment",
      "Copper step flashing",
      "Galvanized drip edge",
    ],
    duration: "2 days",
    completed_date: "May 21, 2026",
    time_ago: "2 days ago",
    rating_google: 4.9,
    reviews_google: 312,
    rating_tb: 4.8,
    reviews_tb: 47,
    verified: true,
    licensed: true,
    insured: true,
    veteran_owned: true,
    verified_projects: 47,
    before_photo: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1200&h=600&q=80",
    after_photo: "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&w=1200&h=600&q=80",
    customer_quote: "Mike and his crew were incredible. They showed up on time both days, cleaned up immaculately, and the new roof looks amazing. Finished 3 hours early on day two. Highly recommend Sullivan Roofing to anyone in Portland.",
    customer_name: "Sarah T. — Woodstock, Portland",
  },
  {
    slug: "master-bath-tile-remodel-nw-portland",
    contractor_id: "8",
    contractor_slug: "cascade-tile-stone",
    contractor_name: "Cascade Tile & Stone",
    contractor_tagline: "Precision tile work for lasting beauty",
    avatar_color: "#E11D48",
    cover_color: "from-rose-700 to-rose-900",
    trade: "Tile & Flooring",
    title: "Master Bath Tile Remodel",
    location: "NW Portland, OR",
    photos: [
      U("1556909114-f6e7ad7d3136", 1200, 600),
      U("1552321554-5fefe8c9ef14", 800, 500),
      U("1536566482680-fca31930a0bd", 800, 500),
      U("1556909172-8c2f746b8d72", 800, 500),
    ],
    description: "Full master bathroom tile renovation for a 1940s bungalow in NW Portland. The homeowner wanted to preserve the home's character while adding modern luxury. Cascade Tile & Stone designed a herringbone floor pattern in large-format porcelain paired with a custom hand-set subway tile shower surround. The work included complete demo, waterproofing, and precision installation with tight 1/8-inch grout joints throughout.",
    scope: [
      "Demo of existing tile and cement board",
      "Kerdi waterproofing system in shower",
      "Large-format 24x24 porcelain floor tile (herringbone pattern)",
      "3x12 subway tile shower surround floor to ceiling",
      "Custom niche installation with bullnose edge",
      "Schluter Reno-T transitions and trim",
      "Heated floor mat installation (Nuheat)",
      "Grout sealing on all surfaces",
    ],
    materials: [
      "Marazzi Montagna 24x24 porcelain (floor)",
      "Daltile Restore Bright White 3x12 subway (shower)",
      "Schluter Kerdi waterproofing membrane",
      "Nuheat electric floor heating mat",
      "Mapei Ultracolor Plus grout",
    ],
    duration: "5 days",
    completed_date: "May 19, 2026",
    time_ago: "4 days ago",
    rating_google: 5.0,
    reviews_google: 91,
    rating_tb: 5.0,
    reviews_tb: 11,
    verified: true,
    licensed: true,
    insured: true,
    veteran_owned: false,
    verified_projects: 11,
    before_photo: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&w=1200&h=600&q=80",
    after_photo: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=1200&h=600&q=80",
    customer_quote: "Absolutely stunning work. The herringbone floor exceeded my expectations. Cascade Tile's attention to detail is unlike anything I've experienced before — every tile is perfectly level and the grout lines are immaculate.",
    customer_name: "James M. — NW Portland",
  },
  {
    slug: "ev-charger-panel-upgrade-ne-portland",
    contractor_id: "2",
    contractor_slug: "portland-electric",
    contractor_name: "Portland Electric Co.",
    contractor_tagline: "Licensed electricians — same-day service available",
    avatar_color: "#D97706",
    cover_color: "from-yellow-600 to-amber-800",
    trade: "Electrician",
    title: "EV Charger + Panel Upgrade",
    location: "NE Portland, OR",
    photos: [
      U("1621905252507-b35492cc74b4", 1200, 600),
      U("1581094288338-2314dddb0f7b", 800, 500),
      U("1565814329452-e7fcdb4820a4", 800, 500),
      U("1606760329800-74a6b1538ee6", 800, 500),
    ],
    description: "Complete electrical panel upgrade from 100A to 200A service, paired with a Level 2 EV charger installation for a Chevrolet Bolt in NE Portland. The home had an outdated Federal Pacific Stab-Lok panel that posed a safety risk. Portland Electric Co. coordinated directly with PGE for the service upgrade, handled all permitting, and installed a hardwired ChargePoint Home Flex on a dedicated 50A circuit.",
    scope: [
      "Replace Federal Pacific 100A panel with 200A Square D QO panel",
      "PGE service upgrade coordination and meter socket replacement",
      "All-new circuit breakers and arc fault protection throughout",
      "Dedicated 50A / 240V circuit for EV charger",
      "ChargePoint Home Flex hardwired installation in garage",
      "All permits pulled and inspected",
      "Full load calculation and compliance documentation",
    ],
    materials: [
      "Square D QO 200A 40-space main panel",
      "ChargePoint Home Flex 50A EV Charger",
      "12/2 and 6/3 Romex (new circuits)",
      "AFCI breakers throughout",
      "Weatherproof exterior conduit",
    ],
    duration: "1 day",
    completed_date: "May 16, 2026",
    time_ago: "1 week ago",
    rating_google: 4.8,
    reviews_google: 198,
    rating_tb: 5.0,
    reviews_tb: 31,
    verified: true,
    licensed: true,
    insured: true,
    veteran_owned: false,
    verified_projects: 31,
    before_photo: "https://images.unsplash.com/photo-1581094288338-2314dddb0f7b?auto=format&fit=crop&w=1200&h=600&q=80",
    after_photo: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=1200&h=600&q=80",
    customer_quote: "Portland Electric was phenomenal. They handled everything — from the PGE coordination to pulling the permit to the final inspection. The crew was knowledgeable, efficient, and cleaned up perfectly. Our new panel and EV charger work flawlessly.",
    customer_name: "Renee K. — Alberta Arts District, Portland",
  },
];

export const TRENDING_SEARCHES = [
  "Roofing",
  "EV Charger Install",
  "Crawlspace Encapsulation",
  "Heat Pump",
  "Radon Mitigation",
  "Concrete Patio",
  "Bathroom Remodel",
];

export const SERVICES = [
  "All Services",
  "Roofing",
  "Electrician",
  "Plumbing",
  "HVAC",
  "Painting",
  "Concrete",
  "Gutters",
  "Tile & Flooring",
  "Landscaping",
  "Carpentry",
  "Drywall",
  "Windows & Doors",
  "Pest Control",
  "Cleaning",
];

export const CITIES = [
  "Portland, OR",
  "Beaverton, OR",
  "Lake Oswego, OR",
  "Tigard, OR",
  "Gresham, OR",
  "Hillsboro, OR",
  "Vancouver, WA",
];
