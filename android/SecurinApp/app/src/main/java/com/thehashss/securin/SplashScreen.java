package com.thehashss.securin;

import android.content.Intent;
import android.os.Bundle;
import android.view.WindowManager;
import android.view.animation.Animation;
import android.view.animation.AnimationUtils;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.result.ActivityResult;
import androidx.activity.result.ActivityResultCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;

import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.SignInButton;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.Task;
import com.google.firebase.FirebaseApp;
import com.google.firebase.auth.AuthCredential;
import com.google.firebase.auth.AuthResult;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.GoogleAuthProvider;

public class SplashScreen extends AppCompatActivity {
    ImageView LogoSplashGps, LogoSplash;
    TextView textJudul, textDeskripsi, textSubDeskripsi;
    Animation Top_Animation, Bottom_Animation, Left_Animation, Fade_Animation;
    SignInButton googleSignInButton;
    private FirebaseAuth auth;
    private GoogleSignInClient googleSignInClient;

    private final ActivityResultLauncher<Intent> activityResultLauncher = registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(),
            new ActivityResultCallback<ActivityResult>() {
                @Override
                public void onActivityResult(ActivityResult result) {
                    if (result.getResultCode() == RESULT_OK) {
                        Task<GoogleSignInAccount> accountTask = GoogleSignIn.getSignedInAccountFromIntent(result.getData());
                        try {
                            GoogleSignInAccount signInAccount = accountTask.getResult(ApiException.class);
                            AuthCredential authCredential = GoogleAuthProvider.getCredential(signInAccount.getIdToken(), null);
                            auth.signInWithCredential(authCredential).addOnCompleteListener(new OnCompleteListener<AuthResult>() {
                                @Override
                                public void onComplete(@NonNull Task<AuthResult> task) {
                                    if (task.isSuccessful()) {
                                        Intent intent = new Intent(SplashScreen.this, MainActivity.class);
                                        intent.putExtra("profile_image", auth.getCurrentUser().getPhotoUrl().toString());
                                        intent.putExtra("name", auth.getCurrentUser().getDisplayName());
                                        intent.putExtra("email", auth.getCurrentUser().getEmail());
                                        startActivity(intent);
                                        finish();
                                    } else {
                                        Toast.makeText(SplashScreen.this, "Failed to sign in", Toast.LENGTH_SHORT).show();
                                    }
                                }
                            });
                        } catch (ApiException e) {
                            e.printStackTrace();
                        }
                    }
                }
            });

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN,
                WindowManager.LayoutParams.FLAG_FULLSCREEN);
        setContentView(R.layout.activity_splash_screen);

        LogoSplash = findViewById(R.id.logo_splash);
        LogoSplashGps = findViewById(R.id.logo_satelit);
        textJudul = findViewById(R.id.textutama);
        textDeskripsi = findViewById(R.id.text_deskripsi);
        textSubDeskripsi = findViewById(R.id.text_subdeskripsi);
        googleSignInButton = findViewById(R.id.btn_google_signin);

        Top_Animation = AnimationUtils.loadAnimation(this, R.anim.topanim);
        Left_Animation = AnimationUtils.loadAnimation(this, R.anim.leftanim);
        Bottom_Animation = AnimationUtils.loadAnimation(this, R.anim.bottomanim);
        Fade_Animation = AnimationUtils.loadAnimation(this, R.anim.fadeanim);

        LogoSplash.setAnimation(Top_Animation);
        LogoSplashGps.setAnimation(Left_Animation);
        textJudul.setAnimation(Bottom_Animation);
        textDeskripsi.setAnimation(Bottom_Animation);
        textSubDeskripsi.setAnimation(Bottom_Animation);
        googleSignInButton.setAnimation(Fade_Animation);

        FirebaseApp.initializeApp(this);
        auth = FirebaseAuth.getInstance();

        // Configure Google Sign-In
        GoogleSignInOptions googleSignInOptions = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestIdToken(getString(R.string.default_web_client_id))
                .requestEmail()
                .build();
        googleSignInClient = GoogleSignIn.getClient(this, googleSignInOptions);

        if (auth.getCurrentUser() != null) {
            navigateToMainActivity();
        }

        // Initialize Google Sign-In Button
        googleSignInButton.setOnClickListener(view -> initiateGoogleSignIn());
    }

    private void initiateGoogleSignIn() {
        Intent signInIntent = googleSignInClient.getSignInIntent();
        activityResultLauncher.launch(signInIntent);
    }

    private void navigateToMainActivity() {
        Intent intent = new Intent(SplashScreen.this, MainActivity.class);
        intent.putExtra("profile_image", auth.getCurrentUser().getPhotoUrl().toString());
        intent.putExtra("name", auth.getCurrentUser().getDisplayName());
        intent.putExtra("email", auth.getCurrentUser().getEmail());
        startActivity(intent);
        finish();
    }
}
