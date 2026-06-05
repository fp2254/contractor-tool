import { useState } from "react";
import {
  MapPin, Calendar, CheckCircle, Star, MessageSquare, Bookmark,
  ChevronRight, Plus, Camera, FileText, DollarSign, Home,
  Wrench, Zap, Flame, Wind, Shield, AlertTriangle, Bell, Search,
  Users, Settings, LayoutDashboard, FolderOpen, Image, HelpCircle,
  TrendingUp, Clock, Award, Phone, ExternalLink, Edit3
} from "lucide-react";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard" },
  { icon: FolderOpen, label: "Projects", active: true },
  { icon: Home, label: "Property Profile" },
  { icon: Image, label: "Photos & Documents" },
  { icon: Star, label: "Reviews" },
  { icon: MessageSquare, label: "Messages", badge: 2 },
  { icon: Bookmark, label: "Saved Contractors" },
  { icon: TrendingUp, label: "Future Projects" },
  { icon: DollarSign, label: "Finances" },
  { icon: FileText, label: "Documents" },
  { icon: Settings, label: "Settings" },
];

const TIMELINE = [
  {
    date: "June 2026",
    title: "New Roof Installation",
    contractor: "Horizon Roofing",
    contractorVerified: true,
    rating: 5.0,
    reviewCount: 12,
    description: "Complete roof tear-off and installation of GAF Timberline HDZ shingles.",
    cost: 12400,
    completedDate: "Jun 14, 2026",
    hasWarranty: true,
    photoCount: 38,
    photos: [
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=120&h=90&fit=crop",
      "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=120&h=90&fit=crop",
      "https://images.unsplash.com/photo-1590725140246-20acddc1ec6d?w=120&h=90&fit=crop",
    ],
    color: "#1B3A6B",
  },
  {
    date: "April 2026",
    title: "Radon Mitigation System",
    contractor: "Central Maine Radon",
    contractorVerified: true,
    rating: 5.0,
    reviewCount: 8,
    description: "Installed radon mitigation system and completed post-installation testing.",
    cost: 1960,
    completedDate: "Apr 22, 2026",
    hasWarranty: false,
    hasDocumentation: true,
    photoCount: 16,
    photos: [
      "https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=120&h=90&fit=crop",
      "https://images.unsplash.com/photo-1565117447851-6cfa4b27c9a5?w=120&h=90&fit=crop",
    ],
    color: "#059669",
  },
  {
    date: "March 2026",
    title: "Kitchen Remodel",
    contractor: "Oak & Stone Builders",
    contractorVerified: true,
    rating: 4.9,
    reviewCount: 15,
    description: "Complete kitchen renovation including cabinets, countertops, flooring, and lighting.",
    cost: 38300,
    completedDate: "Mar 28, 2026",
    hasWarranty: false,
    photoCount: 42,
    photos: [
      "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=120&h=90&fit=crop",
      "https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=120&h=90&fit=crop",
      "https://images.unsplash.com/photo-1556909212-d5b604d0c90d?w=120&h=90&fit=crop",
    ],
    color: "#7C3AED",
  },
];

