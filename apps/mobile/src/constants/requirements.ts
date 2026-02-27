export type RequirementId = 'drivers_license' | 'certification' | 'drug_test' | 'w9';

export type RequirementItem = {
  id: RequirementId;
  title: string;
  subtitle?: string;
  actionLabel: string;
  uploadTitle: string;
  allowedTypesText: string;
};

export const ALLOWED_TYPES_TEXT = 'Only support png, jpg or pdf files';

export const REQUIREMENTS: RequirementItem[] = [
  {
    id: 'drivers_license',
    title: "Driver's License",
    subtitle: 'Optional',
    actionLabel: 'Upload',
    uploadTitle: "Upload Driver's License",
    allowedTypesText: ALLOWED_TYPES_TEXT,
  },
  {
    id: 'certification',
    title: 'Certification',
    subtitle: 'Optional',
    actionLabel: 'Upload',
    uploadTitle: 'Upload Certification',
    allowedTypesText: ALLOWED_TYPES_TEXT,
  },
  {
    id: 'drug_test',
    title: 'Drug Test Results',
    subtitle: 'Optional',
    actionLabel: 'Upload',
    uploadTitle: 'Upload Drug Test Results',
    allowedTypesText: ALLOWED_TYPES_TEXT,
  },
  {
    id: 'w9',
    title: 'W-9 (eSignature)',
    subtitle: 'Optional',
    actionLabel: 'Click and Sign',
    uploadTitle: 'Upload W-9',
    allowedTypesText: ALLOWED_TYPES_TEXT,
  },
];

export function getRequirementById(id: string | string[] | undefined): RequirementItem | undefined {
  if (!id) return undefined;
  const normalizedId = Array.isArray(id) ? id[0] : id;
  return REQUIREMENTS.find((item) => item.id === normalizedId);
}
