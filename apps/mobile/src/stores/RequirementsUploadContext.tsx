import type { RequirementId } from '@/constants/requirements';
import React, { createContext, useContext, useMemo, useState } from 'react';

export type UploadedFile = {
  name: string;
  sizeLabel: string;   // derived
  sizeBytes?: number;  // raw
  mimeType?: string;
  uri?: string;
};

export type ResumeReviewData = {
  firstName: string;
  lastName: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  jobRole: string;
} | null;

export type UploadKey = RequirementId | 'resume';

type RequirementsUploadContextValue = {
  files: Partial<Record<UploadKey, UploadedFile>>;
  setFile: (id: UploadKey, file: UploadedFile) => void;
  removeFile: (id: UploadKey) => void;
  resumeReviewData: ResumeReviewData;
  setResumeReviewData: (data: ResumeReviewData) => void;
};

const RequirementsUploadContext = createContext<RequirementsUploadContextValue | null>(null);

export function RequirementsUploadProvider({ children }: { children: React.ReactNode }) {
  const [files, setFiles] = useState<Partial<Record<UploadKey, UploadedFile>>>({});
  const [resumeReviewData, setResumeReviewData] = useState<ResumeReviewData>(null);

  const value = useMemo<RequirementsUploadContextValue>(() => {
    return {
      files,
      setFile: (id, file) => {
        setFiles((prev) => ({ ...prev, [id]: file }));
      },
      removeFile: (id) => {
        setFiles((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      },
      resumeReviewData,
      setResumeReviewData,
    };
  }, [files, resumeReviewData]);

  return <RequirementsUploadContext.Provider value={value}>{children}</RequirementsUploadContext.Provider>;
}

export function useRequirementsUpload() {
  const ctx = useContext(RequirementsUploadContext);
  if (!ctx) {
    throw new Error('useRequirementsUpload must be used within RequirementsUploadProvider');
  }
  return ctx;
}