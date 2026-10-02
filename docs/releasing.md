# Showcase deployment and npm releases

## Showcase

`.github/workflows/showcase.yml` runs on pull requests to `main`, pushes to `main`, and manual dispatch. It installs with `npm ci`, typechecks, runs library/documentation tests, builds with `/qivi/`, and saves `showcase-dist` for 14 days. Main-branch runs deploy through GitHub's Pages actions when Pages is enabled with the GitHub Actions source. Otherwise they leave the build available and report a warning.

Live URL: https://yogeshhrathod.github.io/qivi/. Check the Actions run and actual live site before claiming deployment success. The showcase is a static app with mock responses; browser microphone and speech features depend on user permissions/browser support.

To preview the downloadable artifact, extract it into a folder named `qivi`, serve its parent using `python3 -m http.server 8080`, and open `http://localhost:8080/qivi/`.

## npm package

Package directory: `library/qivi`. The root workspace is private and must not be the publication target. The same build is published to two registries:

- **npmjs.com** as `qivi-react`. It is unscoped, so it is public by default and needs no `--access` flag. Plain `qivi` is not usable: npm's typosquatting check rejects it as too similar to existing packages.
- **GitHub Packages** as `@yogeshhrathod/qivi`. GitHub's npm registry only accepts names scoped to the repository owner, so the release workflow renames the package in CI. The source `package.json` always says `qivi-react`.

The package is MIT licensed: `LICENSE` at the repository root and in `library/qivi`, plus `"license": "MIT"` in its `package.json`. Keep both copies identical. `qivi-react` is published from the `yogeshrathod` npm account; npm authentication is separate from GitHub login.

From the repository root:

```sh
npm ci
npm run typecheck
npm test
npm run build:showcase
cd library/qivi
npm pack --dry-run --json
npm pack
```

Inspect the archive: it should contain the built entry point, declarations, CSS, README, integration docs, and intended brand assets. Exclude credentials, corporate references, machine paths, demo source, and development artifacts. Test installation of the archive in a separate React consumer; import the stylesheet and check a real avatar and static icon.

### Releasing a version

When the maintainer explicitly requests a release:

1. Bump `version` in `library/qivi/package.json` according to public API compatibility. Never reuse a published version number.
2. Commit, push to `main`, and create a GitHub Release whose tag is `v<version>` (for example `gh release create v0.2.0 --generate-notes`).
3. `.github/workflows/release.yml` runs on the published release. It typechecks, tests, checks that the tag matches the package version, then:
   - publishes `@yogeshhrathod/qivi` to GitHub Packages with the workflow's `GITHUB_TOKEN`;
   - publishes `qivi-react` to npmjs.com with provenance when the `NPM_TOKEN` repository secret is set (an npm granular access token with publish rights on `qivi-react`). Without the secret this step is skipped with a warning.

   Both publish steps skip versions that already exist, so re-running the workflow is safe.

To publish to npmjs.com by hand instead, run `npm publish --otp=<code>` from `library/qivi` and follow npm's 2FA prompt.

Verify both registries (`npm view qivi-react version`, and the package page under the repository's **Packages** sidebar) before announcing availability. Do not claim a release that the workflow or registry has not confirmed.

## Branding and sponsorship

The README uses theme-selected transparent captures. Update both when the avatar or banner changes. The capture source and provenance are documented in `docs/assets/README.md`.

Repository funding is configured in `.github/FUNDING.yml`. Project links use https://github.com/yogeshhrathod/qivi and https://github.com/sponsors/yogeshhrathod. Keep these consistent across demo and documentation.
