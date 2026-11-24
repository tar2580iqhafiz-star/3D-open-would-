package com.verdantisle.sandbox

import android.annotation.SuppressLint
import android.os.Bundle
import android.view.View
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.webkit.WebViewAssetLoader
import org.json.JSONObject

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var adMobManager: AdMobRewardedManager

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        adMobManager = AdMobRewardedManager(
            context = this,
            defaultRewardedAdUnitId = BuildConfig.ADMOB_REWARDED_AD_UNIT_ID,
            allowTestAds = BuildConfig.ADMOB_USE_TEST_ADS
        )
        adMobManager.initializeAndPreload()

        webView = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.databaseEnabled = true
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            settings.setSupportZoom(false)
            settings.builtInZoomControls = false
            settings.displayZoomControls = false
            settings.mediaPlaybackRequiresUserGesture = false
            settings.cacheMode = WebSettings.LOAD_DEFAULT
            webChromeClient = WebChromeClient()

            val assetLoader = WebViewAssetLoader.Builder()
                .addPathHandler("/", WebViewAssetLoader.AssetsPathHandler(this@MainActivity))
                .build()

            webViewClient = object : WebViewClient() {
                override fun shouldInterceptRequest(
                    view: WebView,
                    request: WebResourceRequest
                ): WebResourceResponse? = assetLoader.shouldInterceptRequest(request.url)
            }

            addJavascriptInterface(AdMobBridge(), "AndroidAdMob")
        }

        setContentView(webView)
        hideSystemBars()

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    moveTaskToBack(true)
                }
            }
        })

        // Loads bundled production Vite build assets placed in android/app/src/main/assets/
        webView.loadUrl("https://appassets.androidplatform.net/index.html")
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
        adMobManager.preloadRewardedAd()
        hideSystemBars()
    }

    override fun onPause() {
        webView.onPause()
        super.onPause()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) hideSystemBars()
    }

    @Suppress("DEPRECATION")
    private fun hideSystemBars() {
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                or View.SYSTEM_UI_FLAG_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            )
    }

    override fun onDestroy() {
        webView.removeJavascriptInterface("AndroidAdMob")
        webView.destroy()
        super.onDestroy()
    }

    inner class AdMobBridge {
        @JavascriptInterface
        fun isRewardedAdReady(): Boolean = adMobManager.isAdReady()

        @JavascriptInterface
        fun isTestMode(): Boolean = BuildConfig.ADMOB_USE_TEST_ADS

        @JavascriptInterface
        fun preloadRewardedAd(adUnitId: String) {
            runOnUiThread {
                adMobManager.preloadRewardedAd(adUnitId)
            }
        }

        @JavascriptInterface
        fun showRewardedAd(adUnitId: String, requestId: String) {
            runOnUiThread {
                adMobManager.showRewardedAd(
                    activity = this@MainActivity,
                    requestedUnitId = adUnitId
                ) { outcome, rewardAmount, rewardType ->
                    val js = buildString {
                        append("window.__onNativeRewardedAdResult && window.__onNativeRewardedAdResult(")
                        append(JSONObject.quote(requestId)).append(',')
                        append(JSONObject.quote(outcome)).append(',')
                        append(rewardAmount).append(',')
                        append(JSONObject.quote(rewardType))
                        append(");")
                    }
                    webView.post {
                        webView.evaluateJavascript(js, null)
                    }
                }
            }
        }
    }
}
