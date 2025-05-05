package com.thehashss.securin;

import android.graphics.Color;
import android.os.Bundle;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.Animation;
import android.view.animation.AnimationUtils;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;

import com.airbnb.lottie.LottieAnimationView;
import com.airbnb.lottie.LottieDrawable;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;


public class HomeFragment extends Fragment {
    private TextView locationText;
    private ImageView hexagon;
    private VehicleViewModel vehicleViewModel;
    private TextView vehicleName, operatorName, signalStrength, imeiText, imsiText, ipAddress, modeText, temperatureText, humidityText, modeTextTime, drowsyText, facerecogText;

    Animation Rotate_Animation, Bottom_Animation, Left_Animation;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_home, container, false);

//        locationText = view.findViewById(R.id.test);
        vehicleName = view.findViewById(R.id.vehicle_name);
        operatorName = view.findViewById(R.id.operator_name);
        signalStrength = view.findViewById(R.id.strength);
        imeiText = view.findViewById(R.id.imei);
        imsiText = view.findViewById(R.id.imsi);
        ipAddress = view.findViewById(R.id.ip_address);
        modeText = view.findViewById(R.id.mode_text);
        temperatureText = view.findViewById(R.id.face_status);
        humidityText = view.findViewById(R.id.drowsy_status);
        hexagon = view.findViewById(R.id.power_circle);
        modeTextTime = view.findViewById(R.id.modetime_text);
        drowsyText = view.findViewById(R.id.drowsy_status);
        facerecogText = view.findViewById(R.id.face_status);

        final LottieAnimationView lottiePowerButton = view.findViewById(R.id.powerButton);
        final LottieAnimationView lottieSignalWidget = view.findViewById(R.id.signal_animation);
        final LottieAnimationView lottieModeWidget = view.findViewById(R.id.mode_animation);
        final LottieAnimationView lottieTemperatureWidget = view.findViewById(R.id.face_animation);
        final LottieAnimationView lottieFaceWidget = view.findViewById(R.id.face_animation);
        final LottieAnimationView lottieDrowsyWidget = view.findViewById(R.id.drowsy_animation);

        vehicleViewModel = new ViewModelProvider(requireActivity()).get(VehicleViewModel.class);

        vehicleViewModel.getSelectedVehicleId().observe(getViewLifecycleOwner(), id -> {
            if (id != null && !id.isEmpty()) {
                vehicleName.setText(id);
            } else {
                vehicleName.setText("Scan QR untuk menambahkan Vehicle");
            }
        });

//        vehicleViewModel.getTemperatureData().observe(getViewLifecycleOwner(), temperature -> {
//            if (temperature != null) {
//                textField2.setText(String.format(Locale.getDefault(), "%.2f °C", temperature));
//            } else {
//                textField2.setText("No Data");
//            }
//        });

