import { lookup } from './lookup';

const GENDER_CLASS_MAP = {
  牡: 'bg-blue-100 text-blue-800',
  HORSE: 'bg-blue-100 text-blue-800',
  COLT: 'bg-blue-100 text-blue-800',
  牝: 'bg-pink-100 text-pink-800',
  MARE: 'bg-pink-100 text-pink-800',
  FILLY: 'bg-pink-100 text-pink-800',
  セ: 'bg-gray-100 text-gray-800',
  セン: 'bg-gray-100 text-gray-800',
  GELDING: 'bg-gray-100 text-gray-800',
} satisfies Record<string, string>;

const GENDER_DISPLAY_MAP = {
  HORSE: '牡',
  COLT: '牡',
  牡: '牡',
  MARE: '牝',
  FILLY: '牝',
  牝: '牝',
  GELDING: 'セ',
  セン: 'セ',
} satisfies Record<string, string>;

export function getGenderBadgeClass(gender: string): string {
  return lookup(GENDER_CLASS_MAP, gender) ?? 'bg-gray-100 text-gray-800';
}

export function getDisplayGender(gender: string): string {
  return lookup(GENDER_DISPLAY_MAP, gender) ?? gender;
}

export function getGenderAge(gender: string, age: number | null): string {
  const displayGender = getDisplayGender(gender);
  return age !== null ? `${displayGender}${age}` : displayGender;
}
