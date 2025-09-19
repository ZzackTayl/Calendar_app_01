import path from 'path';
import { ensureTestSecretsAndPersist } from '../config/testing/test-secrets';

const args = process.argv.slice(2);

const persistArgument = args.find((arg) => arg.startsWith('--out='));
const persistPath = persistArgument ? persistArgument.split('=')[1] : undefined;
const resolvedPersistPath = persistPath
  ? path.resolve(process.cwd(), persistPath)
  : undefined;

const result = ensureTestSecretsAndPersist(resolvedPersistPath, true);

const lines: string[] = [];
lines.push('🛡️ Test secret environment prepared');
if (result.persistedPath) {
  lines.push(`  • Secrets written to: ${result.persistedPath}`);
}
if (Object.keys(result.generated).length > 0) {
  lines.push(`  • Generated ${Object.keys(result.generated).length} secret value(s)`);
}
if (result.loadedFiles.length > 0) {
  lines.push(`  • Loaded existing env files: ${result.loadedFiles.join(', ')}`);
}

console.log(lines.join('\n'));
