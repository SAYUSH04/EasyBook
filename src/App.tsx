/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { EventDiscoveryView } from './pages/public/EventDiscoveryView';
import { MyPassesView } from './pages/attendee/MyPassesView';
import { OrganizerWorkspaceView } from './pages/organizer/OrganizerWorkspaceView';
import { CertificateVerificationView } from './components/certificates/CertificateVerificationView';
import { EventWizardModal } from './components/events/EventWizardModal';
import { EventItem } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (window.location.hash.includes('verify')) return 'verify';
    if (window.location.hash.includes('passes')) return 'passes';
    if (window.location.hash.includes('organizer')) return 'organizer';
    return 'events';
  });

  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(false);

  // Sync tab with hash if provided
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.includes('verify')) setActiveTab('verify');
      else if (hash.includes('passes')) setActiveTab('passes');
      else if (hash.includes('organizer')) setActiveTab('organizer');
      else if (hash.includes('events')) setActiveTab('events');
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    window.location.hash = tab;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEventCreated = (event: EventItem) => {
    setActiveTab('organizer');
  };

  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-slate-950">
        {/* Navigation Bar */}
        <Navbar
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          openCreateModal={() => setIsWizardOpen(true)}
        />

        {/* Main Routed Content Area */}
        <main className="flex-1">
          {activeTab === 'events' && (
            <EventDiscoveryView
              onOpenWorkspace={() => handleTabChange('organizer')}
              onOpenPasses={() => handleTabChange('passes')}
              onOpenCreateWizard={() => setIsWizardOpen(true)}
            />
          )}

          {activeTab === 'passes' && (
            <MyPassesView onExploreEvents={() => handleTabChange('events')} />
          )}

          {activeTab === 'organizer' && (
            <OrganizerWorkspaceView onOpenCreateWizard={() => setIsWizardOpen(true)} />
          )}

          {activeTab === 'verify' && <CertificateVerificationView />}
        </main>

        {/* Footer */}
        <Footer />

        {/* Global Event Creation Wizard */}
        <EventWizardModal
          isOpen={isWizardOpen}
          onClose={() => setIsWizardOpen(false)}
          onEventCreated={handleEventCreated}
        />
      </div>
    </AuthProvider>
  );
}
