import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface UserPreferencesStore {
  // Map of userId -> array of favorite user IDs
  favoriteUsersByUser: Record<string, string[]>;
  
  // Get favorite users for a specific user
  getFavoriteUsers: (userId: string) => string[];
  
  // Toggle favorite status for a user
  toggleFavoriteUser: (currentUserId: string, targetUserId: string) => void;
  
  // Check if a user is favorited
  isFavoriteUser: (currentUserId: string, targetUserId: string) => boolean;
}

export const useUserPreferencesStore = create<UserPreferencesStore>()(
  persist(
    (set, get) => ({
      favoriteUsersByUser: {},
      
      getFavoriteUsers: (userId: string) => {
        return get().favoriteUsersByUser[userId] || [];
      },
      
      toggleFavoriteUser: (currentUserId: string, targetUserId: string) => {
        set((state) => {
          const currentFavorites = state.favoriteUsersByUser[currentUserId] || [];
          const isFavorited = currentFavorites.includes(targetUserId);
          
          const newFavorites = isFavorited
            ? currentFavorites.filter(id => id !== targetUserId)
            : [...currentFavorites, targetUserId];
          
          return {
            favoriteUsersByUser: {
              ...state.favoriteUsersByUser,
              [currentUserId]: newFavorites,
            },
          };
        });
      },
      
      isFavoriteUser: (currentUserId: string, targetUserId: string) => {
        const favorites = get().favoriteUsersByUser[currentUserId] || [];
        return favorites.includes(targetUserId);
      },
    }),
    {
      name: "buildtrack-user-preferences",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);


