import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runClaude, ClaudeCliError } from './claudeCli.mjs';

test('invokes claude with -p, --model, and pipes the prompt via stdin', () => {
  let capturedCmd;
  let capturedArgs;
  let capturedOptions;
  const spawnFn = (cmd, args, options) => {
    capturedCmd = cmd;
    capturedArgs = args;
    capturedOptions = options;
    return { status: 0, stdout: '[]', stderr: '', error: null };
  };
  const result = runClaude('review this diff', { spawnFn });
  assert.equal(capturedCmd, 'claude');
  assert.deepEqual(capturedArgs, ['-p', '--model', 'sonnet', '--allowedTools', '']);
  assert.equal(capturedOptions.input, 'review this diff');
  assert.equal(result, '[]');
});

test('passes a custom model through, still via stdin', () => {
  let capturedArgs;
  let capturedOptions;
  const spawnFn = (cmd, args, options) => {
    capturedArgs = args;
    capturedOptions = options;
    return { status: 0, stdout: '[]', stderr: '', error: null };
  };
  runClaude('p', { model: 'haiku', spawnFn });
  assert.deepEqual(capturedArgs, ['-p', '--model', 'haiku', '--allowedTools', '']);
  assert.equal(capturedOptions.input, 'p');
});

test('never puts the prompt into the argv array, regardless of size', () => {
  let capturedArgs;
  const spawnFn = (cmd, args) => {
    capturedArgs = args;
    return { status: 0, stdout: '[]', stderr: '', error: null };
  };
  const hugePrompt = 'x'.repeat(500_000); // far past Linux's 128 KiB single-arg cap
  runClaude(hugePrompt, { spawnFn });
  assert.ok(!capturedArgs.some((a) => a.length > 1000), 'no argv element should carry the prompt');
});

test('throws ClaudeCliError with stderr when the CLI exits nonzero', () => {
  const spawnFn = () => ({ status: 1, stdout: '', stderr: 'boom', error: null });
  assert.throws(() => runClaude('p', { spawnFn }), (err) => {
    assert.ok(err instanceof ClaudeCliError);
    assert.match(err.message, /boom/);
    return true;
  });
});

test('throws ClaudeCliError including stdout when the CLI writes its error there and stderr is empty', () => {
  // Discovered live: claude writes some failures (e.g. auth errors) to
  // stdout, not stderr -- an error message built from stderr alone
  // silently dropped the real diagnostic in that case.
  const spawnFn = () => ({
    status: 1,
    stdout: 'Failed to authenticate. API Error: 401 Invalid bearer token\n',
    stderr: '',
    error: null,
  });
  assert.throws(() => runClaude('p', { spawnFn }), (err) => {
    assert.ok(err instanceof ClaudeCliError);
    assert.match(err.message, /Invalid bearer token/);
    return true;
  });
});

test('throws ClaudeCliError when the process fails to spawn', () => {
  const spawnFn = () => ({ status: null, stdout: '', stderr: '', error: new Error('ENOENT') });
  assert.throws(() => runClaude('p', { spawnFn }), (err) => {
    assert.ok(err instanceof ClaudeCliError);
    assert.match(err.message, /ENOENT/);
    return true;
  });
});
