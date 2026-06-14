# Changelog

All notable changes to dtk are documented here, starting from 1.3.1.

Since dtk generates files that you own, there is no automatic upgrade path. Each release notes what changed and which files to update manually if you want to adopt the changes.

---

## [1.3.1] - 2026-06-14

### Security

- **tsx** bumped from `^4.0.0` to `^4.22.4` — resolves two HIGH severity esbuild vulnerabilities in the generated project's dev toolchain:
  - [GHSA-gv7w-rqvm-qjhr](https://github.com/advisories/GHSA-gv7w-rqvm-qjhr)
  - [GHSA-g7r4-m6w7-qqqr](https://github.com/advisories/GHSA-g7r4-m6w7-qqqr)

### Dependencies updated in generated projects

The following versions are now written into newly generated `package.json` files:

| Package | 1.3.0 | 1.3.1 |
|---|---|---|
| `typescript` | `^5.0.0` | `^6.0.0` |
| `dotenv` | `^16.4.0` | `^17.0.0` |
| `redis` | `^4.7.1` | `^6.0.0` |
| `commander` | `^14.0.3` | `^15.0.0` |
| `@types/node` | `^20.0.0` | `^25.0.0` |
| `tsx` | `^4.0.0` | `^4.22.4` |
| `@aws-sdk/*` | `^3.1040-1041.0` | `^3.1068.0` |
| `axios` | `^1.6.0` | `^1.17.0` |
| `jest` | `^30.3.0` | `^30.4.2` |
| `ts-jest` | `^29.4.9` | `^29.4.11` |

### Upgrading an existing generated project

There is no automated upgrade. To adopt these changes manually:

1. Open your project's `package.json` and update the versions in the table above to match the 1.3.1 column.
2. Run `npm install` to update your lockfile.
3. Run your tests to confirm nothing broke: `npm test`.

All runbooks have been tested against these versions and pass cleanly. If you are working with the generated project largely as-is -- customising runbooks to suit your use case but keeping the overall structure -- you should have no issues. Breaking changes are only likely if you have significantly deviated from the generated structure or extended the services in ways that depend on internals of the bumped packages.

The `tsx` security fix is the most important update. If you do nothing else, update that one.
