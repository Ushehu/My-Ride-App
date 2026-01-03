import { create } from 'zustand';
import { MarkerData } from '@/types/type';

// Driver Interface (base data from database)
export interface Driver {
  id: number;
  first_name: string;
  last_name: string;
  profile_image_url: string;
  car_image_url: string;
  car_seats: number;
  rating: number;
}

// Computed property for full name
export interface DriverWithTitle extends Driver {
  title: string;
  price?: string;
  time?: number;
}

// Driver Store Interface
interface DriverStore {
  drivers: MarkerData[];
  selectedDriver: number | null;
  setDrivers: (drivers: MarkerData[]) => void;
  setSelectedDriver: (driverId: number) => void;
  clearSelectedDriver: () => void;
}

// Location Store Interface
interface LocationStore {
  userLatitude: number | null;
  userLongitude: number | null;
  userAddress: string | null;
  destinationLatitude: number | null;
  destinationLongitude: number | null;
  destinationAddress: string | null;
  setUserLocation: (location: {
    latitude: number;
    longitude: number;
    address: string;
  }) => void;
  setDestinationLocation: (location: {
    latitude: number;
    longitude: number;
    address: string;
  }) => void;
  clearLocations: () => void;
}

// Driver Store
export const useDriverStore = create<DriverStore>((set) => ({
  drivers: [],
  selectedDriver: null,
  
  setDrivers: (drivers: MarkerData[]) => {
    set({ drivers });
  },
  
  setSelectedDriver: (driverId: number) => {
    set({ selectedDriver: driverId });
  },
  
  clearSelectedDriver: () => {
    set({ selectedDriver: null });
  },
}));

// Location Store
export const useLocationStore = create<LocationStore>((set) => ({
  userLatitude: null,
  userLongitude: null,
  userAddress: null,
  destinationLatitude: null,
  destinationLongitude: null,
  destinationAddress: null,
  
  setUserLocation: ({ latitude, longitude, address }) => {
    set({
      userLatitude: latitude,
      userLongitude: longitude,
      userAddress: address,
    });
  },
  
  setDestinationLocation: ({ latitude, longitude, address }) => {
    set({
      destinationLatitude: latitude,
      destinationLongitude: longitude,
      destinationAddress: address,
    });
  },
  
  clearLocations: () => {
    set({
      userLatitude: null,
      userLongitude: null,
      userAddress: null,
      destinationLatitude: null,
      destinationLongitude: null,
      destinationAddress: null,
    });
  },
}));