import {
  canonicalizeForGolden,
  formatParityReportCsv,
  formatParityReportMarkdown,
  recordParityCell,
  resetParityReport,
  getParityResults,
} from '../parityReport';
import {
  expectCanonicalTask,
  matchGoldenShape,
  toCanonicalTask,
} from '../parityAssert';
import {
  readTaskStatus,
  writeTaskStatusPayload,
  readDeclineReason,
} from '../../adapters/status.adapter';

describe('parityReport', () => {
  beforeEach(() => {
    resetParityReport();
  });

  it('records and formats cell results', () => {
    recordParityCell('T-01', 'PASS', { message: 'ok', target: 'old' });
    recordParityCell('S-06', 'DELTA', { message: 'DELTA-SEC', target: 'new' });

    const results = getParityResults();
    expect(results).toHaveLength(2);

    const md = formatParityReportMarkdown(results);
    expect(md).toContain('| T-01 | PASS |');
    expect(md).toContain('DELTA-SEC');

    const csv = formatParityReportCsv(results);
    expect(csv.split('\n')[0]).toBe('id,status,target,at,message');
    expect(csv).toContain('T-01,PASS,old');
  });

  it('canonicalizes volatile fields for golden snapshots', () => {
    const out = canonicalizeForGolden({
      id: 'abc',
      title: 'Task',
      updatedAt: '2026-01-01',
      nested: { createdAt: 'x', status: 'new' },
    }) as any;

    expect(out.id).toBe('<volatile>');
    expect(out.title).toBe('Task');
    expect(out.nested.createdAt).toBe('<volatile>');
    expect(out.nested.status).toBe('new');
  });
});

describe('parityAssert + status adapter', () => {
  it('maps canonical task and asserts fields', () => {
    const canonical = toCanonicalTask({
      projectId: 'p1',
      title: 'Seal joints',
      status: 'in_progress',
      completionPercentage: 40,
      assignedTo: ['u2', 'u1'],
      assignedBy: 'u0',
      activities: [
        {
          id: 'a1',
          taskId: 't1',
          userId: 'u1',
          activityType: 'status_change',
          timestamp: '2026-01-01',
          data: {},
          description: '',
          createdAt: '2026-01-01',
        },
      ],
    });

    expect(canonical.assignedTo).toEqual(['u1', 'u2']);
    expectCanonicalTask(
      {
        projectId: 'p1',
        title: 'Seal joints',
        status: 'in_progress',
        completionPercentage: 40,
        assignedTo: ['u2', 'u1'],
        assignedBy: 'u0',
        activities: [
          {
            id: 'a1',
            taskId: 't1',
            userId: 'u1',
            activityType: 'status_change',
            timestamp: '2026-01-01',
            data: {},
            description: '',
            createdAt: '2026-01-01',
          },
        ],
      },
      { status: 'in_progress', title: 'Seal joints' },
    );
  });

  it('matchGoldenShape ignores volatile keys', () => {
    matchGoldenShape(
      { title: 'A', updatedAt: '1', id: 'x' },
      { title: 'A', updatedAt: '2', id: 'y' },
    );
  });

  it('status adapter bridges old/new columns', () => {
    expect(readTaskStatus({ current_status: 'new' })).toBe('new');
    expect(readTaskStatus({ status: 'approved' })).toBe('approved');
    expect(writeTaskStatusPayload('in_progress', 'new')).toEqual({
      status: 'in_progress',
    });
    expect(writeTaskStatusPayload('in_progress', 'old')).toEqual({
      current_status: 'in_progress',
      status: 'in_progress',
    });
    expect(readDeclineReason({ decline_reason: 'busy' })).toBe('busy');
  });
});
