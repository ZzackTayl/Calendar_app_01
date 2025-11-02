# Flutter wrapper
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.** { *; }
-keep class io.flutter.util.** { *; }
-keep class io.flutter.view.** { *; }
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }

# Flutter Embedding
-keep class io.flutter.embedding.** { *; }
-keep class androidx.lifecycle.DefaultLifecycleObserver

# Firebase
-keepattributes Signature
-keepattributes *Annotation*
-keep class com.google.firebase.** { *; }

# Firestore
-keep class com.google.firebase.firestore.** { *; }
-dontwarn com.google.firebase.firestore.**

# Keep classes that are referenced in the manifest or used by the system
-keep public class * extends android.app.Activity
-keep public class * extends android.app.Application
-keep public class * extends android.app.Service
-keep public class * extends android.content.BroadcastReceiver
-keep public class * extends android.content.ContentProvider

# Keep the R.styleable and R.styleable$* classes
-keepclassmembers class **.R$* {
    public static <fields>;
}

# Keep the fields of the R class
-keepclassmembers class **.R {
    public static <fields>;
}

# Keep the methods of the BuildConfig class
-keepclassmembers class **.BuildConfig {
    public static <fields>;
}

# For native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# For custom components that are inflated
-keep public class * extends android.view.View {
    public <init>(android.content.Context);
    public <init>(android.content.Context, android.util.AttributeSet);
    public <init>(android.content.Context, android.util.AttributeSet, int);
}

# Keep custom application classes
-keep public class * extends android.app.Application

# For enumeration classes
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# Keep generic type information
-keepattributes Signature

# For view tag
-keep @androidx.annotation.Keep class *
-keepclasseswithmembers class * {
    @androidx.annotation.Keep <methods>;
}
-keepclasseswithmembers class * {
    @androidx.annotation.Keep <fields>;
}
-keepclasseswithmembers class * {
    @androidx.annotation.Keep <init>(...);
}

# Keep all classes in the app's package and subpackages
-keep class com.example.calendar_app.** { *; }

# Keep classes that are used by reflection
-keep class * implements io.flutter.plugin.common.PluginRegistry
-keep class * implements io.flutter.plugin.common.MethodChannel$MethodCallHandler
-keep class * implements io.flutter.plugin.common.EventChannel$StreamHandler
-keep class * implements io.flutter.app.FlutterApplication

# For Kotlin
-keep class kotlin.Metadata { *; }
-keep class kotlin.jvm.functions.** { *; }
-keep class kotlin.reflect.** { *; }
-dontwarn kotlin.reflect.**

# For Gson
-keepattributes Signature
-keepattributes *Annotation*
-keep class com.google.gson.** { *; }
-keep class your.package.models.** { *; }  # Replace with your model package

# For Retrofit
-keep class retrofit2.** { *; }
-dontwarn retrofit2.**
-keep class okhttp3.** { *; }
-dontwarn okhttp3.**

# For Okio
-keep class okio.** { *; }
-dontwarn okio.**

# For RxJava
-keep class io.reactivex.** { *; }
-keep class rx.** { *; }

# Keep names - Class protection
-keepclassmembers class * {
    public void onEvent*(***);
    public void OnEvent*(***);
}

# Keep names - Enum protection
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# For Jackson
-keep class org.codehaus.** { *; }
-dontwarn org.codehaus.**
-keep class com.fasterxml.** { *; }
-dontwarn com.fasterxml.**

# For encryption/crypto libraries
-keep class javax.crypto.** { *; }
-keep class java.security.** { *; }
-keep class org.bouncycastle.** { *; }
-dontwarn org.bouncycastle.**

# For connectivity
-keep class io.flutter.plugins.connectivity.ConnectivityBroadcastReceiver

# For image picker
-keep class io.flutter.plugins.imagepicker.ImagePickerDelegate

# For URL launcher
-keep class io.flutter.plugins.urllauncher.UrlLauncherPlugin

# For secure storage
-keep class com.it_nomads.fluttersecurestorage.** { *; }
-dontwarn com.it_nomads.fluttersecurestorage.**

# For permissions
-keep class com.baseflow.permissionhandler.** { *; }
-dontwarn com.baseflow.permissionhandler.**

# For contacts
-keep class io.flutter.plugins.contacts.ContactsPlugin

# For timezone
-keep class io.flutter.plugins.timezone.TimeZonePlugin

# For table calendar
-keep class com.apptreesoftware.** { *; }

# For Google services and sign-in
-keep class com.google.android.gms.** { *; }
-keep class com.google.firebase.** { *; }
-keep class io.flutter.plugins.googlesignin.** { *; }
-dontwarn com.google.android.gms.**
-dontwarn com.google.firebase.**

# For Google APIs
-keep class com.google.api.client.** { *; }
-dontwarn com.google.api.client.**

# For protobuf
-keep class com.google.protobuf.** { *; }
-dontwarn com.google.protobuf.**

# For UUID library
-keep class java.util.UUID { *; }

# Don't warn for Java reflection
-dontwarn java.lang.reflect.**

# For Flutter's FlutterJNI
-keep class io.flutter.embedding.engine.FlutterJNI { *; }

# Suppress warnings about missing dependencies
-dontwarn javax.annotation.**
-dontwarn com.google.errorprone.annotations.**
-dontwarn org.checkerframework.**

# Keep the Flutter wrapper classes
-keep class io.flutter.plugin.common.** { *; }
-keep class io.flutter.plugin.platform.** { *; }

# Keep all public classes of the application
-keep public class * {
    public protected *;
}

# For state management (Riverpod/BLoC)
-keep class **.*Provider { *; }
-keep class **.*Bloc { *; }
-keep class **.*Cubit { *; }
-keep class **.*State { *; }
-keep class **.*Event { *; }
-keep class **.*Model { *; }

# For Riverpod specifically
-keep class **.providers.** { *; }
-keep class **.*Repository { *; }
-keep class **.*UseCase { *; }
-keep class **.*DataSource { *; }

# For code generation (freezed/json_serializable)
-keep class **.*Freezed { *; }
-keep class **.*$* { *; }
-keep class **.*Generated { *; }
-keep @javax.annotation.processing.Generated class * { *; }
-keep @lombok.Generated class * { *; }

# For annotations
-keep @interface **.*Annotation*
-keep class **.*Annotation* { *; }
-keep @androidx.annotation.Keep class *
-keep @javax.annotation.processing.Generated class *

# For JSON serialization
-keep class **.json.** { *; }
-keep class **.g.** { *; }  # Generated code
-keep class **.*Json { *; }
-keep class **.*Dto { *; }

# Keep all classes in the domain and data layers for clean architecture
-keep class **.domain.** { *; }
-keep class **.data.** { *; }
-keep class **.core.** { *; }
-keep class **.presentation.** { *; }
-keep class **.ui.** { *; }
-keep class **.logic.** { *; }

# For dependency injection if using get_it or similar
-keep class **.di.** { *; }
-keep class **.injection.** { *; }
-keep class **.injection.** { *; }

# Keep the Flutter engine classes
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }
-keep class com.it_nomads.** { *; }  # For flutter_secure_storage
-keep class com.baseflow.** { *; }   # For permission_handler
-keep class com.apptreesoftware.** { *; }  # For table_calendar