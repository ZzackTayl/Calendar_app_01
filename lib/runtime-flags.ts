const NEXT_BUILD_PHASES = new Set([
  'phase-production-build',
  'phase-export',
  'phase-production-server'
]);

function isNextBuildPhase(): boolean {
  const phase = process.env.NEXT_PHASE;
  return phase ? NEXT_BUILD_PHASES.has(phase) : false;
}

function argvIndicatesBuild(): boolean {
  return Array.isArray(process.argv) && process.argv.some(arg => /next[\/\\]?(dist)?[\/\\]build/i.test(arg));
}

export function isBuildTime(): boolean {
  const lifecycleEvent = process.env.npm_lifecycle_event;
  const lifecycleIsBuild = lifecycleEvent === 'build' || lifecycleEvent === 'vercel-build';
  const skipFlag = process.env.RUNTIME_SKIP_AUTOSTART === '1';
  return skipFlag || lifecycleIsBuild || isNextBuildPhase() || argvIndicatesBuild();
}

export function shouldAutoStartService(): boolean {
  if (typeof window !== 'undefined') return false;
  if (process.env.NODE_ENV === 'test') return false;
  if (isBuildTime()) return false;
  return true;
}
