package win.json_server.gymcall;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;

import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static boolean askedOverlay = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getBridge().getWebView().addJavascriptInterface(new VibrateBridge(this), "GymcallNative");
    }

    @Override
    public void onResume() {
        super.onResume();
        startAlarmWatch();
    }

    private void startAlarmWatch() {
        if (Build.VERSION.SDK_INT >= 33
                && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 1001);
        }
        if (!Settings.canDrawOverlays(this)) {
            if (!askedOverlay) {
                askedOverlay = true;
                startActivity(new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        Uri.parse("package:" + getPackageName())));
            }
            return;
        }
        ContextCompat.startForegroundService(this, new Intent(this, AlarmWatchService.class));
    }
}
