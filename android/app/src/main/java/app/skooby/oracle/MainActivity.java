package app.skooby.oracle;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

public final class MainActivity extends Activity {
    private static final String LOCAL_ORACLE = "file:///android_asset/oracle.html";
    private static final String LIVE_TRACKER = "https://skooby.app/tracker";
    private WebView webView;
    private boolean local = true;

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(6, 16, 12));
        getWindow().setNavigationBarColor(Color.rgb(6, 16, 12));

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.rgb(6, 16, 12));
        if (Build.VERSION.SDK_INT >= 30) {
            root.setOnApplyWindowInsetsListener((view, insets) -> {
                android.graphics.Insets sys = insets.getInsets(WindowInsets.Type.systemBars());
                view.setPadding(sys.left, sys.top, sys.right, sys.bottom);
                return insets;
            });
        } else {
            root.setFitsSystemWindows(true);
        }
        LinearLayout bar = new LinearLayout(this);
        bar.setGravity(Gravity.CENTER_VERTICAL);
        bar.setPadding(dp(12), dp(8), dp(12), dp(8));
        TextView title = new TextView(this);
        title.setText("SKOOBY  /  ALPHA ORACLE");
        title.setTextSize(13);
        title.setTextColor(Color.rgb(163, 230, 53));
        title.setTypeface(null, 1);
        bar.addView(title, new LinearLayout.LayoutParams(0, dp(46), 1));
        Button oracleButton = button("ORACLE");
        Button trackerButton = button("LIVE TRACKER");
        bar.addView(oracleButton);
        bar.addView(trackerButton);
        root.addView(bar);

        webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);   // Required only for trusted app asset and the Skooby site.
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);    // Only needed for local, bundled Oracle interface.
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        if (Build.VERSION.SDK_INT >= 26) settings.setSafeBrowsingEnabled(true);
        webView.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (!"https".equalsIgnoreCase(uri.getScheme()) || !"skooby.app".equalsIgnoreCase(uri.getHost())) {
                    if ("https".equalsIgnoreCase(uri.getScheme()) && request.isForMainFrame()) {
                        try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); } catch (Exception ignored) { }
                    }
                    return true;
                }
                return false;
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, android.webkit.WebResourceError error) {
                if (request.isForMainFrame()) Toast.makeText(MainActivity.this, "Live tracker unavailable. Oracle remains available offline.", Toast.LENGTH_LONG).show();
            }
        });
        root.addView(webView, new LinearLayout.LayoutParams(-1, 0, 1));
        setContentView(root);
        oracleButton.setOnClickListener(v -> showOracle());
        trackerButton.setOnClickListener(v -> showTracker());
        if (savedInstanceState == null) showOracle();
        else { local = savedInstanceState.getBoolean("local", true); if (local) showOracle(); else showTracker(); }
    }
    private int dp(int value) { return Math.round(getResources().getDisplayMetrics().density * value); }
    private Button button(String label) {
        Button button = new Button(this);
        button.setText(label);
        button.setTextSize(10);
        button.setAllCaps(false);
        button.setTextColor(Color.WHITE);
        button.setBackgroundTintList(android.content.res.ColorStateList.valueOf(Color.rgb(24, 49, 35)));
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(-2, dp(46));
        params.leftMargin = dp(4);
        button.setLayoutParams(params);
        return button;
    }
    private void showOracle() { local = true; webView.loadUrl(LOCAL_ORACLE); }
    private void showTracker() { local = false; webView.loadUrl(LIVE_TRACKER); }
    @Override public void onBackPressed() {
        if (webView.canGoBack() && !local) webView.goBack();
        else if (!local) showOracle();
        else super.onBackPressed();
    }
    @Override protected void onSaveInstanceState(Bundle out) { out.putBoolean("local", local); super.onSaveInstanceState(out); }
    @Override protected void onDestroy() { if (webView != null) webView.destroy(); super.onDestroy(); }
}
