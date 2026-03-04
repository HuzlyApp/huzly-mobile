import type { RequirementId } from '@/constants/requirements';
import React, { createContext, useContext, useMemo, useState } from 'react';

export type UploadedFile = {
  name: string;
  sizeLabel: string;   // derived
  sizeBytes?: number;  // raw
  mimeType?: string;
  uri?: string;
};

type RequirementsUploadContextValue = {
  files: Partial<Record<RequirementId, UploadedFile>>;
  setFile: (id: RequirementId, file: UploadedFile) => void;
  removeFile: (id: RequirementId) => void;
};

const RequirementsUploadContext = createContext<RequirementsUploadContextValue | null>(null);

export function RequirementsUploadProvider({ children }: { children: React.ReactNode }) {
  const [files, setFiles] = useState<Partial<Record<RequirementId, UploadedFile>>>({});

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
    };
  }, [files]);

  return <RequirementsUploadContext.Provider value={value}>{children}</RequirementsUploadContext.Provider>;
}

export function useRequirementsUpload() {
  const ctx = useContext(RequirementsUploadContext);
  if (!ctx) {
    throw new Error('useRequirementsUpload must be used within RequirementsUploadProvider');
  }
  return ctx;
}