//        vehicleViewModel.getLatitude().observe(getViewLifecycleOwner(), latitude -> updateLocationText());
//        vehicleViewModel.getLongitude().observe(getViewLifecycleOwner(), longitude -> updateLocationText());
//        vehicleViewModel.getTimestamp().observe(getViewLifecycleOwner(), timestamp -> updateLocationText());

        vehicleViewModel.getModemOperator().observe(getViewLifecycleOwner(), operator -> updateModemText());
        vehicleViewModel.getModemImei().observe(getViewLifecycleOwner(), imei -> updateModemText());
        vehicleViewModel.getModemImsi().observe(getViewLifecycleOwner(), imsi -> updateModemText());
        vehicleViewModel.getModemIpAddress().observe(getViewLifecycleOwner(), ip_address -> updateModemText());
        vehicleViewModel.getModemSignalStrength().observe(getViewLifecycleOwner(), signal_strength -> {
            updateModemText();

            if (signal_strength != null) {
                if (signal_strength < 10) {
                    lottieSignalWidget.setMinAndMaxProgress(0.0f, 0.1f);
                } else if (signal_strength < 20) {
                    lottieSignalWidget.setMinAndMaxProgress(0.1f, 0.2f);
                } else if (signal_strength < 30) {
                    lottieSignalWidget.setMinAndMaxProgress(0.2f, 0.3f);
                } else if (signal_strength < 40) {
                    lottieSignalWidget.setMinAndMaxProgress(0.3f, 0.4f);
                } else if (signal_strength > 50) {
                    lottieSignalWidget.setMinAndMaxProgress(0.4f, 0.5f);
                }
                lottieSignalWidget.playAnimation();
            }
        });

        vehicleViewModel.getDrowsiness().observe(getViewLifecycleOwner(), drowsiness -> {
            updateDrowsyText();

            if (drowsiness != null) {
                if (drowsiness == 0) {
                    lottieDrowsyWidget.setAnimation(R.raw.drowsy_normal);
                    lottieDrowsyWidget.setMinAndMaxProgress(0.0f, 0.75f);
                    lottieDrowsyWidget.setRepeatCount(LottieDrawable.INFINITE);
                } else if (drowsiness == 1) {
                    lottieDrowsyWidget.setAnimation(R.raw.drowsy_normal);
                    lottieDrowsyWidget.setMinAndMaxProgress(0.0f, 0.82f);

                } else if (drowsiness == 2) {
                    lottieDrowsyWidget.setAnimation(R.raw.drowsy_yeah);
                    lottieDrowsyWidget.setMinAndMaxProgress(0.0f, 0.75f);
                    lottieDrowsyWidget.setRepeatCount(LottieDrawable.INFINITE);
                }
                lottieDrowsyWidget.playAnimation();
            }
        });

        vehicleViewModel.getFacerecog().observe(getViewLifecycleOwner(), facerecognition -> {
            updateFacerecogText();

            Log.d("hasil", String.valueOf(facerecognition));
            if (facerecognition != null) {
                if (facerecognition == 0) {
                    lottieFaceWidget.setAnimation(R.raw.face_recog_success);
                    lottieFaceWidget.setMinAndMaxProgress(0.0f, 0.75f);
                    lottieFaceWidget.setRepeatCount(LottieDrawable.INFINITE);
                } else if (facerecognition == 1) {
                    lottieFaceWidget.setAnimation(R.raw.face_recog_success);
                    lottieFaceWidget.setMinAndMaxProgress(0.0f, 0.82f);

                } else if (facerecognition == 2) {
                    lottieFaceWidget.setAnimation(R.raw.face_recog_intruder);
                    lottieFaceWidget.setMinAndMaxProgress(0.0f, 0.75f);
                    lottieFaceWidget.setRepeatCount(LottieDrawable.INFINITE);
                }
                lottieFaceWidget.playAnimation();
            }
        });
        
        vehicleViewModel.getVehicleState().observe(getViewLifecycleOwner(), state -> {
            updateVehicleModeText();

            lottieModeWidget.playAnimation();
        });

        vehicleViewModel.getTemperatureData().observe(getViewLifecycleOwner(), temperature -> {
            updateTemperatureText();
            lottieTemperatureWidget.setMinAndMaxProgress(0.0f, 0.5f);
            lottieTemperatureWidget.playAnimation();
        });

        vehicleViewModel.getHumidityData().observe(getViewLifecycleOwner(), humidity -> updateTemperatureText());

        Rotate_Animation = AnimationUtils.loadAnimation(getContext(), R.anim.fadeanim);
//        locationText.setAnimation(Rotate_Animation);
        hexagon.setAnimation(Rotate_Animation);

        vehicleViewModel.getPowerStatus().observe(getViewLifecycleOwner(), isPowerOn -> {
            if (isPowerOn != null) {
                if (isPowerOn) {
                    lottiePowerButton.setAnimation(R.raw.power_on);
                    lottiePowerButton.setRepeatCount(LottieDrawable.INFINITE);
                } else {
                    lottiePowerButton.setAnimation(R.raw.power_off);
                    lottiePowerButton.setRepeatCount(LottieDrawable.INFINITE);
                }
                lottiePowerButton.playAnimation();
            }

        });

        lottiePowerButton.setOnClickListener(v -> {
            boolean statusPower = vehicleViewModel.getPowerStatus().getValue() != null && vehicleViewModel.getPowerStatus().getValue();
            vehicleViewModel.setPowerStatus(!statusPower);
        });

        return view;
    }

    private void updateModemText() {
        String operator = vehicleViewModel.getModemOperator().getValue();
        String imei = vehicleViewModel.getModemImei().getValue();
        String imsi = vehicleViewModel.getModemImsi().getValue();
        String ip_address = vehicleViewModel.getModemIpAddress().getValue();
        Integer signal_strength = vehicleViewModel.getModemSignalStrength().getValue();
        String signal = String.format(Locale.getDefault(), "Signal Strength: %d dBm", signal_strength);

        if (operator != null && imei != null && imsi != null && ip_address != null && signal_strength != null) {
            operatorName.setText(operator);
            signalStrength.setText(signal);
            imeiText.setText("IMEI: " + imei);
            imsiText.setText("IMSI: " + imsi);
            ipAddress.setText(ip_address);

        } else {
            operatorName.setText("N/A");
            signalStrength.setText("Signal Strength: " + 0 + "dBm");
            imeiText.setText("IMEI: " + "N/A");
            imsiText.setText("IMSI: " + "N/A");
            ipAddress.setText("0.0.0.0");
        }

    }

