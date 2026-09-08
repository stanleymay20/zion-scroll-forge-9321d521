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

function countHeaders(count: number) {
  return {
    'content-range': count === 0 ? '*/0' : `0-${Math.max(0, count - 1)}/${count}`,
    'content-type': 'application/json',
  };
}

async function installSession(page: Page) {
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, value),
    { key: SESSION_KEY, value: JSON.stringify(session) },
  );
}

async function mockSupabase(page: Page, state: LifecycleState) {
  await page.route('https://example.supabase.co/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname === '/auth/v1/token') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(session) });
    }

    if (url.pathname === '/auth/v1/user') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) });
    }

    if (!url.pathname.startsWith('/rest/v1/')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    }

    const resource = decodeURIComponent(url.pathname.slice('/rest/v1/'.length));
    if (resource.startsWith('rpc/')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }

    const isHead = request.method() === 'HEAD';
    const accept = request.headers()['accept'] || '';
    const wantsObject = accept.includes('application/vnd.pgrst.object+json');

    let rows: any[] = [];
    let exactCount: number | null = null;

    switch (resource) {
      case 'profiles':
        rows = [{
          id: USER_ID,
          lifecycle_status: state.status,
          current_institution_id: INSTITUTION_ID,
          full_name: 'Lifecycle E2E Student',
          email: user.email,
        }];
        break;
      case 'orientation_progress':
        exactCount = state.orientationSteps;
        rows = Array.from({ length: state.orientationSteps }, (_, index) => ({ step: index + 1 }));
        break;
      case 'matriculation_records':
        rows = state.matriculated ? [{ user_id: USER_ID }] : [];
        break;
      case 'student_learning_profiles':
        rows = state.learningProfileComplete ? [{ id: '33333333-3333-4333-8333-333333333333', user_id: USER_ID }] : [];
        break;
      case 'section_enrollments':
        exactCount = state.enrollmentCount;
        rows = [];
        break;
      case 'institution_members':
        rows = [{
          id: '44444444-4444-4444-8444-444444444444',
          institution_id: INSTITUTION_ID,
          user_id: USER_ID,
          role: 'student',
          status: 'active',
        }];
        break;
      case 'institutions':
        rows = [{
          id: INSTITUTION_ID,
          name: 'ScrollUniversity',
          slug: 'scrolluniversity',
          short_name: 'SU',
          is_active: true,
        }];
        break;
      default:
        rows = [];
    }

    if (isHead) {
      const count = exactCount ?? rows.length;
      return route.fulfill({ status: 200, headers: countHeaders(count), body: '' });
    }

    const body = wantsObject ? JSON.stringify(rows[0] ?? null) : JSON.stringify(rows);
    return route.fulfill({ status: 200, headers: { 'content-type': 'application/json' }, body });
  });
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
