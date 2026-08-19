export const formValidationError = errors => {
  if (!errors) return 'validation error';
  const issues = errors.issues || errors.iss;
  if (Array.isArray(issues)) return issues.map(i => i.message).join(', ');
  if (issues?.length > 0) return issues.map(i => i.message).join(', ');
  return JSON.stringify(issues ?? errors.message ?? errors);
};
