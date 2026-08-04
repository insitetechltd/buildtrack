import type { ParityContext } from './parityEnv';
import { cleanupIfAllowed } from './parityEnv';

export const PARITY_PASSWORD = 'ParityPass-Test-1!';

export type ParityPersona = 'tristan' | 'herman' | 'admin' | 'pending';

export type ParitySeedUser = {
  persona: ParityPersona;
  id: string;
  email: string;
  password: string;
  name: string;
  phone: string;
  companyId: string;
  role: 'admin' | 'manager' | 'worker';
};

export type ParitySeed = {
  runId: string;
  companies: { mainId: string; subId: string };
  users: Record<ParityPersona, ParitySeedUser>;
  projects: { harborId: string; penthouseId: string };
  taskIds: {
    lifecycle: string;
    secondary: string;
  };
};

function emailFor(persona: string, runId: string): string {
  return `parity-${persona}-${runId}@parity.test`;
}

async function upsertCompany(
  ctx: ParityContext,
  name: string,
  type: string,
): Promise<string> {
  const existing = await ctx.service
    .from('companies')
    .select('id')
    .eq('name', name)
    .limit(1);

  if (existing.data?.[0]?.id) {
    return existing.data[0].id as string;
  }

  const created = await ctx.service
    .from('companies')
    .insert({
      name,
      type,
      description: 'Parity fixture',
      is_active: true,
    })
    .select('id')
    .single();

  if (created.error) {
    throw created.error;
  }
  return created.data.id as string;
}

async function provisionUser(
  ctx: ParityContext,
  input: {
    persona: ParityPersona;
    runId: string;
    name: string;
    role: 'admin' | 'manager' | 'worker';
    companyId: string;
    isPending?: boolean;
    phone: string;
  },
): Promise<ParitySeedUser> {
  const email = emailFor(input.persona, input.runId);
  const password = PARITY_PASSWORD;

  const created = await (ctx.service.auth.admin as any).createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name: input.name,
      phone: input.phone,
      company_id: input.companyId,
    },
  });

  if (created.error) {
    throw created.error;
  }

  const userId = created.data.user.id as string;

  // Public-schema dump does not reinstall the auth.users → public.users trigger,
  // so insert the profile row explicitly (upsert for environments that do trigger).
  const profile = await ctx.service.from('users').upsert(
    {
      id: userId,
      name: input.name,
      email,
      phone: input.phone,
      company_id: input.companyId,
      position: 'Parity',
      role: input.role,
      is_pending: Boolean(input.isPending),
    },
    { onConflict: 'id' },
  );

  if (profile.error) {
    await (ctx.service.auth.admin as any).deleteUser(userId);
    throw profile.error;
  }

  return {
    persona: input.persona,
    id: userId,
    email,
    password,
    name: input.name,
    phone: input.phone,
    companyId: input.companyId,
    role: input.role,
  };
}

async function createProject(
  ctx: ParityContext,
  input: {
    name: string;
    createdBy: string;
    companyId: string;
  },
): Promise<string> {
  const created = await ctx.service
    .from('projects')
    .insert({
      name: input.name,
      description: 'Parity fixture project',
      status: 'active',
      start_date: new Date().toISOString(),
      location: 'Parity Site',
      created_by: input.createdBy,
      company_id: input.companyId,
      client_info: {},
    })
    .select('id')
    .single();

  if (created.error) {
    throw created.error;
  }
  return created.data.id as string;
}

async function assignUser(
  ctx: ParityContext,
  input: {
    userId: string;
    projectId: string;
    category: string;
    assignedBy: string;
  },
): Promise<void> {
  const { error } = await ctx.service.from('user_project_assignments').insert({
    user_id: input.userId,
    project_id: input.projectId,
    category: input.category,
    assigned_by: input.assignedBy,
    is_active: true,
  });

  if (error) {
    throw error;
  }
}

/**
 * Seed Tristan / Herman / Admin / Pending + Harbor / Penthouse for a parity run.
 * Uses service role so RLS does not block setup.
 */
export async function seedParityFixture(ctx: ParityContext): Promise<ParitySeed> {
  const runId = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;

  const mainId = await upsertCompany(
    ctx,
    `Parity Main Co ${runId}`,
    'general_contractor',
  );
  const subId = await upsertCompany(
    ctx,
    `Parity Sub Co ${runId}`,
    'subcontractor',
  );

  const admin = await provisionUser(ctx, {
    persona: 'admin',
    runId,
    name: 'Parity Admin',
    role: 'admin',
    companyId: mainId,
    phone: `81${runId.slice(-8)}`,
  });

  const tristan = await provisionUser(ctx, {
    persona: 'tristan',
    runId,
    name: 'Parity Tristan',
    role: 'manager',
    companyId: mainId,
    phone: `82${runId.slice(-8)}`,
  });

  const herman = await provisionUser(ctx, {
    persona: 'herman',
    runId,
    name: 'Parity Herman',
    role: 'worker',
    companyId: subId,
    phone: `83${runId.slice(-8)}`,
  });

  const pending = await provisionUser(ctx, {
    persona: 'pending',
    runId,
    name: 'Parity Pending',
    role: 'worker',
    companyId: mainId,
    isPending: true,
    phone: `84${runId.slice(-8)}`,
  });

  const harborId = await createProject(ctx, {
    name: `Harbor Tower ${runId}`,
    createdBy: tristan.id,
    companyId: mainId,
  });

  const penthouseId = await createProject(ctx, {
    name: `Private Penthouse ${runId}`,
    createdBy: tristan.id,
    companyId: mainId,
  });

  await assignUser(ctx, {
    userId: tristan.id,
    projectId: harborId,
    category: 'lead_project_manager',
    assignedBy: admin.id,
  });
  await assignUser(ctx, {
    userId: tristan.id,
    projectId: penthouseId,
    category: 'lead_project_manager',
    assignedBy: admin.id,
  });
  await assignUser(ctx, {
    userId: herman.id,
    projectId: harborId,
    category: 'subcontractor',
    assignedBy: tristan.id,
  });

  return {
    runId,
    companies: { mainId, subId },
    users: { admin, tristan, herman, pending },
    projects: { harborId, penthouseId },
    taskIds: {
      lifecycle: '',
      secondary: '',
    },
  };
}

export async function cleanupParityFixture(
  ctx: ParityContext,
  seed: ParitySeed | undefined,
): Promise<void> {
  if (!seed?.users || !seed?.projects) {
    return;
  }

  await cleanupIfAllowed(async () => {
    const userIds = Object.values(seed.users).map((u) => u.id);
    const projectIds = [seed.projects.harborId, seed.projects.penthouseId];

    await ctx.service.from('task_activities').delete().in(
      'task_id',
      (
        await ctx.service.from('tasks').select('id').in('project_id', projectIds)
      ).data?.map((t: { id: string }) => t.id) || [],
    );

    await ctx.service.from('tasks').delete().in('project_id', projectIds);
    await ctx.service
      .from('user_project_assignments')
      .delete()
      .in('project_id', projectIds);
    await ctx.service.from('projects').delete().in('id', projectIds);

    for (const userId of userIds) {
      await ctx.service.from('users').delete().eq('id', userId);
      try {
        await (ctx.service.auth.admin as any).deleteUser(userId);
      } catch {
        // ignore auth cleanup errors
      }
    }
  });
}
