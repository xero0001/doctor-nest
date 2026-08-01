export type AutomationManagementDashboard = {
  month: string;
  generatedAt: string;
  totals: {
    customers: number;
    automationCustomers: number;
    consultations: number;
  };
  customerManagement: {
    managedCustomers: number;
    newCustomers: number;
    daily: Array<{
      date: string;
      managedCustomers: number;
      newCustomers: number;
    }>;
  };
  automationManagement: {
    sentMessages: number;
    appliedCustomers: number;
    consultations: number;
  };
  remarketing: {
    campaigns: number;
  };
  popularTreatments: Array<{
    id: string;
    name: string;
    color: string;
    count: number;
    rankChange: number | null;
  }>;
};
