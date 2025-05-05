package com.thehashss.securin;

import android.content.DialogInterface;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.os.Bundle;
import android.util.Log;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.EdgeToEdge;
import androidx.activity.result.ActivityResultLauncher;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.GravityCompat;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.drawerlayout.widget.DrawerLayout;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;

import com.google.android.material.navigation.NavigationView;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

import me.ibrahimsn.lib.OnItemSelectedListener;
import me.ibrahimsn.lib.SmoothBottomBar;
import com.bumptech.glide.Glide;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.database.ServerValue;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.database.FirebaseDatabase;
import com.google.firebase.database.DatabaseReference;
import com.journeyapps.barcodescanner.ScanContract;
import com.journeyapps.barcodescanner.ScanOptions;

public class MainActivity extends AppCompatActivity implements NavigationView.OnNavigationItemSelectedListener {
    private DrawerLayout drawerLayout;
    private NavigationView navigationView;
    private VehicleViewModel vehicleViewModel;

    private VehiclePreferences vehiclePreferences;
    String selectedVehicleId = null;



    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
        EdgeToEdge.enable(this);
        setContentView(R.layout.activity_main);

        vehiclePreferences = new VehiclePreferences(this);
        vehicleViewModel = new ViewModelProvider(this).get(VehicleViewModel.class);


        drawerLayout = findViewById(R.id.drawer_layout);
        navigationView = findViewById(R.id.nav_view);


        // Load profile
        String profileImage = getIntent().getStringExtra("profile_image");
        String name = getIntent().getStringExtra("name");
        String email = getIntent().getStringExtra("email");

        NavigationView navigationView = findViewById(R.id.nav_view);
        View headerView = navigationView.getHeaderView(0);
        ImageView profileImageView = headerView.findViewById(R.id.profileImage);
        TextView nameTextView = headerView.findViewById(R.id.nameTV);
        TextView emailTextView = headerView.findViewById(R.id.mailTV);

        Glide.with(this).load(profileImage).into(profileImageView);
        nameTextView.setText(name);
        emailTextView.setText(email);


        // Set the NavigationItemSelectedListener to handle menu clicks
        navigationView.setNavigationItemSelectedListener(this);
        populateSidebarWithSavedVehicleIds();


        String defaultVehicleId = vehiclePreferences.getSelectedVehicleId();
        if (defaultVehicleId != null) {
            vehicleViewModel.setSelectedVehicleId(defaultVehicleId);
            Toast.makeText(this, "Default vehicle: " + defaultVehicleId, Toast.LENGTH_SHORT).show();
        } else {
            Toast.makeText(this, "Belum ada kendaraan! Silahkan scan QR", Toast.LENGTH_SHORT).show();
        }


        //  hamburger icon click listener
        ImageView hamburgerIcon = findViewById(R.id.hamburger_icon);
        hamburgerIcon.setOnClickListener(v -> drawerLayout.openDrawer(GravityCompat.START));

        // buat Bottom Navigationnya guys
        SmoothBottomBar bottomBar = findViewById(R.id.bottomBar);
        loadFragment(new HomeFragment()); // Load default fragment

        // bottom Navigation Handler
        bottomBar.setOnItemSelectedListener((OnItemSelectedListener) i -> {
            Fragment selectedFragment;
            switch (i) {
                case 0:
                    selectedFragment = new HomeFragment();
                    break;
                case 1:
                    selectedFragment = new MapsFragment();
//                    addVehicle("supra");
                    break;
                case 2:
                    selectedFragment = new ProfileFragment();
//                    addVehicle("revo");
                    break;
                default:
                    return false;
            }
            loadFragment(selectedFragment);
            return true;
        });


