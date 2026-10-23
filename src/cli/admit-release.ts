/**
 * Read-only release admission. Configuration is owner-controlled and must not be
 * writable by a coding worker. Paths are relative to that configuration file.
 * Exit 0: admitted; 1: refused; 2: invalid command/configuration. Never deploys.
 */
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseTrustedKey } from "./verify.ts";
import { verifyOnlySigner } from "../lib/signer-node.ts";
import { admitRelease } from "../lib/release-admission.ts";

export async function main(args: string[]): Promise<number> {
	if (args.length !== 2 || args[0] !== "--config") {
		console.error("usage: node src/cli/admit-release.ts --config <owner-controlled-release.json>");
		return 2;
	}
	try {
		const configPath = path.resolve(args[1]);
		const config = JSON.parse(await readFile(configPath, "utf8"));
		const required = ["promotionBundle", "buildAttestation", "artifact", "authorityPublicKey", "builderPublicKey",
			"selectorPolicyHash", "repository", "environment", "promotedCommit"];
		if (!config || required.some((key) => typeof config[key] !== "string" || !config[key].trim())) throw new Error("incomplete release configuration");
		const read = (name: string) => readFile(path.resolve(path.dirname(configPath), config[name]), "utf8");
		const authorityKey = parseTrustedKey(await read("authorityPublicKey"));
		const builderKey = parseTrustedKey(await read("builderPublicKey"));
		const hash = createHash("sha256");
		for await (const chunk of createReadStream(path.resolve(path.dirname(configPath), config.artifact))) hash.update(chunk);
		const result = await admitRelease({
			promotion: JSON.parse(await read("promotionBundle")),
			build: JSON.parse(await read("buildAttestation")),
			artifactSha256: hash.digest("hex"),
			trust: { authorityKeyDerHex: authorityKey, selectorPolicyHash: config.selectorPolicyHash,
				repository: config.repository, environment: config.environment, promotedCommit: config.promotedCommit },
			authorityVerifier: verifyOnlySigner(authorityKey),
			builderVerifier: verifyOnlySigner(builderKey),
		});
		console.log(JSON.stringify(result, null, 2));
		return result.decision === "ADMITTED" ? 0 : 1;
	} catch (error) {
		console.error(`release admission error: ${error instanceof Error ? error.message : "invalid input"}`);
		return 2;
	}
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
	process.exitCode = await main(process.argv.slice(2));
}
