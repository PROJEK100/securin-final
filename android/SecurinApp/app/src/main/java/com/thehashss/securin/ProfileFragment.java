package com.thehashss.securin;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.os.Bundle;
import android.provider.MediaStore;
import android.util.Base64;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;

import com.airbnb.lottie.LottieAnimationView;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.InetAddress;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class ProfileFragment extends Fragment {
    private ImageView imgPreview;
    private TextView tvStatus, cloudStatus;
    private Button btnCapture, btnSend;
    private LottieAnimationView uploadSuccess;

    private Bitmap lastBitmap;
    private String selectedVehicleId;

    private static final String BASE_ENDPOINT = "192.168.153.119";
    private static final String BASE_PORT = "4998";
    private static final String BASE_UPLOAD_URL = "http://" + BASE_ENDPOINT + ":" + BASE_PORT + "/";

    private VehicleViewModel vehicleViewModel;
    private ActivityResultLauncher<String> cameraPermLauncher;
    private ActivityResultLauncher<Intent> cameraLauncher;

    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // permission launcher
        cameraPermLauncher = registerForActivityResult(
                new ActivityResultContracts.RequestPermission(),
                granted -> {
                    if (granted) openCamera();
                    else Toast.makeText(getContext(),
                            "Camera permission is required",
                            Toast.LENGTH_SHORT).show();
                }
        );

        // camera capture launcher
        cameraLauncher = registerForActivityResult(
                new ActivityResultContracts.StartActivityForResult(),
                result -> {
                    if (!isAdded() || getView() == null) return;
                    if (result.getResultCode() == Activity.RESULT_OK
                            && result.getData() != null) {
                        Bundle extras = result.getData().getExtras();
                        Bitmap bmp = (Bitmap) extras.get("data");
                        if (bmp != null) {
                            lastBitmap = bmp;
                            imgPreview.setImageBitmap(lastBitmap);
                            btnSend.setEnabled(true);
                            btnCapture.setText("Retake");
                        }
                    }
                }
        );
    }

    @Nullable
    @Override
    public View onCreateView(
            @NonNull LayoutInflater inflater,
            @Nullable ViewGroup container,
            @Nullable Bundle savedInstanceState
    ) {
        // inflate layout
        return inflater.inflate(R.layout.fragment_profile, container, false);
    }

    @Override
    public void onViewCreated(
            @NonNull View view,
            @Nullable Bundle savedInstanceState
    ) {
        super.onViewCreated(view, savedInstanceState);

        // bind views
        imgPreview     = view.findViewById(R.id.imgPreview);
        tvStatus       = view.findViewById(R.id.upload_status);
        cloudStatus    = view.findViewById(R.id.cloud_status);
        btnCapture     = view.findViewById(R.id.btnCapture);
        btnSend        = view.findViewById(R.id.btnSend);
        uploadSuccess  = view.findViewById(R.id.upload_success);

        // initial state
        btnSend.setEnabled(false);
        uploadSuccess.setVisibility(View.GONE);

        // ViewModel
        vehicleViewModel = new ViewModelProvider(requireActivity())
                .get(VehicleViewModel.class);
        vehicleViewModel.getSelectedVehicleId()
                .observe(getViewLifecycleOwner(), id -> {
                    selectedVehicleId = id;
                    tvStatus.setText("IoT Devices Vehicle ID: " + (id != null ? id : "none"));
                });

        // button listeners
        btnCapture.setOnClickListener(v -> {
            uploadSuccess.setVisibility(View.GONE);
            if (selectedVehicleId == null) {
                Toast.makeText(getContext(),
                        "Please select a vehicle first",
                        Toast.LENGTH_SHORT).show();
            } else {
                attemptOpenCamera();
            }
        });

        btnSend.setOnClickListener(v -> uploadToServer());

        // check cloud ping once
        checkCloudStatus(BASE_ENDPOINT);
    }

    private void attemptOpenCamera() {
        if (!isAdded()) return;
        if (ContextCompat.checkSelfPermission(requireContext(),
                Manifest.permission.CAMERA)
                == PackageManager.PERMISSION_GRANTED) {
            openCamera();
        } else {
            cameraPermLauncher.launch(Manifest.permission.CAMERA);
        }
    }

    private void openCamera() {
        Intent cam = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
        cameraLauncher.launch(cam);
    }

    private void uploadToServer() {
        FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();
        String name = (user != null && user.getDisplayName() != null)
                ? user.getDisplayName() : "Unknown";

        if (name.isEmpty() || "Unknown".equals(name)) {
            Toast.makeText(getContext(),
                    "Nama user tidak tersedia",
                    Toast.LENGTH_SHORT).show();
            return;
        }
        if (lastBitmap == null) {
            Toast.makeText(getContext(),
                    "Please capture a photo first",
                    Toast.LENGTH_SHORT).show();
            return;
        }
        if (selectedVehicleId == null) {
            Toast.makeText(getContext(),
                    "No vehicle selected",
                    Toast.LENGTH_SHORT).show();
            return;
        }

        tvStatus.setText("Uploading to cloud server...");
        btnSend.setEnabled(false);

        new Thread(() -> {
            try {
                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                lastBitmap.compress(Bitmap.CompressFormat.JPEG, 70, baos);
                String b64 = Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP);

                JSONObject payload = new JSONObject();
                payload.put("image", b64);
                payload.put("name", name);
                byte[] body = payload.toString().getBytes(StandardCharsets.UTF_8);

                String uploadUrl = BASE_UPLOAD_URL + selectedVehicleId + "/upload_knownface/";
                HttpURLConnection conn = (HttpURLConnection)
                        new URL(uploadUrl).openConnection();
                conn.setDoOutput(true);
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                conn.setFixedLengthStreamingMode(body.length);
                conn.connect();

                try (OutputStream os = conn.getOutputStream()) {
                    os.write(body);
                }

                int code = conn.getResponseCode();
                Log.d("ProfileFragment", "HTTP " + code + " from " + uploadUrl);

                requireActivity().runOnUiThread(() -> {
                    boolean ok = (code == 200);
                    tvStatus.setText(ok ? "Upload successful!" : "Error: " + code);
                    btnSend.setEnabled(true);
                    if (ok) {
                        uploadSuccess.setVisibility(View.VISIBLE);
                        uploadSuccess.playAnimation();
                    }
                });
            } catch (Exception e) {
                Log.e("ProfileFragment", "Upload failed", e);
                requireActivity().runOnUiThread(() -> {
                    tvStatus.setText("Upload failed");
                    btnSend.setEnabled(true);
                    Toast.makeText(getContext(),
                            "Error: " + e.getMessage(),
                            Toast.LENGTH_LONG).show();
                });
            }
        }).start();
    }

    private void checkCloudStatus(String host) {
        executor.submit(() -> {
            long start = System.currentTimeMillis();
            boolean reachable = false;
            try {
                reachable = InetAddress.getByName(host).isReachable(1000);
            } catch (IOException ignored) { }

            long elapsed = System.currentTimeMillis() - start;
            if (!isAdded()) return;

            boolean finalReachable = reachable;
            requireActivity().runOnUiThread(() -> {
                if (finalReachable) {
                    cloudStatus.setText(String.format("Cloud OK (%d ms)", elapsed));
                    cloudStatus.setTextColor(
                            ContextCompat.getColor(requireContext(),
                                    android.R.color.holo_green_light));
                } else {
                    cloudStatus.setText("Server Offline");
                    cloudStatus.setTextColor(
                            ContextCompat.getColor(requireContext(),
                                    android.R.color.holo_red_light));
                }
            });
        });
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        executor.shutdownNow();
    }
}
