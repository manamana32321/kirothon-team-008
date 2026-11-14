package win.json_server.gymcall;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.media.AudioAttributes;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.core.app.ServiceCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Calendar;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

public class AlarmWatchService extends Service {
    private static final String BASE = "https://gymcall.json-server.win";
    private static final String CHANNEL = "alarm_watch";
    private static final int POLL_SECONDS = 10;

    private final Handler main = new Handler(Looper.getMainLooper());
    private ScheduledExecutorService pool;
    private WindowManager windowManager;
    private View overlay;
    private Ringtone ringtone;
    private Vibrator vibrator;

    @Override
    public void onCreate() {
        super.onCreate();
        windowManager = (WindowManager) getSystemService(Context.WINDOW_SERVICE);
        vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        startAsForeground();
        if (pool == null) {
            pool = Executors.newSingleThreadScheduledExecutor();
            pool.scheduleWithFixedDelay(this::poll, 0, POLL_SECONDS, TimeUnit.SECONDS);
        }
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        if (pool != null) pool.shutdownNow();
        pool = null;
        main.post(this::hideOverlay);
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void startAsForeground() {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        Notification.Builder builder;
        if (Build.VERSION.SDK_INT >= 26) {
            nm.createNotificationChannel(new NotificationChannel(CHANNEL, "알람 감시", NotificationManager.IMPORTANCE_MIN));
            builder = new Notification.Builder(this, CHANNEL);
        } else {
            builder = new Notification.Builder(this);
        }
        Notification notification = builder
                .setContentTitle("운동기")
                .setContentText("알람 시간을 지켜보는 중")
                .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                .setOngoing(true)
                .build();
        int type = Build.VERSION.SDK_INT >= 29 ? ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC : 0;
        ServiceCompat.startForeground(this, 1, notification, type);
    }

    private void poll() {
        try {
            String cookie = CookieManager.getInstance().getCookie(BASE);
            if (cookie == null) {
                main.post(this::hideOverlay);
                return;
            }
            JSONObject me = new JSONObject(request("GET", "/api/auth/me", cookie, null).body);
            JSONArray groups = me.optJSONArray("groups");
            if (me.isNull("user") || groups == null) {
                main.post(this::hideOverlay);
                return;
            }
            for (int i = 0; i < groups.length(); i++) {
                JSONObject entry = groups.getJSONObject(i);
                String groupId = entry.getString("groupId");
                String memberId = entry.getString("memberId");
                JSONObject group = new JSONObject(request("GET", "/api/groups/" + groupId, cookie, null).body);
                if (isRinging(group, memberId)) {
                    String name = group.optString("name", "");
                    main.post(() -> showOverlay(name, groupId, memberId));
                    return;
                }
            }
            main.post(this::hideOverlay);
        } catch (Exception ignored) {
        }
    }

    private boolean isRinging(JSONObject group, String memberId) throws Exception {
        if (group.isNull("alarmTime")) return false;
        JSONArray members = group.getJSONArray("members");
        String status = null;
        for (int i = 0; i < members.length(); i++) {
            JSONObject m = members.getJSONObject(i);
            if (memberId.equals(m.getString("id"))) status = m.getString("status");
        }
        if (!"pending".equals(status)) return false;
        String[] d = group.getString("date").split("-");
        String[] t = group.getString("alarmTime").split(":");
        Calendar at = Calendar.getInstance();
        at.set(Integer.parseInt(d[0]), Integer.parseInt(d[1]) - 1, Integer.parseInt(d[2]),
                Integer.parseInt(t[0]), Integer.parseInt(t[1]), 0);
        at.set(Calendar.MILLISECOND, 0);
        return System.currentTimeMillis() >= at.getTimeInMillis();
    }

    private void showOverlay(String groupName, String groupId, String memberId) {
        if (overlay != null) return;

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER);
        root.setPadding(64, 64, 64, 64);
        root.setBackgroundColor(Color.parseColor("#F01E0B3A"));

        TextView title = new TextView(this);
        title.setText("운동기 알람");
        title.setTextColor(Color.WHITE);
        title.setTextSize(36);
        title.setGravity(Gravity.CENTER);

        TextView sub = new TextView(this);
        sub.setText(groupName + "\n오늘 운동 가는지 정해야 화면이 풀려요");
        sub.setTextColor(Color.parseColor("#FDE047"));
        sub.setTextSize(18);
        sub.setGravity(Gravity.CENTER);
        sub.setPadding(0, 32, 0, 64);

        Button go = actionButton("간다", "#22D3EE");
        Button skip = actionButton("못 간다", "#EC4899");
        go.setOnClickListener(v -> respond(groupId, memberId, "going", go, skip));
        skip.setOnClickListener(v -> respond(groupId, memberId, "skipping", go, skip));

        root.addView(title);
        root.addView(sub);
        root.addView(go);
        root.addView(skip);

        int type = Build.VERSION.SDK_INT >= 26
                ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                : WindowManager.LayoutParams.TYPE_PHONE;
        WindowManager.LayoutParams lp = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.MATCH_PARENT,
                type,
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
                        | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS
                        | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON,
                PixelFormat.TRANSLUCENT);
        try {
            windowManager.addView(root, lp);
        } catch (Exception e) {
            return;
        }
        overlay = root;
        startAlarmSound();
    }

    private Button actionButton(String label, String color) {
        Button b = new Button(this);
        b.setText(label);
        b.setTextSize(22);
        b.setTextColor(Color.parseColor("#0B1020"));
        b.setBackgroundColor(Color.parseColor(color));
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, 180);
        lp.setMargins(0, 16, 0, 16);
        b.setLayoutParams(lp);
        return b;
    }

    private void respond(String groupId, String memberId, String choice, Button go, Button skip) {
        go.setEnabled(false);
        skip.setEnabled(false);
        Executors.newSingleThreadExecutor().execute(() -> {
            try {
                String cookie = CookieManager.getInstance().getCookie(BASE);
                String body = "{\"memberId\":\"" + memberId + "\",\"choice\":\"" + choice + "\"}";
                int code = request("POST", "/api/groups/" + groupId + "/respond", cookie, body).code;
                if (code == 201 || code == 409) {
                    main.post(this::hideOverlay);
                    return;
                }
            } catch (Exception ignored) {
            }
            main.post(() -> {
                go.setEnabled(true);
                skip.setEnabled(true);
            });
        });
    }

    private void hideOverlay() {
        stopAlarmSound();
        if (overlay == null) return;
        try {
            windowManager.removeView(overlay);
        } catch (Exception ignored) {
        }
        overlay = null;
    }

    private void startAlarmSound() {
        Uri uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
        ringtone = RingtoneManager.getRingtone(this, uri);
        if (ringtone != null) {
            ringtone.setAudioAttributes(new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build());
            if (Build.VERSION.SDK_INT >= 28) ringtone.setLooping(true);
            ringtone.play();
        }
        long[] pattern = {0, 500, 400};
        if (vibrator != null) {
            if (Build.VERSION.SDK_INT >= 26) {
                vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0));
            } else {
                vibrator.vibrate(pattern, 0);
            }
        }
    }

    private void stopAlarmSound() {
        if (ringtone != null) ringtone.stop();
        ringtone = null;
        if (vibrator != null) vibrator.cancel();
    }

    private static final class Response {
        final int code;
        final String body;

        Response(int code, String body) {
            this.code = code;
            this.body = body;
        }
    }

    private Response request(String method, String path, String cookie, String json) throws Exception {
        HttpURLConnection conn = (HttpURLConnection) new URL(BASE + path).openConnection();
        conn.setRequestMethod(method);
        conn.setConnectTimeout(8000);
        conn.setReadTimeout(8000);
        conn.setRequestProperty("Cookie", cookie);
        if (json != null) {
            conn.setDoOutput(true);
            conn.setRequestProperty("Content-Type", "application/json");
            try (OutputStream out = conn.getOutputStream()) {
                out.write(json.getBytes(StandardCharsets.UTF_8));
            }
        }
        int code = conn.getResponseCode();
        InputStream in = code >= 400 ? conn.getErrorStream() : conn.getInputStream();
        ByteArrayOutputStream buf = new ByteArrayOutputStream();
        if (in != null) {
            byte[] chunk = new byte[4096];
            int n;
            while ((n = in.read(chunk)) > 0) buf.write(chunk, 0, n);
        }
        conn.disconnect();
        if (code >= 400 && !"POST".equals(method)) throw new Exception("http " + code);
        return new Response(code, buf.toString("UTF-8"));
    }
}
