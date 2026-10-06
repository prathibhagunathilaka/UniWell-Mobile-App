export const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

export const isValidPhoneNumber = (phoneNumber: string) =>
  /^\+?[0-9().\-\s]{5,25}$/.test(phoneNumber.trim()) &&
  (phoneNumber.match(/\d/g) || []).length >= 5;

export const isValidPassword = (password: string) =>
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(password);