        findViewById(R.id.qr_button).setOnClickListener(v ->
        {
            scanQr();
        });

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main), (v, insets) -> {
            Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom);
            return insets;
        });


        FirebaseMessaging.getInstance().getToken()
                .addOnCompleteListener(task -> {
                    if (!task.isSuccessful()) {
                        Log.w("FCM", "Fetching FCM registration token failed", task.getException());
                        return;
                    }

                    // ambik token fcm nua
                    String token = task.getResult();
                    Log.d("FCM", "Token: " + token);
                });

        FirebaseMessaging.getInstance().getToken()
                .addOnCompleteListener(task -> {
                    if (!task.isSuccessful()) {
                        Log.w("FCM", "Token fetch failed", task.getException());
                        return;
                    }
                    String token = task.getResult();
                    Log.d("FCM", "Token: " + token);
                    saveTokenToDatabase(token);
                });
    }

    private void saveTokenToDatabase(String token) {
        String vehicleId = vehiclePreferences.getSelectedVehicleId();
        String userId    = FirebaseAuth.getInstance().getUid();
        if (vehicleId == null || userId == null) {
            Log.w("FCM", "Cannot save token: missing vehicleId or user not signed in");
            return;
        }

        DatabaseReference ref = FirebaseDatabase
                .getInstance()
                .getReference("settings")
                .child(vehicleId)
                .child("fcm_token")
                .child(userId);

        Map<String,Object> data = new HashMap<>();
        data.put("token", token);
        data.put("updatedAt", ServerValue.TIMESTAMP);

        ref.setValue(data)
                .addOnSuccessListener(a ->
                        Log.d("FCM", "Saved token under settings/"
                                + vehicleId + "/fcm_token/" + userId))
                .addOnFailureListener(e ->
                        Log.e("FCM", "Failed to save token", e));
    }

    @Override
    public boolean onNavigationItemSelected(MenuItem item) {
        int id = item.getItemId();


        if (id == R.id.nav_logout) {
            new AlertDialog.Builder(this)
                    .setTitle("Konfirmasi Logout")
                    .setMessage("Apakah Anda yakin ingin logout? Semua data akan dihapus.")
                    .setPositiveButton("Logout", (dialog, which) -> {
                        // Hapus semua preferensi
                        vehiclePreferences.clearVehicleIds();

                        // Logout dari Firebase
                        FirebaseAuth.getInstance().signOut();

//                        // Hapus semua data aplikasi
//                        clearAppData();

                        // Kembali ke SplashScreen
                        Intent intent = new Intent(MainActivity.this, SplashScreen.class);
                        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
                        startActivity(intent);
                        finish();
                    })
                    .setNegativeButton("Batal", null)
                    .show();
//            vehiclePreferences.clearVehicleIds();
//            populateSidebarWithSavedVehicleIds();
//            navigationView.invalidate();
//            Toast.makeText(this, "Logout Berhasil", Toast.LENGTH_SHORT).show();
        } else {
            // Ambil vehicleId dari judul menu
            selectedVehicleId = item.getTitle().toString();
            vehiclePreferences.setSelectedVehicleId(selectedVehicleId);
            vehicleViewModel.setSelectedVehicleId(selectedVehicleId);
            Toast.makeText(this, "Selected: " + selectedVehicleId, Toast.LENGTH_SHORT).show();
        }

        drawerLayout.closeDrawer(GravityCompat.START);
        return true;
    }


    private void loadFragment(Fragment fragment) {
        getSupportFragmentManager()
                .beginTransaction()
                .replace(R.id.frame_layout, fragment)
                .commit();
    }

    private void populateSidebarWithSavedVehicleIds() {
        Set<String> vehicleIds = vehiclePreferences.getVehicleIds();
        Menu menu = navigationView.getMenu();

        menu.clear();

        int index = 0;
        if (vehicleIds != null && !vehicleIds.isEmpty()) {
            for (String vehicleId : vehicleIds) {
                MenuItem item = menu.add(Menu.NONE, index++, Menu.NONE, vehicleId);
                item.setIcon(R.drawable.ic_motorcycle);
            }
        }

        menu.add(Menu.NONE, R.id.nav_logout, Menu.NONE, "Logout").setIcon(R.drawable.ic_logout);
    }


    private void addVehicle(String newVehicleId) {
        vehiclePreferences.addVehicleId(newVehicleId);
        populateSidebarWithSavedVehicleIds();
    }

    private void scanQr() {
        ScanOptions options = new ScanOptions();
        options.setPrompt("Volume atas untuk nyalakan Flash");
        options.setBeepEnabled(true);
        options.setOrientationLocked(true);
        options.setCaptureActivity(CaptureAct.class);
        barLauncher.launch(options);
    }

    ActivityResultLauncher<ScanOptions> barLauncher = registerForActivityResult(new ScanContract(), result -> {

       if (result.getContents() != null) {
           AlertDialog.Builder  builder = new AlertDialog.Builder(MainActivity.this);
           builder.setTitle("Result");
           builder.setMessage(result.getContents());
           builder.setPositiveButton("OK", new DialogInterface.OnClickListener() {
               @Override
               public void onClick(DialogInterface dialogInterface, int i) {
                   selectedVehicleId = result.getContents();
                   addVehicle(selectedVehicleId);
                   vehiclePreferences.setSelectedVehicleId(selectedVehicleId);
                   vehicleViewModel.setSelectedVehicleId(selectedVehicleId);
                   dialogInterface.dismiss();
               }
           }).show();
       }
    });



    @Override
    public void onBackPressed() {
        if (drawerLayout.isDrawerOpen(GravityCompat.START)) {
            drawerLayout.closeDrawer(GravityCompat.START);
        } else {
            super.onBackPressed();
        }
    }
}
