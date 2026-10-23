import { spawnSync } from 'node:child_process';

export class ClaudeCliError extends Error {}

/**
 * Run the Claude Code CLI headlessly and return its raw stdout.
 * Auth comes from the inherited CLAUDE_CODE_OAUTH_TOKEN env var — this
 * function does not read or pass it explicitly, `spawnSync` inherits the
 * parent process environment by default.
 * `--allowedTools ''` is passed explicitly so this headless call can never
 * invoke any tools, regardless of the environment's ambient permission
 * settings — a deliberate security boundary since the prompt embeds
 * untrusted PR diff content.
 * The prompt is piped via stdin (`input`), NOT passed as a CLI argument —
 * Linux caps any single argv string at 128 KiB (MAX_ARG_STRLEN), and a real
 * prompt (CLAUDE.md excerpt + diff) routinely exceeds that, failing with
 * `spawnSync ... E2BIG` on Linux CI runners even though it works on macOS
 * dev machines, which don't enforce that limit as strictly. stdin has no
 * such size ceiling.
 */
export function runClaude(
  prompt,
  { model = 'sonnet', spawnFn = spawnSync, timeoutMs = 5 * 60 * 1000 } = {},
) {
  const result = spawnFn('claude', ['-p', '--model', model, '--allowedTools', ''], {
    input: prompt,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 20,
    timeout: timeoutMs,
  });

  if (result.error) {
    throw new ClaudeCliError(`Failed to spawn claude CLI: ${result.error.message}`);
  }
  if (result.status !== 0) {
    // The claude CLI writes some failures (e.g. auth errors) to stdout
    // rather than stderr, so both streams are surfaced here -- an error
    // message with only stderr silently dropped the actual diagnostic
    // when the real text landed on stdout instead.
    const stderr = (result.stderr || '').trim();
    const stdout = (result.stdout || '').trim();
    const details = [stderr && `stderr: ${stderr}`, stdout && `stdout: ${stdout}`]
      .filter(Boolean)
      .join(' | ') || '(no output captured)';
    throw new ClaudeCliError(`claude CLI exited with code ${result.status} -- ${details}`);
  }
  return result.stdout;
}
