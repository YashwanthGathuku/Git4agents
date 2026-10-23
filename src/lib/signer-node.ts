/// <reference types="node" />
/**
 * LOCAL SLICE SIGNER — Ed25519 over node:crypto, keypair held in memory.
 *
 * Production uses Sigstore/DSSE per spec 4 §6 (offline-verifiable
 * bundles, key transparency); the envelope shape is IDENTICAL, only the
 * key backend differs. The signing key lives in the control plane only
 * (SLSA trust boundary, spec 3 §2) — contender sandboxes, evaluators,
 * reviewers, and the verdict plane MUST NOT have access to it.
 */

import {
	createHash,
	createPrivateKey,
	createPublicKey,
	generateKeyPairSync,
	sign as cryptoSign,
	verify as cryptoVerify,
	type KeyObject,
} from "node:crypto";
import type { Signer } from "./attestation.ts";

export interface LocalEd25519Signer extends Signer {
	/** SHA-256 over the SPKI DER of the public key. */
	keyid: string;
	/** SPKI DER of the public key, hex-encoded (for bundle embedding). */
	publicKeyDerHex: string;
}

export function createEd25519Signer(): LocalEd25519Signer {
	const { publicKey, privateKey } = generateKeyPairSync("ed25519");
	return signerFor(privateKey, publicKey);
}

/**
 * A signer over a persistent Ed25519 private key (PKCS#8 PEM), for a
 * control plane that must sign again later with the same key, so bundles
 * stay verifiable against one pinned public key across runs. Anything but
 * an Ed25519 private key is refused.
 */
export function ed25519SignerFromPem(privateKeyPem: string): LocalEd25519Signer {
	const privateKey = createPrivateKey(privateKeyPem);
	if (privateKey.asymmetricKeyType !== "ed25519") {
		throw new Error(`not an Ed25519 private key: ${privateKey.asymmetricKeyType}`);
	}
	return signerFor(privateKey, createPublicKey(privateKey));
}

/** A new Ed25519 key pair as PEM, to store and pin (private stays local). */
export function generateEd25519KeyPem(): { privateKeyPem: string; publicKeyPem: string; publicKeyDerHex: string } {
	const { publicKey, privateKey } = generateKeyPairSync("ed25519");
	return {
		privateKeyPem: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
		publicKeyPem: publicKey.export({ type: "spki", format: "pem" }).toString(),
		publicKeyDerHex: publicKey.export({ type: "spki", format: "der" }).toString("hex"),
	};
}

/**
 * A signer that can only verify, against a pinned public key (hex SPKI
 * DER): sign() always throws. The keyid must be the pinned key's.
 */
export function verifyOnlySigner(publicKeyDerHex: string): Signer & { keyid: string } {
	const publicKey = createPublicKey({ key: Buffer.from(publicKeyDerHex, "hex"), format: "der", type: "spki" });
	if (publicKey.asymmetricKeyType !== "ed25519") {
		throw new Error(`not an Ed25519 public key: ${publicKey.asymmetricKeyType}`);
	}
	const keyid = createHash("sha256").update(Buffer.from(publicKeyDerHex, "hex")).digest("hex");
	return {
		keyid,
		async sign(): Promise<{ signature: string; keyid: string }> {
			throw new Error("verify-only signer cannot sign");
		},
		async verify(payload: Uint8Array, signature: string, requestedKeyid: string): Promise<boolean> {
			if (requestedKeyid !== keyid) return false;
			try {
				return cryptoVerify(null, payload, publicKey, Buffer.from(signature, "base64"));
			} catch {
				return false;
			}
		},
	};
}

function signerFor(privateKey: KeyObject, publicKey: KeyObject): LocalEd25519Signer {
	const publicKeyDerHex = publicKey.export({ type: "spki", format: "der" }).toString("hex");
	const keyid = createHash("sha256").update(Buffer.from(publicKeyDerHex, "hex")).digest("hex");
	return {
		keyid,
		publicKeyDerHex,
		async sign(payload: Uint8Array): Promise<{ signature: string; keyid: string }> {
			const sig = cryptoSign(null, payload, privateKey);
			return { signature: sig.toString("base64"), keyid };
		},
		async verify(payload: Uint8Array, signature: string, requestedKeyid: string): Promise<boolean> {
			if (requestedKeyid !== keyid) return false;
			try {
				return cryptoVerify(null, payload, publicKey, Buffer.from(signature, "base64"));
			} catch {
				return false;
			}
		},
	};
}
