export type Review = {
  name: string;
  stars: number;
  jobType: string;
  location: string;
  text: string;
  verified: boolean;
};

export type Photo = {
  url: string;
  title: string;
  location: string;
  timeAgo: string;
  cost: string;
  featured?: boolean;
};

export type ServiceEntry = {
  name: string;
  description: string;
  photo_url: string;
};

export type SectionsConfig = {
  services?: boolean;
  about?: boolean;
  stats?: boolean;
  certifications?: boolean;
  reviews?: boolean;
  gallery?: boolean;
  serviceAreas?: boolean;
  trustBar?: boolean;
};

export type ContractorProfile = {
  slug: string;
  isPublished: boolean;
  name: string;
  trade: string;
  tagline: string;
  location: string;
  phone: string;
  phoneFormatted: string;
  rating: number;
  reviewCount: number;
  urgencyLine: string;
  stats: {
    jobsCompleted: number;
    revenue: string;
    yearsExperience: number;
  };
  trustItems: Array<{ icon: string; text: string }>;
  featuredReview?: {
    text: string;
    reviewer: string;
    jobType: string;
    location: string;
  };
  services: ServiceEntry[];
  photos: Photo[];
  reviews: Review[];
  about: Array<{ icon: string; text: string }>;
  licenseNumber?: string;
  serviceArea: string;
  photoUrl?: string;
  selectedTemplate?: string;
  statLabel?: string;
  sectionsConfig: SectionsConfig;
};
