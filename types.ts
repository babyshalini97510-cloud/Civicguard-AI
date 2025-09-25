
export interface Badge {
  name: string;
  icon: string; // e.g., 'shield-check', 'star', 'trophy'
  description: string;
}

export interface User {
  id: number;
  name: string;
  avatar: string; // URL to avatar image
  points: number;
  badges: Badge[];
  district: string;
  role: 'citizen' | 'leader';
  email?: string;
  panchayat?: string;
  village?: string;
  street?: string;
}

export interface Issue {
  id: number;
  title: string;
  description: string;
  category: 'Roads' | 'Waste' | 'Water' | 'Electricity' | 'Public Infrastructure' | 'Other';
  status: 'Pending' | 'Received' | 'In Progress' | 'Resolved' | 'Closed';
  upvotes: number;
  reporterId: number;
  location: {
    district: string;
    panchayat: string;
    village: string;
    street: string;
    lat?: number;
    lng?: number;
  };
  images: string[]; // URLs to images
  video?: string; // URL to video
  audio?: string; // URL to audio file
  createdAt: string; // ISO 8601 date string
  resolutionProof?: {
    image: string; // URL to fix proof image
    description: string;
    completedAt: string; // ISO 8601 date string
  };
  closedAt?: string; // ISO 8601 date string
  incidentTime?: string;
  affectedPeople?: string;
  urgency?: 'Low' | 'Medium' | 'High';
  priority?: 'Low' | 'Medium' | 'High' | 'Critical';
  assignedTo?: string;
  emotionAnalysis?: {
    sentiment: string;
    urgencyScore: number;
  };
  imageAnalyses?: {
    status: 'Authentic' | 'Manipulated' | 'AI-Generated';
    confidence: number;
    reasoning: string;
  }[];
}

export interface ForumPost {
  id: number;
  authorId: number;
  title: string;
  content: string;
  createdAt: string; // ISO 8601 date string
}

export interface Comment {
  id: number;
  postId: number;
  authorId: number;
  content: string;
  createdAt: string; // ISO 8601 date string
  upvotes: number;
}
