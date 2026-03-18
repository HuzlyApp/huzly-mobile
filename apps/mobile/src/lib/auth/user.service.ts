import { supabase } from '@/lib/config/supabase';

export type UpsertUserResult = {
  error: string | null;
};

export type WorkerIdResult = {
  workerId: string | null;
  error: string | null;
};

export type UserIdResult = {
  userId: string | null;
  error: string | null;
};

export type AdvanceWorkerOnboardingResult = {
  error: string | null;
};

export type WorkerOnboardingStepResult = {
  step: number;
  error: string | null;
};

export type UpdateWorkerProfileResult = {
  error: string | null;
};

/**
 * Ensure there is a corresponding row in public.users
 * for the currently authenticated Supabase user.
 */
export async function upsertCurrentUserRow(params: {
  role?: string | null;
}): Promise<UpsertUserResult> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: userError?.message ?? 'Not authenticated' };
  }

  const { error: upsertError } = await supabase.from('users').upsert({
    id: user.id,
    email: user.email,
    phone: user.phone,
    role: params.role ?? null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  if (upsertError) {
    return { error: upsertError.message };
  }

  return { error: null };
}

export async function getCurrentWorkerId(): Promise<WorkerIdResult> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { workerId: null, error: userError?.message ?? 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('worker')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    return { workerId: null, error: error.message };
  }

  if (!data?.id) {
    return { workerId: null, error: 'Worker record not found for current user' };
  }

  return { workerId: data.id as string, error: null };
}

export async function getCurrentUserId(): Promise<UserIdResult> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { userId: null, error: userError?.message ?? 'Not authenticated' };
  }

  return { userId: user.id as string, error: null };
}

export async function advanceWorkerOnboardingStep(step: number): Promise<AdvanceWorkerOnboardingResult> {
  const { workerId, error } = await getCurrentWorkerId();
  if (error || !workerId) {
    return { error: error ?? 'Worker not found' };
  }

  // For now, mark this specific step (job roles) as reached: step 2.
  const { error: updateError } = await supabase
    .from('worker')
    .update({ onboarding_step: step })
    .eq('id', workerId);

  if (updateError) {
    return { error: updateError.message };
  }

  return { error: null };
}

export async function getWorkerOnboardingStep(): Promise<WorkerOnboardingStepResult> {
  const { workerId, error } = await getCurrentWorkerId();
  if (error || !workerId) {
    return { step: 0, error: error ?? 'Worker not found' };
  }

  const { data, error: fetchError } = await supabase
    .from('worker')
    .select('onboarding_step')
    .eq('id', workerId)
    .maybeSingle();

  if (fetchError) {
    return { step: 0, error: fetchError.message };
  }

  const raw = (data as { onboarding_step?: number } | null)?.onboarding_step ?? 0;
  return { step: raw, error: null };
}

export async function updateCurrentWorkerProfileFromResumeReview(fields: {
  firstName: string;
  lastName: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  jobRole: string;
}): Promise<UpdateWorkerProfileResult> {
  const { workerId, error } = await getCurrentWorkerId();
  if (error || !workerId) {
    return { error: error ?? 'Worker not found' };
  }

  const payload = {
    first_name: fields.firstName || null,
    last_name: fields.lastName || null,
    address1: fields.address1 || null,
    address2: fields.address2 || null,
    city: fields.city || null,
    state: fields.state || null,
    phone: fields.phone || null,
    email: fields.email || null,
    job_role: fields.jobRole || null,
  };

  const { error: updateError } = await supabase
    .from('worker')
    .update(payload)
    .eq('id', workerId);

  if (updateError) {
    return { error: updateError.message };
  }

  return { error: null };
}

