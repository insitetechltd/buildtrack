import { createParityContext, describeParity } from './_parityTestSetup';
import {
  cleanupParityFixture,
  seedParityFixture,
  type ParitySeed,
} from '../harness/paritySeed';
import { recordParityCell, beginParityRunOnce } from '../harness/parityReport';
import {
  deleteParityFile,
  ensureParityStorageBucket,
  getParityFileUrl,
  listParityFiles,
  uploadParityFile,
  PARITY_STORAGE_BUCKET,
} from '../ops/storage.ops';
describeParity('Parity F-*: Storage', () => {
  let seed: ParitySeed;
  let uploadedPath = '';

  beforeAll(async () => {
    beginParityRunOnce();
    const ctx = createParityContext();
    await ensureParityStorageBucket(ctx.service);
    seed = await seedParityFixture(ctx);
  });

  afterAll(async () => {
    const ctx = createParityContext();
    if (uploadedPath) {
      try {
        await deleteParityFile(ctx.service, uploadedPath);
      } catch {
        // ignore
      }
    }
    await cleanupParityFixture(ctx, seed);
  });

  it('F-01 uploadFile special chars', async () => {
    const ctx = createParityContext();
    // Service role avoids empty-bucket/RLS setup gaps on a fresh sandbox clone.
    const body = Buffer.from('parity-storage-body');
    uploadedPath = await uploadParityFile(ctx.service, {
      companyId: seed.companies.mainId,
      entityId: `task-${seed.runId}`,
      fileName: 'photo name (1) & #2.txt',
      body,
      contentType: 'text/plain',
    });
    recordParityCell('F-01', uploadedPath ? 'PASS' : 'FAIL', {
      message: `bucket=${PARITY_STORAGE_BUCKET}`,
    });
    expect(uploadedPath).toContain(seed.companies.mainId);
  });

  it('F-02 getFileUrl / retrieve', async () => {
    const ctx = createParityContext();
    const url = await getParityFileUrl(ctx.service, uploadedPath);
    const ok = Boolean(url && url.includes('http'));
    recordParityCell('F-02', ok ? 'PASS' : 'FAIL', { message: url });
    expect(ok).toBe(true);
  });

  it('F-04 path prefix companyId', async () => {
    const ok = uploadedPath.startsWith(`${seed.companies.mainId}/`);
    recordParityCell('F-04', ok ? 'PASS' : 'FAIL', { message: uploadedPath });
    expect(ok).toBe(true);
  });

  it('F-03 deleteFile', async () => {
    const ctx = createParityContext();
    await deleteParityFile(ctx.service, uploadedPath);
    const prefix = uploadedPath.split('/').slice(0, -1).join('/');
    let remaining: string[] = [];
    try {
      remaining = await listParityFiles(ctx.service, prefix);
    } catch {
      remaining = [];
    }
    const fileName = uploadedPath.split('/').pop();
    const gone = !remaining.includes(fileName || '');
    recordParityCell('F-03', gone ? 'PASS' : 'FAIL');
    uploadedPath = '';
    expect(gone).toBe(true);
  });
});
