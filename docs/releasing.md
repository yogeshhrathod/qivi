# Showcase deployment and npm releases

## Showcase

`.github/workflows/showcase.yml` runs on pull requests to `main`, pushes to `main`, and manual dispatch. It installs with `npm ci`, typechecks, runs library/documentation tests, builds with `/qivi/`, and saves `showcase-dist` for 14 days. Main-branch runs deploy through GitHub's Pages actions when Pages is enabled with the GitHub Actions source. Otherwise they leave the build available and report a warning.

Live URL: https://yogeshhrathod.github.io/qivi/. Check the Actions run and actual live site before claiming deployment success. The showcase is a static app with mock responses; browser microphone and speech features depend on user permissions/browser support.

To preview the downloadable artifact, extract it into a folder named `qivi`, serve its parent using `python3 -m http.server 8080`, and open `http://localhost:8080/qivi/`.

## npm package

Package directory: `library/qivi`. Name: `@yogeshhrathod/qivi`. The root workspace is private and must not be the publication target. No automated npm publishing workflow is configured. This guide does not imply that a registry release already exists.

Before an initial public release, the maintainer must select a license, add its text, and set package license metadata. Confirm package-name ownership and npm authentication separately from GitHub login.

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

When the maintainer explicitly requests publication and package/version/license are ready, run from `library/qivi`:

```sh
npm publish --access public
```

Follow npm's authentication/2FA prompts. Verify the published version and installation before announcing availability. Update version and release notes according to public API compatibility; avoid silently replacing existing version numbers.

## Branding and sponsorship

The README uses theme-selected transparent captures. Update both when the avatar or banner changes. The capture source and provenance are documented in `docs/assets/README.md`.

Repository funding is configured in `.github/FUNDING.yml`. Project links use https://github.com/yogeshhrathod/qivi and https://github.com/sponsors/yogeshhrathod. Keep these consistent across demo and documentation.
