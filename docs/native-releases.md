# Native game releases

`.github/workflows/build-native-releases.yml` builds all eight games from the
checked-in Pangea Ports submodule revision, with recursive dependencies:
Billy Frontier, Bugdom, Bugdom 2, Cro-Mag Rally, Mighty Mike, Nanosaur,
Nanosaur 2, and Otto Matic.

Each game produces a Linux AppImage, macOS DMG, Windows ZIP, and Android APK.
Native packages are freshly compiled on every run; finished package caches
are deliberately avoided so a release cannot reuse binaries from another
source revision.

Publishing a GitHub release triggers the native builds for its tag, including
prereleases. After all four platform matrices succeed, the publishing job
downloads only native artifacts and validates all 32 expected nonempty files
before attaching them to that existing release. It has `contents: write`;
build jobs have read-only repository access. Builds and publishing failures
are visible in the workflow run, and artifacts remain available for diagnosis.
The release itself already exists while builds run; its packages appear after
successful compilation and validation.

To retry publication, rerun the failed workflow or manually dispatch the
workflow **against the release tag**. Manual runs on tags upload to an
existing release and replace assets with matching names. Manual runs on
branches build the WASM/site and native downloads without publishing a release.
Release builds do not deploy Pages or wait for the frontend/WASM build.

Pushes to `main` continue to build the WASM/site and all native packages, then
deploy Pages with the same validated 32 packages in `downloads/<port-name>/`.
Release runs cannot be cancelled by a concurrent `main` deployment.

The Android projects currently generate **unsigned release APKs**. These are
published as compiled artifacts; they require signing before installation.
macOS packages are not signed or notarized by this workflow either.

The workflows inside `games/pangea-ports/.github/workflows/` belong to the
separate Pangea Ports repository. GitHub does not execute them as workflows of
this parent repository; this root workflow owns its release coverage.

Local validation:

```sh
python3 -m unittest discover -s scripts -p 'test_native_packages.py'
bash scripts/validate-native-packages.sh /path/to/downloaded-native-packages
```
