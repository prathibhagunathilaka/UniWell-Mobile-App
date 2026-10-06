export const supportContacts = {
  universityPhone: process.env.EXPO_PUBLIC_UNIVERSITY_COUNSELLING_PHONE?.trim() || '',
  universityWebsite: process.env.EXPO_PUBLIC_UNIVERSITY_COUNSELLING_URL?.trim() || '',
  emergencyPhone: process.env.EXPO_PUBLIC_UNIVERSITY_EMERGENCY_PHONE?.trim() || '',
  emergencyWebsite: process.env.EXPO_PUBLIC_UNIVERSITY_EMERGENCY_URL?.trim() || '',
} as const;
