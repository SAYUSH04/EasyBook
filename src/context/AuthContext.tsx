import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { UserProfile, UserRole, Organization } from '../types';

interface AuthContextType {
  currentUser: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  currentOrg: Organization | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name: string, role?: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  switchRole: (role: UserRole) => void;
  setUserProfile: (profile: UserProfile) => void;
  allDemoProfiles: UserProfile[];
}

const DEFAULT_DEMO_PROFILES: UserProfile[] = [
  {
    id: 'user_sayush_org',
    email: 'sayush@easybook.platform',
    name: 'Sayush Sunesh',
    role: 'ORGANIZER',
    organizationId: 'org_iedc_mesce',
    department: 'Operations & Technology',
    college: 'MES College of Engineering',
    phone: '+91 98765 43210',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user_aditya_att',
    email: 'aditya.verma@student.edu',
    name: 'Aditya Verma',
    role: 'ATTENDEE',
    organizationId: 'org_iedc_mesce',
    department: 'Computer Science & Eng',
    college: 'National Institute of Tech',
    phone: '+91 94471 23456',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user_ananya_staff',
    email: 'ananya.staff@easybook.platform',
    name: 'Ananya Nair',
    role: 'VOLUNTEER',
    organizationId: 'org_iedc_mesce',
    department: 'Event Operations Team',
    college: 'MES College of Engineering',
    phone: '+91 99955 88776',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user_admin_sys',
    email: 'admin@easybook.platform',
    name: 'System Administrator',
    role: 'ADMIN',
    organizationId: 'org_iedc_mesce',
    department: 'Platform Governance',
    college: 'EasyBook Core',
    phone: '+91 80000 11122',
    createdAt: new Date().toISOString(),
  },
];

const DEFAULT_ORG: Organization = {
  id: 'org_iedc_mesce',
  name: 'IEDC MESCE Operations Hub',
  slug: 'iedc-mesce',
  description: 'Innovation & Entrepreneurship Development Cell — Event Operations Directorate',
  ownerId: 'user_sayush_org',
  members: ['user_sayush_org', 'user_ananya_staff', 'user_aditya_att'],
  createdAt: '2026-01-01T00:00:00.000Z',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('easybook_active_profile');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return DEFAULT_DEMO_PROFILES[0];
      }
    }
    return DEFAULT_DEMO_PROFILES[0];
  });
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(DEFAULT_ORG);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data() as UserProfile;
            setCurrentUser(data);
            localStorage.setItem('easybook_active_profile', JSON.stringify(data));
          } else {
            // Setup default user record
            const newProfile: UserProfile = {
              id: user.uid,
              email: user.email || 'user@easybook.platform',
              name: user.displayName || user.email?.split('@')[0] || 'Member',
              role: 'ORGANIZER',
              organizationId: 'org_iedc_mesce',
              createdAt: new Date().toISOString(),
            };
            await setDoc(doc(db, 'users', user.uid), newProfile);
            setCurrentUser(newProfile);
            localStorage.setItem('easybook_active_profile', JSON.stringify(newProfile));
          }
        } catch (e) {
          console.warn('Firestore auth sync notice:', e);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
    if (userDoc.exists()) {
      const data = userDoc.data() as UserProfile;
      setCurrentUser(data);
      localStorage.setItem('easybook_active_profile', JSON.stringify(data));
    }
  };

  const register = async (email: string, pass: string, name: string, role: UserRole = 'ORGANIZER') => {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    const newProfile: UserProfile = {
      id: cred.user.uid,
      email,
      name,
      role,
      organizationId: 'org_iedc_mesce',
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'users', cred.user.uid), newProfile);
    setCurrentUser(newProfile);
    localStorage.setItem('easybook_active_profile', JSON.stringify(newProfile));
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch {
      // ignore
    }
    // switch to attendee demo profile
    setCurrentUser(DEFAULT_DEMO_PROFILES[1]);
    localStorage.setItem('easybook_active_profile', JSON.stringify(DEFAULT_DEMO_PROFILES[1]));
  };

  const switchRole = (role: UserRole) => {
    const found = DEFAULT_DEMO_PROFILES.find((p) => p.role === role) || DEFAULT_DEMO_PROFILES[0];
    setCurrentUser(found);
    localStorage.setItem('easybook_active_profile', JSON.stringify(found));
  };

  const setUserProfile = (profile: UserProfile) => {
    setCurrentUser(profile);
    localStorage.setItem('easybook_active_profile', JSON.stringify(profile));
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        firebaseUser,
        currentOrg,
        loading,
        login,
        register,
        logout,
        switchRole,
        setUserProfile,
        allDemoProfiles: DEFAULT_DEMO_PROFILES,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
