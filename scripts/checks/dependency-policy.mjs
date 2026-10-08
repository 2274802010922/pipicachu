/** Exceptions cover named advisories, not every future issue in the same package. */
export function auditFailures(report, policy, now = new Date()) {
  const roots = new Map(policy.advisories.map((entry) => [entry.url, entry]));
  const failures = [];
  for (const [name, finding] of Object.entries(report.vulnerabilities || {})) {
    if (["high", "critical"].includes(finding.severity)) {
      failures.push(name);
      continue;
    }
    const allowed =
      finding.via?.length &&
      finding.via.every((cause) =>
        typeof cause === "string"
          ? policy.propagation[name]?.includes(cause) &&
            report.vulnerabilities[cause]
          : roots.get(cause.url)?.package === name &&
            roots.get(cause.url)?.severity === cause.severity &&
            new Date(roots.get(cause.url).reviewBefore) > now,
      );
    if (!allowed) failures.push(name);
  }
  return [...new Set(failures)];
}
