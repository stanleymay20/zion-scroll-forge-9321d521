import { expect, Page, test } from '@playwright/test';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const INSTITUTION_ID = '22222222-2222-4222-8222-222222222222';
const SESSION_KEY = 'sb-example-auth-token';

type LifecycleState = {
  status: 'applicant' | 'admitted' | 'enrolled' | 'active';
  orientationSteps: number;
  matriculated: boolean;
  learningProfileComplete: boolean;
  enrollmentCount: number;
};

const confirmedAt = '2026-09-08T00:00:00.000Z';
const user = {
  id: USER_ID,
  aud: 'authenticated',
  role: 'authenticated',
  email: 'lifecycle-e2e@scrolluniversity.test',
  email_confirmed_at: confirmedAt,
  confirmed_at: confirmedAt,
  phone: '',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: {},
  identities: [],
  created_at: confirmedAt,
  updated_at: confirmedAt,
};

const session = {
  access_token: 'e2e-access-token',
  refresh_token: 'e2e-refresh-token',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: 4102444800,
  user,
};

async function installSession(page: Page) {
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, value),
    { key: SESSION_KEY, value: JSON.stringify(session) },
  );
}

async function mockSupabase(page: Page, state: LifecycleState) {
  await page.addInitScript(
    ({ state, user, session, userId, institutionId }) => {
      const originalFetch = window.fetch.bind(window);
      const json = (value: unknown, init: ResponseInit = {}) => new Response(JSON.stringify(value), {
        status: 200,
        ...init,
        headers: { 'content-type': 'application/json', ...(init.headers || {}) },
      });
      const countHeaders = (count: number) => ({
        'content-range': count === 0 ? '*/0' : `0-${Math.max(0, count - 1)}/${count}`,
        'content-type': 'application/json',
      });

      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const request = input instanceof Request ? input : new Request(input, init);
        const url = new URL(request.url);
        if (url.origin !== 'https://example.supabase.co') return originalFetch(input, init);

        if (url.pathname === '/auth/v1/token') return json(session);
        if (url.pathname === '/auth/v1/user') return json(user);
        if (!url.pathname.startsWith('/rest/v1/')) return json({});

        const resource = decodeURIComponent(url.pathname.slice('/rest/v1/'.length));
        if (resource.startsWith('rpc/')) return json([]);

        const wantsObject = (request.headers.get('accept') || '').includes('application/vnd.pgrst.object+json');
        let rows: any[] = [];
        let exactCount: number | null = null;

        switch (resource) {
          case 'profiles':
            rows = [{
              id: userId,
              lifecycle_status: state.status,
              current_institution_id: institutionId,
              full_name: 'Lifecycle E2E Student',
              email: user.email,
            }];
            break;
          case 'orientation_progress':
            exactCount = state.orientationSteps;
            rows = Array.from({ length: state.orientationSteps }, (_, index) => ({ step: index + 1 }));
            break;
          case 'matriculation_records':
            rows = state.matriculated ? [{ user_id: userId }] : [];
            break;
          case 'student_learning_profiles':
            rows = state.learningProfileComplete
              ? [{ id: '33333333-3333-4333-8333-333333333333', user_id: userId }]
              : [];
            break;
          case 'section_enrollments':
            exactCount = state.enrollmentCount;
            rows = [];
            break;
          case 'institution_members':
            rows = [{
              id: '44444444-4444-4444-8444-444444444444',
              institution_id: institutionId,
              user_id: userId,
              role: 'student',
              status: 'active',
            }];
            break;
          case 'institutions':
            rows = [{
              id: institutionId,
              name: 'ScrollUniversity',
              slug: 'scrolluniversity',
              short_name: 'SU',
              is_active: true,
            }];
            break;
          default:
            rows = [];
        }

        if (request.method === 'HEAD') {
          const count = exactCount ?? rows.length;
          return new Response(null, { status: 200, headers: countHeaders(count) });
        }

        return json(wantsObject ? (rows[0] ?? null) : rows);
      };
    },
    { state, user, session, userId: USER_ID, institutionId: INSTITUTION_ID },
  );
}

const cases: Array<{ name: string; state: LifecycleState; expectedPath: string }> = [
  {
    name: 'applicant cannot enter the student portal before completing the application stage',
    state: { status: 'applicant', orientationSteps: 0, matriculated: false, learningProfileComplete: false, enrollmentCount: 0 },
    expectedPath: '/apply',
  },
  {
    name: 'admitted student is routed to orientation until all nine steps are recorded',
    state: { status: 'admitted', orientationSteps: 8, matriculated: false, learningProfileComplete: false, enrollmentCount: 0 },
    expectedPath: '/orientation',
  },
  {
    name: 'admitted student with completed orientation is routed to matriculation',
    state: { status: 'admitted', orientationSteps: 9, matriculated: false, learningProfileComplete: false, enrollmentCount: 0 },
    expectedPath: '/matriculation',
  },
  {
    name: 'enrolled student with matriculation evidence must complete the learning profile',
    state: { status: 'enrolled', orientationSteps: 9, matriculated: true, learningProfileComplete: false, enrollmentCount: 0 },
    expectedPath: '/learning-profile',
  },
  {
    name: 'enrolled student remains in registration even after a governed section enrollment exists',
    state: { status: 'enrolled', orientationSteps: 9, matriculated: true, learningProfileComplete: true, enrollmentCount: 1 },
    expectedPath: '/register',
  },
];

test('unauthenticated student portal access fails closed to sign-in', async ({ page }) => {
  await page.goto('/student/dashboard', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/auth\/?$/);
});

test('real sign-in UI establishes a mocked session but an applicant is still routed to application', async ({ page }) => {
  const state: LifecycleState = {
    status: 'applicant', orientationSteps: 0, matriculated: false, learningProfileComplete: false, enrollmentCount: 0,
  };
  await mockSupabase(page, state);
  await page.goto('/auth?redirect=%2Fstudent%2Fdashboard', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Institutional Email or Student ID').fill(user.email);
  await page.getByLabel('Password').fill('CorrectHorseBatteryStaple!1');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page).toHaveURL(/\/apply\/?$/);
});

for (const scenario of cases) {
  test(scenario.name, async ({ page }) => {
    await installSession(page);
    await mockSupabase(page, scenario.state);
    await page.goto('/student/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(new RegExp(`${scenario.expectedPath.replace('/', '\\/')}\\/?$`));
  });
}

test('only backend-confirmed active status opens the student portal', async ({ page }) => {
  const state: LifecycleState = {
    status: 'active', orientationSteps: 9, matriculated: true, learningProfileComplete: true, enrollmentCount: 1,
  };
  await installSession(page);
  await mockSupabase(page, state);
  await page.goto('/student/dashboard', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/student\/dashboard\/?$/);
  await expect(page.getByRole('heading', { name: 'Student Portal' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
});
