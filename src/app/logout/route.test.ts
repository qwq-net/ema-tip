import { describe, expect, it } from 'vitest';
import { POST } from './route';

describe('POST /logout', () => {
  it('遷移先は相対パスで返し、サーバー自身のホスト名を含めない', async () => {
    const response = await POST();

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('/login');
  });
});
