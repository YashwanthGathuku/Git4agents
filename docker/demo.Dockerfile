# Reviewer image: runs the paper's demonstration, tests and benchmark with
# nothing to build or install on the reviewer's machine.
#
#   docker run --rm ghcr.io/yashwanthgathuku/git4agents:icse27                       # governed-resolution demo
#   docker run --rm ghcr.io/yashwanthgathuku/git4agents:icse27 npm test              # 482 tests
#   docker run --rm ghcr.io/yashwanthgathuku/git4agents:icse27 npm run bench:resolution
#
# Build from the repository root with full history (the benchmark loads the
# earlier resolver from commit ee421f0):
#   docker build -f docker/demo.Dockerfile -t git4agents-demo .

FROM rust:1-slim AS mergiraf
RUN cargo install mergiraf --version 0.20.0 --locked

# Trixie, like the promotion container (container/Dockerfile): the rebase
# path sets GIT_ATTR_SOURCE so a candidate's own .gitattributes cannot pick
# merge drivers, and Bookworm's Git 2.39 ignores that variable.
# python3 runs the TheUstad verifier (standard library only).
FROM node:22-trixie-slim
RUN apt-get update \
	&& apt-get install -y --no-install-recommends git ca-certificates python3 \
	&& rm -rf /var/lib/apt/lists/*
COPY --from=mergiraf /usr/local/cargo/bin/mergiraf /usr/local/bin/mergiraf
RUN git config --global user.name "Git4agents reviewer" \
	&& git config --global user.email "reviewer@git4agents.invalid" \
	&& git config --global commit.gpgsign false \
	&& git config --global init.defaultBranch main \
	&& git config --global --add safe.directory '*'
WORKDIR /git4agents
COPY . .
RUN npm ci --no-audit --no-fund
LABEL org.opencontainers.image.source="https://github.com/YashwanthGathuku/git4agents" \
	org.opencontainers.image.description="Git4agents: governed promotion and conflict resolution for fleets of coding agents (ICSE 2027 demo)" \
	org.opencontainers.image.licenses="Apache-2.0"
CMD ["npm", "run", "demo:resolution"]
