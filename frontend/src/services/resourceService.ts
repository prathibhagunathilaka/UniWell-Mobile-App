import { apiFetch } from './api';

export type ResourceItem = {
  _id: string;
  title: string;
  description: string;
  category: string;
  content: string;
  externalLink?: string;
  videoUrl?: string;
  imageUrl?: string;
  helpfulTips?: string[];
  isActive: boolean;
};

export const getResources = async (category?: string) => {
  const params = category && category !== 'All' ? `?category=${encodeURIComponent(category)}` : '';
  return apiFetch<{ resources: ResourceItem[] }>(`/resources${params}`);
};

export const getResourceById = async (id: string) => {
  return apiFetch<{ resource: ResourceItem }>(`/resources/${id}`);
};
