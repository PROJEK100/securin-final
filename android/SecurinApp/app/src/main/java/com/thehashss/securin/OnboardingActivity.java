package com.thehashss.securin;

import android.animation.Animator;
import android.animation.AnimatorInflater;
import android.animation.AnimatorListenerAdapter;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

public class OnboardingActivity extends AppCompatActivity {
    String[] words = { "Ride", "Bike", "Life" };
    int interval = 2000;

    @Override
    protected void onCreate(Bundle s) {
        super.onCreate(s);
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
        setContentView(R.layout.onboarding);

        TextView dynamic = findViewById(R.id.dynamicText);
        Animator out = AnimatorInflater.loadAnimator(this, R.animator.flip_out);
        Animator in  = AnimatorInflater.loadAnimator(this, R.animator.flip_in);
        out.setTarget(dynamic);
        in .setTarget(dynamic);

        Handler h = new Handler(Looper.getMainLooper());

        h.postDelayed(new Runnable() {
            int idx = 1;
            @Override
            public void run() {
                out.addListener(new AnimatorListenerAdapter() {
                    @Override
                    public void onAnimationEnd(Animator a) {
                        dynamic.setText(words[idx]);
                        in.start();
                        out.removeListener(this);
                    }
                });
                out.start();
                idx = (idx + 1) % words.length;
                h.postDelayed(this, interval);
            }
        }, interval);

        h.postDelayed(() -> {
            startActivity(new Intent(this, SplashScreen.class));
            finish();
        }, words.length * interval);
    }
}