//    private void updateElectricityText() {
//        Double state = vehicleViewModel.getVoltage().getValue();
//
//        if (voltage != null) {
//            String voltageInfo = String.format(Locale.getDefault(),
//                    "%.2f V", voltage);
//            voltageText.setText(voltageInfo);
//        } else {
//            voltageText.setText("N/A V");
//        }
//    }

    
    private void updateVehicleModeText() {
        String vehicleState = vehicleViewModel.getVehicleState().getValue();
        Long timeState = vehicleViewModel.getVehicleStateTimestamp().getValue();

        if (vehicleState != null && timeState != null) {
            Date date = new Date(timeState * 1000);

            SimpleDateFormat simpleDateFormat = new SimpleDateFormat("HH:mm:ss");
            simpleDateFormat.setTimeZone(TimeZone.getTimeZone("Asia/Jakarta")); // WIB

            modeText.setText(vehicleState.toUpperCase());
            modeTextTime.setText(simpleDateFormat.format(date));
        }
        
    }
    
    
    private void updateTemperatureText() {
        Double temperature = vehicleViewModel.getTemperatureData().getValue();
        Double humidity = vehicleViewModel.getHumidityData().getValue();

        if (temperature != null && humidity != null) {
            String temperatureInfo = String.format(Locale.getDefault(),
                    "%.2f° Celcius", temperature);

            String humidityInfo = String.format(Locale.getDefault(), "%.2f%% Humidity", humidity);
            temperatureText.setText(temperatureInfo);
            humidityText.setText(humidityInfo);
        } else {
            humidityText.setText("N/A %");
            temperatureText.setText("N/A° Celcius");
        }
    }


    private void updateDrowsyText() {
        Integer drowsines = vehicleViewModel.getDrowsiness().getValue();

        if (drowsines == 0) {
            drowsyText.setText("Drowsy Normal");
            drowsyText.setTextColor(Color.WHITE);
        } else if (drowsines == 1){
            drowsyText.setText("Yawning");
            drowsyText.setTextColor(getResources().getColor(R.color.yellow_desc));
        } else {
            drowsyText.setText("Sleepy");
            drowsyText.setTextColor(getResources().getColor(R.color.warning));
        }
    }


    private void updateFacerecogText() {
        Integer facerecognition = vehicleViewModel.getFacerecog().getValue();

        if (facerecognition == 0) {
            facerecogText.setText("No Face Detected");
            facerecogText.setTextColor(Color.WHITE);
        } else if (facerecognition == 1){
            facerecogText.setText("User Face Detected");
            facerecogText.setTextColor(Color.GREEN);
        } else if (facerecognition == 2) {
            facerecogText.setText("Intruder Detected");
            facerecogText.setTextColor(getResources().getColor(R.color.warning));
        }
    }
//    private void updateLocationText() {
//        Double latitude = vehicleViewModel.getLatitude().getValue();
//        Double longitude = vehicleViewModel.getLongitude().getValue();
//        Long timestamp = vehicleViewModel.getTimestamp().getValue();
//
//        if (latitude != null && longitude != null && timestamp != null) {
//            String locationInfo = String.format(Locale.getDefault(),
//                    "Lat: %.6f\nLng: %.6f\nTimestamp: %d", latitude, longitude, timestamp);
//            locationText.setText(locationInfo);
//        } else {
//            locationText.setText("Location: N/A");
//        }
//    }
}

