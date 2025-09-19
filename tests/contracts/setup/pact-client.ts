import path from 'path';
import { Pact, PactOptions } from '@pact-foundation/pact';

type PactSetupOptions = Partial<PactOptions> & {
  consumer: string;
  provider: string;
};

export function createPact(options: PactSetupOptions): Pact {
  const baseDir = path.resolve(process.cwd(), 'contracts/pact');

  const pact = new Pact({
    dir: baseDir,
    log: path.join(baseDir, 'logs', `${options.consumer}-${options.provider}.log`),
    spec: 3,
    logLevel: process.env.PACT_LOG_LEVEL ?? 'info',
    port: options.port ?? 9123,
    cors: true,
    ...options,
  });

  return pact;
}

export async function withPact<T>(
  options: PactSetupOptions,
  run: (pact: Pact) => Promise<T>
): Promise<T> {
  const pact = createPact(options);

  try {
    await pact.setup();
    const result = await run(pact);
    await pact.verify();
    return result;
  } finally {
    await pact.finalize();
  }
}
