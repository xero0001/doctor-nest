"use client";

import { createContext, useContext, useMemo, useState } from "react";

type ServiceNavigationContextValue = {
  appointmentManagementEnabled: boolean;
  setAppointmentManagementEnabled: (enabled: boolean) => void;
};

const ServiceNavigationContext =
  createContext<ServiceNavigationContextValue | null>(null);

export function ServiceNavigationProvider({
  initialAppointmentManagementEnabled,
  children,
}: {
  initialAppointmentManagementEnabled: boolean;
  children: React.ReactNode;
}) {
  const [appointmentManagementEnabled, setAppointmentManagementEnabled] =
    useState(initialAppointmentManagementEnabled);

  const value = useMemo(
    () => ({
      appointmentManagementEnabled,
      setAppointmentManagementEnabled,
    }),
    [appointmentManagementEnabled],
  );

  return (
    <ServiceNavigationContext.Provider value={value}>
      {children}
    </ServiceNavigationContext.Provider>
  );
}

export function useServiceNavigation() {
  const context = useContext(ServiceNavigationContext);

  if (!context) {
    throw new Error(
      "useServiceNavigation must be used within ServiceNavigationProvider.",
    );
  }

  return context;
}
