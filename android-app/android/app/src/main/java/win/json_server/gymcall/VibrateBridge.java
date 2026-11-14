package win.json_server.gymcall;

import android.content.Context;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.webkit.JavascriptInterface;

public class VibrateBridge {
    private final Vibrator vibrator;

    public VibrateBridge(Context context) {
        vibrator = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
    }

    @JavascriptInterface
    public void vibrate(String pattern) {
        if (vibrator == null) return;
        String[] parts = pattern.split(",");
        long[] timings = new long[parts.length + 1];
        try {
            for (int i = 0; i < parts.length; i++) timings[i + 1] = Long.parseLong(parts[i].trim());
        } catch (NumberFormatException e) {
            return;
        }
        if (Build.VERSION.SDK_INT >= 26) {
            vibrator.vibrate(VibrationEffect.createWaveform(timings, -1));
        } else {
            vibrator.vibrate(timings, -1);
        }
    }
}
