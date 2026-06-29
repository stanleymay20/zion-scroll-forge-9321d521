const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/services/CourseWorkflowService.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Map of snake_case to camelCase field names
const fieldMappings = {
  'course_project_id': 'courseProjectId',
  'phase_progress_id': 'phaseProgressId',
  'start_date': 'startDate',
  'completion_date': 'completionDate',
  'due_date': 'dueDate',
  'assigned_to': 'assignedTo',
  'updated_at': 'updatedAt',
  'created_at': 'createdAt',
  'current_phase': 'currentPhase',
  'target_launch_date': 'targetLaunchDate',
  'actual_launch_date': 'actualLaunchDate',
  'user_id': 'userId',
  'approver_id': 'approverId',
  'approver_name': 'approverName',
  'approver_role': 'approverRole',
  'launch_approved': 'launchApproved'
};

// Replace all occurrences
for (const [snakeCase, camelCase] of Object.entries(fieldMappings)) {
  const regex = new RegExp(snakeCase, 'g');
  content = content.replace(regex, camelCase);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Fixed all field names in CourseWorkflowService.ts');
