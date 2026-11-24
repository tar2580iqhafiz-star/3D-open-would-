# Preserve Google Mobile Ads SDK & WebView JavascriptInterface bridge in release builds
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes JavascriptInterface
-keep class com.verdantisle.sandbox.MainActivity$AdMobBridge { *; }
-keep class com.google.android.gms.ads.** { *; }
-dontwarn com.google.android.gms.ads.**
