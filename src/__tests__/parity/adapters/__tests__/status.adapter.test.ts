import {
  readTaskStatus,
  writeTaskStatusPayload,
} from '../status.adapter';

describe('status.adapter', () => {
  it('reads status or current_status', () => {
    expect(readTaskStatus({ status: 'new' })).toBe('new');
    expect(readTaskStatus({ current_status: 'in_progress' })).toBe(
      'in_progress',
    );
    expect(readTaskStatus({})).toBe('new');
  });

  it('writes status column for NEW and dual for OLD', () => {
    expect(writeTaskStatusPayload('approved', 'new')).toEqual({
      status: 'approved',
    });
    expect(writeTaskStatusPayload('approved', 'old')).toEqual({
      current_status: 'approved',
      status: 'approved',
    });
  });
});
