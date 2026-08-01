export type CustomerInputFieldKey =
  | "chartNumber"
  | "visitType"
  | "countryCode"
  | "birthDate"
  | "gender"
  | "treatmentTag"
  | "nationality"
  | "marketingConsent";

export type AutomationTagSelectionMode = "FIRST" | "ALL";

export type TreatmentTagSetting = {
  id: string;
  name: string;
  color: string;
  assignmentCount: number;
  automationCount: number;
};

export type BasicServiceSettings = {
  inputFields: Record<CustomerInputFieldKey, boolean>;
  automationTagSelectionMode: AutomationTagSelectionMode;
  appointmentManagementEnabled: boolean;
  treatmentTags: TreatmentTagSetting[];
};
