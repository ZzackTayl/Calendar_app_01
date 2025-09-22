"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isBuildTime = isBuildTime;
exports.shouldAutoStartService = shouldAutoStartService;
const NEXT_BUILD_PHASES = new Set([
    'phase-production-build',
    'phase-export',
    'phase-production-server'
]);
function isNextBuildPhase() {
    const phase = process.env.NEXT_PHASE;
    return phase ? NEXT_BUILD_PHASES.has(phase) : false;
}
function argvIndicatesBuild() {
    return Array.isArray(process.argv) && process.argv.some(arg => /next[\/\\]?(dist)?[\/\\]build/i.test(arg));
}
function isBuildTime() {
    const lifecycleEvent = process.env.npm_lifecycle_event;
    const lifecycleIsBuild = lifecycleEvent === 'build' || lifecycleEvent === 'vercel-build';
    const skipFlag = process.env.RUNTIME_SKIP_AUTOSTART === '1';
    return skipFlag || lifecycleIsBuild || isNextBuildPhase() || argvIndicatesBuild();
}
function shouldAutoStartService() {
    if (typeof window !== 'undefined')
        return false;
    if (process.env.NODE_ENV === 'test')
        return false;
    if (isBuildTime())
        return false;
    return true;
}
