const CSE_ALIASES = ['CSE', 'CSE1', 'CSE 1', 'CSE-1', 'CSE2', 'CSE 2', 'CSE-2'];

function normalizeDepartment(department) {
  if (!department) return department;

  const normalized = String(department).trim().toUpperCase().replace(/\s+/g, ' ');
  return CSE_ALIASES.includes(normalized) ? 'CSE' : String(department).trim();
}

function buildDepartmentFilter(department) {
  const normalized = normalizeDepartment(department);
  if (!normalized) return undefined;

  if (normalized === 'CSE') {
    return { $in: CSE_ALIASES };
  }

  return normalized;
}

function normalizeDepartmentField(doc) {
  if (!doc || !doc.department) return doc;
  doc.department = normalizeDepartment(doc.department);
  return doc;
}

module.exports = {
  normalizeDepartment,
  buildDepartmentFilter,
  normalizeDepartmentField
};
