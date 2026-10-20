# Android button screenshots

The screenshot harness builds all eight Android games and attempts a full
gameplay capture with their production SDL touch overlay. It also captures each
game's controls independently on a neutral background using the actual
`TouchControlsDraw.c`, `TouchControls.h`, and `TouchLayout.h` implementation.
Button labels are read from that game's production `kTouchButtons` array.
Mighty Mike exercises the SDL renderer; the other games exercise GLES 3.

These focused captures are **controls previews, not gameplay screenshots**.
They run the shared production component in its own native library, so a game
startup failure does not prevent inspecting its buttons. The preview owns a
fixture input profile and verifies press/release at every action's computed
touch target. This checks that relocated camera buttons retain their original
action indices; it does not exercise gameplay bindings or the game's
OpenGL compatibility layer. Neither mode changes the normal launcher or the
appearance of the controls.
The debug launcher extracts the APK's bundled assets into its private `Data`
directory and selects that working directory before calling the game. This
supports the ports' filesystem-based asset lookup without changing Pomme.

The current parent repository pins Pangea Ports at `b2ec9fea`, which does not
contain `shared/android`. The touch controls reviewed here are on
`lua-cross-level-updates` (reviewed at
`3a20b972b49523ab71561f5c681ba9d6f4478b5a`). Use a separate ports checkout with
that implementation. The build script rejects revisions without it.

## GitHub Actions

Run **Android Button Screenshots** from the Actions tab. `ports_ref` accepts a
branch, tag, or commit in `LachlanBWWright/Pangea-Ports`. The prepare job resolves
it to one commit so all eight jobs use the same revision.

Each matrix job builds a signed debug APK for x86_64, starts an API 34 Pixel 6
emulator, attempts gameplay, captures the controls preview, and uploads an
`android-buttons-<game>` artifact. Artifacts are retained even when gameplay
fails. A failed gameplay attempt still fails that matrix job, even if the
controls preview succeeds.
Native builds use Java 17, Gradle 8.11.1, NDK 27.0.12077973, and CMake 3.31.6.
The screenshot-only Gradle configuration selects the newer CMake because the
branch's Lua FetchContent configuration needs features absent from CMake 3.22.
It also links GLES 3, required by the existing touch renderer, for ports whose
native configuration still links only GLES 2.

The renderer, layout, and touch-input runtime are taken from this checkout's
`games/pangea-ports/shared/android`, while `ports_ref` supplies the game and
remaining shared dependencies. The screenshot build replaces the old drawing
source and preincludes the revised runtime, with its implementation enabled
only for each game's input source. The standalone preview uses the same code.
This keeps visual positions and touch targets aligned. Camera, Cam L, Cam R,
and Rear controls sit below the menu icons at the top right; gameplay actions
occupy at most two rows with the minimum number of columns. Button faces are
translucent while labels remain opaque. Set
`PANGEA_TOUCH_CONTROLS_ROOT` locally to select a different shared implementation.
Each built APK has a `-controls.sha256` sidecar recording the selected sources;
captures retain it when available.
The workflow runs on manual dispatch and does not deploy or publish APKs.

## Local capture

Install those toolchain versions, Python 3, and the image dependency:

```sh
python3 -m pip install -r scripts/android-screenshot-harness/requirements.txt
```

Start a landscape-capable Android emulator with GLES 3 support. The CI workflow
uses an API 34 `google_apis;x86_64` system image. Select it explicitly using the
serial from `adb devices`:

```sh
export ANDROID_SERIAL=emulator-5554
bash scripts/generate-android-button-screenshots.sh /path/to/Pangea-Ports .tmp/android-buttons
```

Append a port directory name, such as `Bugdom2-Android`, to capture one game.
`GRADLE_BIN` and `ADB_BIN` can select tools outside `PATH`. The output includes
build logs, debug APKs, and the resolved game commit. The local command expects
a Git checkout so that the recorded revision is reliable.

To recapture an already built screenshot APK:

```sh
ANDROID_SERIAL=emulator-5554 bash scripts/capture-android-buttons.sh \
  Bugdom2-Android .tmp/android-buttons/apks/Bugdom2-Android.apk .tmp/android-buttons/gameplay
```

To capture only the production controls preview, supply the settling time and
the same ports source directory as the fourth and fifth arguments:

```sh
ANDROID_SERIAL=emulator-5554 bash scripts/capture-android-buttons.sh \
  Bugdom2-Android .tmp/android-buttons/apks/Bugdom2-Android.apk \
  .tmp/android-buttons/controls 3 /path/to/Pangea-Ports
```

The optional final argument is the settling time in seconds (default 20,
maximum 120). Time-based settling allows fades and level loading to finish;
it does not make animated gameplay pixel deterministic.

## Output and validation

Successful captures in `gameplay/` and `controls/` produce:

- `<game>.png`: the full Android screen.
- `<game>-buttons.png`: an unscaled crop of the lower half, including movement
  and action controls.
- `<game>-actions.png`: an unscaled crop of the lower-right action bank.
- `<game>-utility.png`: an unscaled crop of the top-right menu and camera controls.
- `<game>-capture.txt` and `<game>-apk.sha256`: launch settings and APK identity.
- `<game>-logcat.txt` and `<game>-activity.txt`: diagnostics, retained on failure.

Capture fails when the process exits, reports a startup alert, its activity is not resumed, or the image
is portrait, corrupt, or nearly blank. These checks catch capture failures;
they do not prove that a game loaded the intended terrain or that every button
works. Review the full screen alongside its control crops.
Startup alerts are retained as `<game>-failure.png` rather than being passed
off as successful screenshots. Native crashes retain logs; the launcher screen
is not captured as a substitute. `<game>-status.txt` records both capture exit
codes. The debug launcher fixes landscape orientation and suppresses Android's
fullscreen tutorial only for the capture session.

The initial API 34 emulator run at `3a20b972` reached gameplay in Bugdom 2.
Billy Frontier, Cro-Mag Rally, Nanosaur, and Otto Matic stopped on GL errors;
Bugdom stopped on a spline assertion; Mighty Mike stopped on a debug-file
write error. Nanosaur 2's native crash was traced to `glGetBooleanv` writing a
four-component color mask into a one-element buffer in its compatibility
layer. These are full-game blockers, separate from the shared-renderer previews.

```sh
python3 -m unittest discover -s scripts -p 'test_android_button_*.py'
```
