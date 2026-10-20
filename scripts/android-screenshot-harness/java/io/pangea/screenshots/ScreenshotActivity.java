package io.pangea.screenshots;

import android.content.pm.ActivityInfo;
import android.util.Log;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import org.libsdl.app.SDLActivity;

public final class ScreenshotActivity extends SDLActivity {
    private static native boolean nativeSetWorkingDirectory(String path);

    @Override
    public void setRequestedOrientation(int requestedOrientation) {
        super.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE);
    }

    @Override
    protected void main() {
        if (getIntent().getBooleanExtra("pangeaControlsOnly", false)) {
            super.main();
            return;
        }
        if (!prepareAssets("", new File(getFilesDir(), "Data"))) return;
        if (!nativeSetWorkingDirectory(getFilesDir().getAbsolutePath())) {
            Log.e("PangeaScreenshot", "Could not select the private asset directory");
            return;
        }
        Log.i("PangeaScreenshot", "Bundled assets ready; launching the production game");
        super.main();
    }

    @Override
    protected String getMainFunction() {
        return getIntent().getBooleanExtra("pangeaControlsOnly", false)
            ? "PangeaScreenshotControlsMain" : super.getMainFunction();
    }

    private boolean prepareAssets(String source, File destination) {
        try {
            String[] children = getAssets().list(source);
            if (children == null) return false;
            if (children.length == 0) {
                try (InputStream input = getAssets().open(source)) {
                    Files.copy(input, destination.toPath(), StandardCopyOption.REPLACE_EXISTING);
                }
                return true;
            }
            Files.createDirectories(destination.toPath());
            for (String child : children) {
                String path = source.isEmpty() ? child : source + "/" + child;
                if (!prepareAssets(path, new File(destination, child))) return false;
            }
            return true;
        } catch (IOException error) {
            Log.e("PangeaScreenshot", "Could not prepare bundled asset: " + source, error);
            return false;
        }
    }

    @Override
    protected String[] getLibraries() {
        if (getIntent().getBooleanExtra("pangeaControlsOnly", false)) {
            return new String[] { "PangeaTouchScreenshot" };
        }
        String library = getIntent().getStringExtra("pangeaLibrary");
        return library == null ? super.getLibraries() : new String[] { library };
    }

    @Override
    protected String[] getArguments() {
        String[] arguments = getIntent().getStringArrayExtra("pangeaArguments");
        return arguments == null ? super.getArguments() : arguments;
    }
}