const PHOTO_CATEGORIES = [
  { label: "Roof", count: 42, img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=180&h=130&fit=crop" },
  { label: "Kitchen", count: 58, img: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=180&h=130&fit=crop" },
  { label: "Landscaping", count: 36, img: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=180&h=130&fit=crop" },
  { label: "Exterior", count: 27, img: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=180&h=130&fit=crop" },
  { label: "Basement", count: 18, img: "https://images.unsplash.com/photo-1565117447851-6cfa4b27c9a5?w=180&h=130&fit=crop" },
  { label: "Deck", count: 24, img: "https://images.unsplash.com/photo-1505873242700-f289a29e1e0f?w=180&h=130&fit=crop" },
];

const FUTURE_PROJECTS = [
  { label: "New Deck", status: "Planning", img: "https://images.unsplash.com/photo-1505873242700-f289a29e1e0f?w=140&h=100&fit=crop" },
  { label: "Bathroom Remodel", status: "Researching", img: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=140&h=100&fit=crop" },
  { label: "Fence Installation", status: "Planning", img: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=140&h=100&fit=crop" },
  { label: "Driveway Paving", status: "Researching", img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=140&h=100&fit=crop" },
];

const SCORECARD_ITEMS = [
  { label: "Roof", status: "Excellent", color: "#16A34A", icon: Home },
  { label: "Plumbing", status: "Good", color: "#16A34A", icon: Wrench },
  { label: "Electrical", status: "Good", color: "#16A34A", icon: Zap },
  { label: "HVAC", status: "Good", color: "#16A34A", icon: Wind },
  { label: "Radon", status: "Mitigated", color: "#16A34A", icon: Shield },
  { label: "Deck", status: "Needs Attention", color: "#D97706", icon: AlertTriangle, warn: true },
];

const REVIEWS = [
  {
    contractor: "Central Maine Radon",
    rating: 5.0,
    date: "Mar 2026",
    text: "Frank showed up on time, explained everything clearly, and did excellent work. Highly recommend!",
    reviewer: "John & Sarah T.",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=36&h=36&fit=crop&crop=face",
  },
  {
    contractor: "Horizon Roofing",
    rating: 5.0,
    date: "Jun 2026",
    text: "Great communication, finished on time, and the roof looks amazing. Crew was professional and respectful.",
    reviewer: "John & Sarah T.",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=36&h=36&fit=crop&crop=face",
  },
];

const CONTRACTOR_FEEDBACK = [
  {
    contractor: "Oak & Stone Builders",
    rating: 4.0,
    date: "Mar 2026",
    text: "Wonderful clients! Clear vision, great communication, and timely payments. Would love to work again.",
    avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=36&h=36&fit=crop&crop=face",
  },
  {
    contractor: "Horizon Roofing",
    rating: 5.0,
    date: "Jun 2026",
    text: "Home was well prepared and accessible. Great experience all around.",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=36&h=36&fit=crop&crop=face",
  },
];

function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={size} fill={i <= Math.round(rating) ? "#F59E0B" : "none"} stroke={i <= Math.round(rating) ? "#F59E0B" : "#D1D5DB"} />
      ))}
    </div>
  );
}

function ScoreGauge({ score }: { score: number }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ * 0.75;
  const rotation = -225;
  return (
    <div className="relative flex items-center justify-center" style={{ width: 140, height: 110 }}>
      <svg width={140} height={110} viewBox="0 0 140 110">
        <circle cx={70} cy={80} r={r} fill="none" stroke="#E5E7EB" strokeWidth={10} strokeDasharray={`${circ * 0.75} ${circ * 0.25}`} strokeLinecap="round" transform={`rotate(${rotation} 70 80)`} />
        <circle cx={70} cy={80} r={r} fill="none" stroke="#16A34A" strokeWidth={10} strokeDasharray={`${circ * 0.75 - offset} ${circ - (circ * 0.75 - offset)}`} strokeLinecap="round" transform={`rotate(${rotation} 70 80)`} />
      </svg>
      <div className="absolute flex flex-col items-center" style={{ bottom: 8 }}>
        <span className="text-3xl font-bold text-gray-900">{score}</span>
        <span className="text-xs font-semibold text-green-600">Great</span>
      </div>
    </div>
  );
}

const TABS = ["Timeline", "Projects", "Photos", "Reviews", "Documents", "Property Details"];

export function Profile() {
  const [activeTab, setActiveTab] = useState("Timeline");

  return (
    <div className="flex h-screen bg-gray-50 font-['Inter'] overflow-hidden text-sm">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-100 flex flex-col shrink-0 overflow-y-auto">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#1B3A6B" }}>
              <Home size={14} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 text-base">TRADEBASE</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5">
          {NAV_ITEMS.map(({ icon: Icon, label, active, badge }) => (
            <button key={label} className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors ${active ? "text-white font-semibold" : "text-gray-600 hover:bg-gray-50"}`} style={active ? { backgroundColor: "#1B3A6B" } : {}}>
              <Icon size={16} className={active ? "text-white" : "text-gray-500"} />
              <span className="flex-1 text-[13px]">{label}</span>
              {badge && <span className="text-[10px] font-bold bg-red-500 text-white rounded-full px-1.5 py-0.5">{badge}</span>}
            </button>
          ))}
        </nav>

        {/* Profile completion */}
        <div className="px-4 py-4 border-t border-gray-100">
          <div className="bg-blue-50 rounded-xl p-3">
            <p className="text-xs font-bold text-gray-700 mb-1">Complete your profile</p>
            <p className="text-[10px] text-gray-500 mb-2">Add more details about your property to get better contractor matches.</p>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-blue-600">80% Complete</span>
            </div>
            <div className="h-1.5 bg-blue-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full" style={{ width: "80%" }} />
            </div>
            <button className="mt-2 w-full rounded-lg py-1.5 text-xs font-semibold text-white" style={{ backgroundColor: "#1B3A6B" }}>Add Details</button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-12 bg-white border-b border-gray-100 flex items-center px-6 gap-4 shrink-0">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search for contractors, projects, or categories" className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-600 outline-none" />
          </div>
          <button className="relative p-2 text-gray-500 hover:bg-gray-50 rounded-lg">
            <Bell size={16} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>
          <button className="p-2 text-gray-500 hover:bg-gray-50 rounded-lg">
            <HelpCircle size={16} />
          </button>
          <div className="flex items-center gap-2">
            <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=32&h=32&fit=crop&crop=face" alt="avatar" className="w-8 h-8 rounded-full object-cover" />
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-gray-800">John & Sarah</span>
            </div>
            <ChevronRight size={12} className="text-gray-400 rotate-90" />
          </div>
        </header>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex gap-4 p-4 min-h-full">
            {/* Center column */}
            <div className="flex-1 min-w-0 space-y-4">
              {/* Profile header card */}
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                {/* Banner */}
                <div className="relative h-36 overflow-hidden">
                  <img src="https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=900&h=200&fit=crop" alt="house" className="w-full h-full object-cover" />
                  {/* Avatar */}
                  <div className="absolute -bottom-8 left-6">
                    <div className="w-20 h-20 rounded-full border-4 border-white overflow-hidden shadow-lg">
                      <img src="https://images.unsplash.com/photo-1543807535-eceef0bc6599?w=80&h=80&fit=crop&crop=face" alt="couple" className="w-full h-full object-cover" />
                    </div>
                  </div>
                  {/* Action buttons */}
                  <div className="absolute bottom-3 right-4 flex gap-2">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50">
                      <Edit3 size={12} /> Edit Profile
                    </button>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white shadow-sm" style={{ backgroundColor: "#1B3A6B" }}>
                      <ExternalLink size={12} /> Share Profile
                    </button>
                  </div>
                </div>

                {/* Profile info */}
                <div className="px-6 pt-10 pb-5">
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-xl font-bold text-gray-900">John &amp; Sarah Thompson</h1>
                    <CheckCircle size={18} fill="#1B3A6B" className="text-white" />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mb-5">
                    <span className="flex items-center gap-1"><MapPin size={11} /> Westborough, MA</span>
                    <span className="flex items-center gap-1"><Calendar size={11} /> Built 1998</span>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { value: "12", label: "Completed Projects" },
                      { value: "$84,560", label: "Total Invested" },
                      { value: "4.9 ★", label: "Average Rating" },
                      { value: "8", label: "Contractors Worked With" },
                    ].map(s => (
                      <div key={s.label} className="text-center">
                        <p className="text-lg font-bold text-gray-900">{s.value}</p>
                        <p className="text-[10px] text-gray-500 leading-tight">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tabs */}
                <div className="border-t border-gray-100 px-6">
                  <div className="flex gap-1 -mb-px">
                    {TABS.map(t => (
                      <button key={t} onClick={() => setActiveTab(t)} className={`px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${activeTab === t ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`} style={activeTab === t ? { borderColor: "#1B3A6B", color: "#1B3A6B" } : {}}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="space-y-4">
                {TIMELINE.map((item, idx) => (
                  <div key={idx} className="bg-white rounded-2xl p-5 shadow-sm">
                    <div className="flex gap-4">
                      {/* Date + check */}
                      <div className="flex flex-col items-center gap-1 shrink-0 w-16">
                        <p className="text-[10px] font-bold text-gray-400 uppercase text-center leading-tight">{item.date}</p>
                        <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: item.color }}>
                          <CheckCircle size={14} className="text-white" />
                        </div>
                        {idx < TIMELINE.length - 1 && <div className="w-0.5 bg-gray-200 flex-1 mt-1" style={{ minHeight: 20 }} />}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-900 mb-0.5">{item.title}</h3>
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="text-xs text-gray-500">by</span>
                              <span className="text-xs font-semibold text-blue-600">{item.contractor}</span>
                              {item.contractorVerified && <CheckCircle size={11} fill="#1B3A6B" className="text-white" />}
                            </div>
                            <div className="flex items-center gap-1.5 mb-2">
                              <StarRating rating={item.rating} />
                              <span className="text-xs font-bold text-gray-700">{item.rating.toFixed(1)}</span>
                              <span className="text-xs text-gray-400">({item.reviewCount})</span>
                            </div>
                            <p className="text-xs text-gray-600 leading-relaxed mb-3">{item.description}</p>

                            {/* Photos grid */}
                            <div className="flex gap-1.5 mb-3">
                              {item.photos.map((src, i) => (
                                <div key={i} className="relative">
                                  <img src={src} alt="" className="w-20 h-16 rounded-lg object-cover" />
                                  {i === item.photos.length - 1 && item.photoCount > item.photos.length && (
                                    <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                                      <span className="text-white text-xs font-bold">+{item.photoCount - item.photos.length}</span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>

                            {/* Meta */}
                            <div className="flex items-center gap-3 text-[10px] text-gray-400">
                              <span className="flex items-center gap-1"><DollarSign size={10} />${item.cost.toLocaleString()}</span>
                              <span className="flex items-center gap-1"><Clock size={10} /> Completed on {item.completedDate}</span>
                              {item.hasWarranty && <span className="flex items-center gap-1 text-green-600"><Shield size={10} /> Warranty</span>}
                              {item.hasDocumentation && <span className="flex items-center gap-1 text-blue-600"><FileText size={10} /> Documentation</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* View All */}
              <div className="text-center">
                <button className="text-xs font-semibold text-blue-600 px-4 py-2 rounded-lg border border-blue-200 hover:bg-blue-50">View All Projects</button>
              </div>

              {/* Photo Gallery */}
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-gray-900">Photo Gallery</h2>
                  <button className="text-xs text-blue-600 font-semibold">View all photos</button>
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {PHOTO_CATEGORIES.map(cat => (
                    <div key={cat.label} className="text-center">
                      <div className="rounded-xl overflow-hidden mb-1.5 aspect-[4/3]">
                        <img src={cat.img} alt={cat.label} className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer" />
                      </div>
                      <p className="text-[11px] font-semibold text-gray-700">{cat.label}</p>
                      <p className="text-[10px] text-gray-400">{cat.count} photos</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Future Projects */}
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="font-bold text-gray-900">Future Projects</h2>
                  <button className="text-xs text-blue-600 font-semibold flex items-center gap-1"><Plus size={12} /> Add Future Project</button>
                </div>
                <p className="text-xs text-gray-400 mb-4">Projects you're planning or considering.</p>
                <div className="grid grid-cols-5 gap-3">
                  {FUTURE_PROJECTS.map(p => (
                    <div key={p.label} className="text-center">
                      <div className="rounded-xl overflow-hidden mb-2 aspect-[4/3]">
                        <img src={p.img} alt={p.label} className="w-full h-full object-cover" />
                      </div>
                      <p className="text-[11px] font-bold text-gray-800 mb-0.5">{p.label}</p>
                      <p className="text-[10px] text-gray-400 mb-1.5">{p.status}</p>
                      <button className="text-[10px] font-bold px-2 py-1 rounded-lg text-white w-full" style={{ backgroundColor: "#1B3A6B" }}>Get Estimates</button>
                    </div>
                  ))}
                  <div className="text-center flex flex-col items-center justify-center">
                    <button className="w-full aspect-[4/3] rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center mb-2 hover:border-blue-300 transition-colors">
                      <Plus size={20} className="text-gray-300" />
                    </button>
                    <p className="text-[11px] text-gray-400">Add Project</p>
                  </div>
                </div>
              </div>

              {/* Footer stats bar */}
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    {[
                      { icon: Calendar, label: "Member Since", value: "Jan 2024" },
                      { icon: Clock, label: "Last Active", value: "Today" },
                      { icon: Users, label: "Connections", value: "12 Contractors" },
                      { icon: TrendingUp, label: "Profile Views", value: "156" },
                      { icon: Award, label: "Projects Shared", value: "Public" },
                    ].map(({ icon: Icon, label, value }) => (
                      <div key={label} className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Icon size={13} className="text-gray-400" />
                        <span>{label}: <span className="font-semibold text-gray-700">{value}</span></span>
                      </div>
                    ))}
                  </div>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50">
                    <ExternalLink size={11} /> Share Your Profile
                  </button>
                </div>
              </div>
            </div>

            {/* Right sidebar */}
            <div className="w-72 shrink-0 space-y-4">
              {/* Property Overview */}
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900">Property Overview</h3>
                </div>
                <div className="space-y-2.5">
                  {[
                    { label: "Property Type", value: "Single Family Home" },
                    { label: "Square Footage", value: "2,450 sq ft" },
                    { label: "Lot Size", value: "0.46 acres" },
                    { label: "Year Built", value: "1998" },
                    { label: "Bedrooms / Bathrooms", value: "4 / 2.5" },
                    { label: "Last Updated", value: "June 15, 2026" },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between items-start">
                      <span className="text-xs text-gray-400">{label}</span>
                      <span className="text-xs font-semibold text-gray-700 text-right max-w-[120px]">{value}</span>
                    </div>
                  ))}
                </div>
                <button className="mt-4 w-full border border-gray-200 rounded-xl py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50">Edit Property Details</button>
              </div>

              {/* Property Scorecard */}
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-3">Property Scorecard</h3>
                <div className="flex justify-center">
                  <ScoreGauge score={85} />
                </div>
                <div className="space-y-2 mt-2">
                  {SCORECARD_ITEMS.map(({ label, status, color, icon: Icon, warn }) => (
                    <div key={label} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {warn
                          ? <AlertTriangle size={12} className="text-amber-500" />
                          : <CheckCircle size={12} style={{ color }} />}
                        <span className="text-xs text-gray-600">{label}</span>
                      </div>
                      <span className="text-xs font-semibold" style={{ color: warn ? "#D97706" : color }}>{status}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contractor Reviews */}
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-900">Contractor Reviews</h3>
                  <button className="text-xs text-blue-600 font-semibold">See all</button>
                </div>
                <div className="space-y-4">
                  {REVIEWS.map((r, i) => (
                    <div key={i}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <img src={r.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <p className="text-xs font-bold text-gray-700 truncate">{r.contractor}</p>
                            <CheckCircle size={10} fill="#1B3A6B" className="text-white shrink-0" />
                          </div>
                          <div className="flex items-center gap-1">
                            <StarRating rating={r.rating} size={10} />
                            <span className="text-[10px] text-gray-400">{r.date}</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed italic">&ldquo;{r.text}&rdquo;</p>
                      <p className="text-[10px] text-gray-400 mt-1">— {r.reviewer}</p>
                      {i < REVIEWS.length - 1 && <div className="border-t border-gray-100 mt-3" />}
                    </div>
                  ))}
                </div>
              </div>

              {/* Contractor Feedback */}
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-900">Contractor Feedback</h3>
                  <button className="text-xs text-blue-600 font-semibold">See all</button>
                </div>
                <div className="space-y-4">
                  {CONTRACTOR_FEEDBACK.map((f, i) => (
                    <div key={i}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <img src={f.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <p className="text-xs font-bold text-gray-700 truncate">{f.contractor}</p>
                            <CheckCircle size={10} fill="#1B3A6B" className="text-white shrink-0" />
                          </div>
                          <div className="flex items-center gap-1">
                            <StarRating rating={f.rating} size={10} />
                            <span className="text-[10px] text-gray-400">{f.date}</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed italic">&ldquo;{f.text}&rdquo;</p>
                      <p className="text-[10px] text-gray-400 mt-1">— Contractor Review</p>
                      {i < CONTRACTOR_FEEDBACK.length - 1 && <div className="border-t border-gray-100 mt-3" />}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
