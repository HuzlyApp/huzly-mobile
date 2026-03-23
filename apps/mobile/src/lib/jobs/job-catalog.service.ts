import { getCurrentWorkerId } from '@/lib/auth/user.service';
import { supabase } from '@/lib/config/supabase';

export type JobCategoryRow = {
  id: string;
  name: string;
  active: boolean | null;
};

export type JobRoleRow = {
  id: string;
  name: string;
  category_id: string;
  active: boolean | null;
};

export type SaveWorkerRolesResult = {
  error: string | null;
};

export type WorkerCategoryRoleRow = {
  job_category_id: string;
  role: string;
};

export async function fetchJobCatalog(): Promise<{
  categories: JobCategoryRow[];
  roles: JobRoleRow[];
  error: string | null;
}> {
  try {
    const EXCLUDED_CATEGORY_ID = 'a4b7aa0d-eca6-4204-8013-041ffc56ce46';

    const [{ data: catData, error: catError }, { data: roleData, error: roleError }] =
      await Promise.all([
        supabase
          .from('job_categories')
          .select('id, name, active')
          .neq('id', EXCLUDED_CATEGORY_ID),
        supabase
          .from('job_roles')
          .select('id, name, category_id, active')
          .neq('category_id', EXCLUDED_CATEGORY_ID),
      ]);

    if (catError) return { categories: [], roles: [], error: catError.message };
    if (roleError) return { categories: [], roles: [], error: roleError.message };

    return {
      categories: (catData as JobCategoryRow[] | null) ?? [],
      roles: (roleData as JobRoleRow[] | null) ?? [],
      error: null,
    };
  } catch (e: any) {
    return { categories: [], roles: [], error: e?.message ?? 'Failed to fetch job catalog.' };
  }
}


export async function saveWorkerCategoryRolesForCurrentWorker(params: {
  selectedRoleIds: Record<string, string[]>;
}): Promise<SaveWorkerRolesResult> {
  const { selectedRoleIds } = params;

  // Flatten all selected role IDs
  const roleIds = Object.values(selectedRoleIds).flat();
  if (roleIds.length === 0) {
    return { error: null };
  }

  const { workerId, error: workerError } = await getCurrentWorkerId();
  if (workerError || !workerId) {
    return { error: workerError ?? 'Worker not found' };
  }

  // Fetch job_roles to get category_id and name for each selected role
  const { data: rolesData, error: rolesError } = await supabase
    .from('job_roles')
    .select('id, name, category_id')
    .in('id', roleIds);

  if (rolesError) {
    return { error: rolesError.message };
  }

  const rows =
    rolesData?.map((r) => ({
      worker_id: workerId,
      job_category_id: r.category_id,
      role: r.name,
    })) ?? [];

  if (rows.length === 0) {
    return { error: null };
  }

  // Replace existing selections for this worker
  const { error: deleteError } = await supabase
    .from('worker_category_roles')
    .delete()
    .eq('worker_id', workerId);

  if (deleteError) {
    return { error: deleteError.message };
  }

  const { error: insertError } = await supabase.from('worker_category_roles').insert(rows);

  if (insertError) {
    return { error: insertError.message };
  }

  return { error: null };
}

export async function fetchWorkerCategoryRolesForCurrentWorker(): Promise<{
  roles: WorkerCategoryRoleRow[];
  error: string | null;
}> {
  const { workerId, error: workerError } = await getCurrentWorkerId();
  if (workerError || !workerId) {
    return { roles: [], error: workerError ?? 'Worker not found' };
  }

  const { data, error } = await supabase
    .from('worker_category_roles')
    .select('job_category_id, role')
    .eq('worker_id', workerId);

  if (error) {
    return { roles: [], error: error.message };
  }

  return {
    roles: (data as WorkerCategoryRoleRow[] | null) ?? [],
    error: null,
  };
}

