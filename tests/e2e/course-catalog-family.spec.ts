import { expect, Page, test } from '@playwright/test';

const INSTITUTION_ID = '22222222-2222-4222-8222-222222222222';
const FACULTY_ID = '55555555-5555-4555-8555-555555555555';
const PROGRAM_ID = '66666666-6666-4666-8666-666666666666';
const TITLE = 'Foundations of Scroll Technology';

const courseRows = [
  ['diploma', 'ScrollDiploma'],
  ['master', 'ScrollMaster'],
  ['doctorate', 'ScrollDoctorate'],
  ['exousia', 'ScrollExousia'],
].map(([suffix, level]) => ({
  id: `77777777-7777-4777-8777-77777777777${suffix === 'diploma' ? '1' : suffix === 'master' ? '2' : suffix === 'doctorate' ? '3' : '4'}`,
  title: TITLE,
  description: 'A governed academic subject represented at multiple qualification levels.',
  faculty: 'Scroll Technology',
  faculty_id: FACULTY_ID,
  institution_id: INSTITUTION_ID,
  level,
  visibility: 'public_preview',
  credit_hours: 3,
  estimated_duration_hours: 48,
  duration: '8 weeks',
  career_track: ['Technology'],
  thumbnail_url: null,
  curriculum_status: 'pending_authorship',
  created_at: '2026-06-26T12:15:46.759Z',
}));

async function mockPublicCatalogue(page: Page) {
  await page.addInitScript(
    ({ courseRows, programId }) => {
      const originalFetch = window.fetch.bind(window);
      const json = (value: unknown, init: ResponseInit = {}) => new Response(JSON.stringify(value), {
        status: 200,
        ...init,
        headers: { 'content-type': 'application/json', ...(init.headers || {}) },
      });

      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const request = input instanceof Request ? input : new Request(input, init);
        const url = new URL(request.url);
        if (url.origin !== 'https://example.supabase.co') return originalFetch(input, init);

        if (url.pathname === '/auth/v1/user') {
          return new Response(JSON.stringify({ message: 'Auth session missing!' }), {
            status: 401,
            headers: { 'content-type': 'application/json' },
          });
        }

        if (!url.pathname.startsWith('/rest/v1/')) return json({});

        const resource = decodeURIComponent(url.pathname.slice('/rest/v1/'.length));
        switch (resource) {
          case 'courses':
            return json(courseRows);
          case 'degree_programs':
            return json([{ id: programId, title: 'Technology Programme', faculty: 'Scroll Technology' }]);
          case 'degree_program_courses':
            return json(courseRows.map((course: { id: string }) => ({
              degree_program_id: programId,
              course_id: course.id,
            })));
          case 'institutions':
            return json([]);
          default:
            return json([]);
        }
      };
    },
    { courseRows, programId: PROGRAM_ID },
  );
}

test('catalogue renders multiple qualification rows as one course family', async ({ page }) => {
  await mockPublicCatalogue(page);
  await page.goto('/catalog', { waitUntil: 'domcontentloaded' });

  await expect(page.getByText('1 matching course family · 4 academic variants')).toBeVisible();
  await expect(page.getByRole('heading', { name: TITLE, exact: true })).toHaveCount(1);
  await expect(page.getByText('4 academic level variants')).toBeVisible();

  for (const level of ['Diploma', 'Master', 'Doctorate', 'Exousia']) {
    await expect(page.getByRole('link', { name: level, exact: true })).toBeVisible();
  }
});
