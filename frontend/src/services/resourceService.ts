import { apiFetch } from './api';

export const RESOURCE_CATEGORIES = [
  'Stress Management',
  'Anxiety & Worry',
  'Sleep',
  'Academic Pressure',
  'Time Management',
  'Emotional Wellbeing',
  'Sleep & Rest',
  'Relaxation / Mindfulness',
  'Self-Care',
  'Study-Life Balance',
] as const;

export type ResourceCategory = (typeof RESOURCE_CATEGORIES)[number];

export type ResourceItem = {
  _id: string;
  title: string;
  description: string;
  category: ResourceCategory;
  content: string;
  externalLink?: string;
  videoUrl?: string;
  imageUrl?: string;
  helpfulTips?: string[];
  isActive: boolean;
};

export const getResources = async (category?: ResourceCategory) => {
  const params = category ? `?category=${encodeURIComponent(category)}` : '';
  return apiFetch<{ resources: ResourceItem[] }>(`/resources${params}`);
};

export const getResourceById = async (id: string) => {
  return apiFetch<{ resource: ResourceItem }>(`/resources/${id}`);
};
