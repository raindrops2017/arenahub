const { withAppBuildGradle, withProjectBuildGradle, withAndroidManifest } = require("@expo/config-plugins");

/**
 * Expo Config Plugin for Paymob SDK:
 * 1. Enables Android DataBinding in app/build.gradle
 * 2. Adds Paymob SDK local maven repository to root build.gradle
 * 3. Handles enableOnBackInvokedCallback manifest merger collision
 */
module.exports = function withPaymobDataBinding(config) {
  // Add dataBinding = true to app/build.gradle
  config = withAppBuildGradle(config, (config) => {
    if (config.modResults.language === "groovy") {
      const dataBindingSnippet = `
android {
    buildFeatures {
        dataBinding = true
    }
}
`;
      if (
        !config.modResults.contents.includes("dataBinding = true") &&
        !config.modResults.contents.includes("dataBinding true")
      ) {
        config.modResults.contents += dataBindingSnippet;
      }
    }
    return config;
  });

  // Add Paymob SDK local maven repo to root build.gradle
  config = withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === "groovy") {
      const paymobRepoSnippet = `maven { url "\${rootDir}/../node_modules/paymob-reactnative/android/libs" }`;
      if (!config.modResults.contents.includes("paymob-reactnative/android/libs")) {
        config.modResults.contents = config.modResults.contents.replace(
          /allprojects\s*\{\s*repositories\s*\{/,
          `allprojects {\n    repositories {\n        ${paymobRepoSnippet}`
        );
      }
    }
    return config;
  });

  // Handle manifest merger conflict with paymob-reactnative
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    manifest.$ = manifest.$ || {};
    manifest.$["xmlns:tools"] = "http://schemas.android.com/tools";
    if (manifest && manifest.application && manifest.application[0]) {
      const app = manifest.application[0];
      app.$ = app.$ || {};
      app.$["tools:replace"] = app.$["tools:replace"]
        ? `${app.$["tools:replace"]},android:enableOnBackInvokedCallback`
        : "android:enableOnBackInvokedCallback";
    }
    return config;
  });

  return config;
};
