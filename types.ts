export interface Asset {
  id: string;
  categoryId: string;
  serialNumber: string;
  name: string;
  assetId: string;
  photos: string[]; // Base64 strings
  location: string;
  note: string;
  createdAt: number;
  updatedAt: number;
}

export interface Category {
  id: string;
  name: string;
  description: string;
}

export interface Settings {
  savedNames: string[];
  savedLocations: string[];
  savedPrefixes: string[];
  lastUsedPrefix: string;
  lastUsedSequence: number;
}

export type ViewState = 'CATEGORIES' | 'ASSET_LIST' | 'ASSET_FORM' | 'SETTINGS';

export interface SuggestionList {
  names: string[];
  locations: string[];
  prefixes: string[];
}

export interface LightboxState {
  isOpen: boolean;
  images: string[];
  currentIndex: number;
}