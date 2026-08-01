import type {
  BasicServiceSettings,
  TreatmentTagSetting,
} from "@/features/settings/service-settings-types";

type HospitalServiceSettingsSource = {
  customerInputChartNumberEnabled: boolean;
  customerInputVisitTypeEnabled: boolean;
  customerInputCountryCodeEnabled: boolean;
  customerInputBirthDateEnabled: boolean;
  customerInputGenderEnabled: boolean;
  customerInputTreatmentTagEnabled: boolean;
  customerInputNationalityEnabled: boolean;
  customerInputMarketingEnabled: boolean;
  automationTagSelectionMode: string;
  appointmentManagementEnabled: boolean;
};

export function serializeBasicServiceSettings(
  hospital: HospitalServiceSettingsSource,
  treatmentTags: TreatmentTagSetting[],
): BasicServiceSettings {
  return {
    inputFields: {
      chartNumber: hospital.customerInputChartNumberEnabled,
      visitType: hospital.customerInputVisitTypeEnabled,
      countryCode: hospital.customerInputCountryCodeEnabled,
      birthDate: hospital.customerInputBirthDateEnabled,
      gender: hospital.customerInputGenderEnabled,
      treatmentTag: hospital.customerInputTreatmentTagEnabled,
      nationality: hospital.customerInputNationalityEnabled,
      marketingConsent: hospital.customerInputMarketingEnabled,
    },
    automationTagSelectionMode:
      hospital.automationTagSelectionMode === "FIRST" ? "FIRST" : "ALL",
    appointmentManagementEnabled: hospital.appointmentManagementEnabled,
    treatmentTags,
  };
}
