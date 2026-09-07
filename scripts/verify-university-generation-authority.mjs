import fs from 'node:fs';

const path = 'supabase/functions/generate-content/index.ts';
const source = fs.readFileSync(path, 'utf8');

const required = [
  ['mandatory bearer authentication', 'auth.getUser(token)'],
  ['role resolution', '.from("user_roles")'],
  ['institution context', 'current_institution_id'],
  ['cross-institution rejection', 'cross-institution generation forbidden'],
  ['admin-only bulk generation', 'bulk curriculum generation requires admin role'],
  ['active faculty assignment check', '.from("faculty_teaching_assignments")'],
  ['active assignment state', '.eq("state", "active")'],
  ['draft course state', 'curriculum_status: "pending_authorship"'],
  ['AI module provenance', 'content_source: "ai_generated"'],
  ['AI model provenance', 'content_model: aiConfig.model'],
  ['prompt hash provenance', 'content_prompt_hash: promptHash'],
  ['actor provenance', 'content_generated_by: actorUserId'],
  ['draft module state', 'content_review_state: "draft"'],
  ['quality verification reset', 'quality_verified: false'],
  ['assessment publication withheld', 'Automatic graded-assessment publication withheld pending assessment authority'],
  ['resource publication withheld', 'Automatic ancillary-material publication withheld pending resource authority'],
];

const forbidden = [
  [/ScrollCoin/i, 'learning-currency reward language'],
  [/scroll_coin/i, 'learning-currency database fields'],
  [/rewards_amount/i, 'module reward amount writes'],
  [/generateQuiz\s*\(/, 'automatic quiz generation'],
  [/generateMaterials\s*\(/, 'automatic ancillary-material generation'],
];

const failures = [];
for (const [label, fragment] of required) {
  if (!source.includes(fragment)) failures.push(`missing: ${label}`);
}
for (const [pattern, label] of forbidden) {
  if (pattern.test(source)) failures.push(`forbidden: ${label}`);
}

// Authorization must appear before provider resolution in the request handler.
const authAt = source.indexOf('resolveCallerContext(req, supabase, body)');
const providerAt = source.indexOf('resolveAiConfig()');
if (authAt < 0 || providerAt < 0 || authAt > providerAt) {
  failures.push('authorization must complete before AI-provider resolution');
}

// A non-admin target must be checked against a concrete course assignment.
const assignmentCourseAt = source.indexOf('.eq("course_id", targetCourseId)');
if (assignmentCourseAt < 0) failures.push('faculty assignment must bind to the requested course');

if (failures.length) {
  console.error('ScrollUniversity generation-authority contract FAILED:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('ScrollUniversity generation-authority contract PASS');
