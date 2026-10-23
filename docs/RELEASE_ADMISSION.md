# Initial release admission and Nebius integration

This branch adds two building blocks for the
[Vibingcoding seven-day plan](VIBINGCODING_7_DAY_PLAN.md). Neither is a complete
deployment service. The existing recorded demo is unchanged.

## Check an artifact against a promoted revision

`src/lib/release-admission.ts` verifies a version-3 promotion bundle against a
pinned authority key and policy, requires passing verification/test evidence,
and checks a builder-signed statement binding the exact artifact digest to the
repository, source commit/tree, promotion-bundle digest, and environment.

The trusted builder uses `buildReleaseStatement()` and the existing signing
utilities. It must build from the promoted source and measure the output itself.
The verifier uses independently configured public keys; a worker must not supply
its own trust pins or the expected current revision.

Example owner-controlled configuration (replace all placeholders):

```json
{
  "promotionBundle": "promotion.json",
  "buildAttestation": "build-envelope.json",
  "artifact": "release.tar",
  "authorityPublicKey": "authority-public.pem",
  "builderPublicKey": "builder-public.pem",
  "selectorPolicyHash": "<trusted-policy-hash>",
  "repository": "<expected-repository>",
  "environment": "preview",
  "promotedCommit": "<current-promoted-commit>"
}
```

Run:

```sh
npm run release:admit -- --config /absolute/path/to/release-config.json
```

Paths within the configuration resolve relative to that file. The CLI hashes the
artifact's actual bytes. It prints JSON and exits 0 for ADMITTED, 1 for REFUSED,
or 2 for a configuration/command error. It never deploys or signs anything.

The deployer must still pin immutable artifact bytes, read current authority state,
enforce expiry and idempotency, and compare-and-swap its current release. Passing
this read-only check does not grant a reusable deployment authorization. A file
changed after the check must not be deployed by reopening an untrusted path.

## Use Nebius for conflict replay

The existing `scripts/resolvers/llm-replayer.mjs` accepts `LLM_PROVIDER=nebius`.
Supply `NEBIUS_API_KEY` through the runner's secret environment and set `LLM_MODEL`
to an NVIDIA model available in the account's current catalog. There is no default
model and no automatic fallback to another provider.

```sh
export LLM_PROVIDER=nebius
export LLM_MODEL='<NVIDIA-model-ID-from-your-Nebius-catalog>'
# NEBIUS_API_KEY must already be supplied securely to this process.
node scripts/resolvers/llm-replayer.mjs < replay-request.json
```

Default endpoint: `https://api.tokenfactory.nebius.com/v1/chat/completions`.
`LLM_BASE_URL` overrides the base **including `/v1`** for an owner-configured
regional endpoint or local transport test. The resolution ladder permits
`NEBIUS_API_KEY` in the replayer environment; do not give it authority, evaluator,
or cloud-administration credentials. Protect endpoint configuration from workers.

The adapter requests a non-streaming response with a 120-second request deadline.
It refuses incomplete/truncated responses, empty answer text, and reasoning-only
output. Returned code remains untrusted and must pass lease/witness checks.
HTTP failures return a status without echoing response payloads. There are no
automatic retries; the controller owns retry and spend policy.

The adapter does not yet persist model request IDs, usage, or cost. The live runner
integration must add that evidence without storing credentials or reasoning text.
It does not install or authenticate Claude Code, Codex, or Antigravity.

## Verify this slice

```sh
npm ci --ignore-scripts
npm run typecheck
node --test test/nebius-replayer.test.ts test/release-admission.test.ts test/attestation.test.ts test/signer-persistent.test.ts
```

At implementation time: 34 focused tests passed. Nebius tests use mock transport;
release tests use synthetic signed fixtures, plus a CLI test that hashes and then
detects tampering with actual temporary artifact bytes. No live Nebius credential
was configured and no deployment was performed. See the plan for the inherited
full-suite sandbox failures and the integration work still required.
