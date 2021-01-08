package com.quiz2;

import com.facebook.react.ReactActivity;
import org.devio.rn.splashscreen.SplashScreen;
import android.os.Bundle;
import com.facebook.react.ReactActivity;

public class MainActivity extends ReactActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        SplashScreen.show(this, R.style.SplashStatusBarTheme);
        super.onCreate(savedInstanceState);
    }


    @Override
    protected String getMainComponentName() {
        return "quiz2";
    }
}
