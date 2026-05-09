# GitHub World Client Slice Design

## Context

The roadmap's Phase 3 write path uses GitHub API calls for PRs, regression issues, RFC Discussions, and eventually auto-merge workflows. Current local filesystem write paths prove artifact shape but do not provide the GitHub integration contract.

## Approach

Add a small dependency-free GitHub client in `packages/world/src/github.ts`:

- REST `createPullRequest` for proposed world artifacts.
- REST `createIssue` for regression reports.
- GraphQL `createDiscussion` for RFC-style discussions.
- Injectable `fetch` for tests and future credential handling.

The client takes an explicit token and repository coordinates. It does not read environment variables directly, keeping credential resolution in tools/CLI later.

## Non-Goals

- No live GitHub calls in tests.
- No branch creation/push logic.
- No auto-merge execution.

## Success Criteria

- Mocked tests verify GitHub REST/GraphQL URLs, authorization headers, payloads, and parsed URLs.
- Full `the-agent` gates pass.
