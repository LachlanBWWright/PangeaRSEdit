#include <jni.h>
#include <stdlib.h>
#include <unistd.h>

JNIEXPORT jboolean JNICALL
Java_io_pangea_screenshots_ScreenshotActivity_nativeSetWorkingDirectory(
    JNIEnv* env, jclass activity, jstring path)
{
    (void)activity;
    const char* directory = (*env)->GetStringUTFChars(env, path, NULL);
    if (!directory) return JNI_FALSE;
    int result = chdir(directory);
    if (result == 0) result = setenv("XDG_CONFIG_HOME", directory, 1);
    (*env)->ReleaseStringUTFChars(env, path, directory);
    return result == 0 ? JNI_TRUE : JNI_FALSE;
}
