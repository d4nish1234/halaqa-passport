import React, { createContext, useContext, useEffect, useState } from 'react';

import { KidProfile } from '../types';
import { loadProfile } from '../lib/storage';

type ProfileContextValue = {
  profile: KidProfile | null;
  setProfile: (profile: KidProfile | null) => void;
  isLoading: boolean;
};

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<KidProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      const stored = await loadProfile();
      if (isMounted) {
        setProfile(stored);
        setIsLoading(false);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <ProfileContext.Provider value={{ profile, setProfile, isLoading }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used inside ProfileProvider');
  }
  return context;
}
