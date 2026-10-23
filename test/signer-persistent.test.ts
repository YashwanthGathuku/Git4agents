/**
 * Persistent-key signing: a control plane that signs again later with the
 * same key, verified against one pinned public key (verify-only signer).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { signEnvelope, verifyEnvelope, type InTotoStatement } from "../src/lib/attestation.ts";
import {
	createEd25519Signer,
	ed25519SignerFromPem,
	generateEd25519KeyPem,
	verifyOnlySigner,
} from "../src/lib/signer-node.ts";

const STATEMENT: InTotoStatement = {
	_type: "https://in-toto.io/Statement/v1",
	subject: [{ digest: { sha256: "a".repeat(64) } }],
	predicateType: "https://example.test/TeamRun/v1",
	predicate: { team: "t-1", members: 2 },
};

test("a key loaded from PEM signs; the pinned public key verifies, later and elsewhere", async () => {
	const pem = generateEd25519KeyPem();
	const first = ed25519SignerFromPem(pem.privateKeyPem);
	const again = ed25519SignerFromPem(pem.privateKeyPem);
	assert.equal(first.keyid, again.keyid);
	assert.equal(first.publicKeyDerHex, pem.publicKeyDerHex);
	const env = await signEnvelope(STATEMENT, again);
	const pinned = verifyOnlySigner(pem.publicKeyDerHex);
	assert.equal(pinned.keyid, first.keyid);
	const result = await verifyEnvelope(env, pinned);
	assert.equal(result.valid, true);
	assert.deepEqual(result.statement, STATEMENT);
});

test("a tampered payload or another key does not verify", async () => {
	const pem = generateEd25519KeyPem();
	const env = await signEnvelope(STATEMENT, ed25519SignerFromPem(pem.privateKeyPem));
	const pinned = verifyOnlySigner(pem.publicKeyDerHex);
	const tampered = { ...env, payload: env.payload.replace('"members":2', '"members":3') };
	assert.equal((await verifyEnvelope(tampered, pinned)).valid, false);
	const other = await signEnvelope(STATEMENT, createEd25519Signer());
	assert.equal((await verifyEnvelope(other, pinned)).valid, false);
});

test("the verify-only signer cannot sign, and non-Ed25519 keys are refused", async () => {
	const pem = generateEd25519KeyPem();
	await assert.rejects(verifyOnlySigner(pem.publicKeyDerHex).sign(new Uint8Array([1])), /cannot sign/);
	const rsa = generateKeyPairSync("rsa", { modulusLength: 2048 });
	assert.throws(() => ed25519SignerFromPem(rsa.privateKey.export({ type: "pkcs8", format: "pem" }).toString()),
		/not an Ed25519 private key/);
	assert.throws(() => verifyOnlySigner(rsa.publicKey.export({ type: "spki", format: "der" }).toString("hex")),
		/not an Ed25519 public key/);
});
