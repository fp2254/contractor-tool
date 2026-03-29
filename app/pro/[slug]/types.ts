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
  featuredReview: {
    text: string;
    reviewer: string;
    jobType: string;
    location: string;
  };
  services: string[];
  photos: Photo[];
  reviews: Review[];
  about: Array<{ icon: string; text: string }>;
  licenseNumber?: string;
  serviceArea: string;
};
