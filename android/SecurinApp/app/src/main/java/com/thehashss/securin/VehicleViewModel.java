package com.thehashss.securin;

import android.util.Log;

import androidx.annotation.NonNull;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;
import androidx.lifecycle.ViewModel;

import com.google.firebase.database.DataSnapshot;
import com.google.firebase.database.DatabaseError;
import com.google.firebase.database.DatabaseReference;
import com.google.firebase.database.FirebaseDatabase;
import com.google.firebase.database.ValueEventListener;

public class VehicleViewModel extends ViewModel {
    private final MutableLiveData<String> selectedVehicleId = new MutableLiveData<>();

    private final MutableLiveData<Boolean> isPowerOn = new MutableLiveData<>();

    private final MutableLiveData<Double> temperatureData = new MutableLiveData<>();
    private final MutableLiveData<Double> humidityData = new MutableLiveData<>();

    private final MutableLiveData<Double> latitude = new MutableLiveData<>();
    private final MutableLiveData<Double> longitude = new MutableLiveData<>();
    private final MutableLiveData<Long> timestamp = new MutableLiveData<>();

    private final MutableLiveData<String> modemOperator = new MutableLiveData<>();
    private final MutableLiveData<String> modemImei = new MutableLiveData<>();
    private final MutableLiveData<String> modemImsi = new MutableLiveData<>();
    private final MutableLiveData<String> modemIpAddress = new MutableLiveData<>();
    private final MutableLiveData<Integer> modemSignalStrength = new MutableLiveData<>();

    private final MutableLiveData<Double> voltage = new MutableLiveData<>();

    private final MutableLiveData<String> vehicleState = new MutableLiveData<>();
    private final MutableLiveData<Long> vehicleStateTimestamp = new MutableLiveData<>();

    private final MutableLiveData<Integer> drowsinessStatus = new MutableLiveData<>();

    private final MutableLiveData<Integer> facerecognitionStatus = new MutableLiveData<>();

    private final MutableLiveData<Double> humidity = new MutableLiveData<>();


    private DatabaseReference firebaseRef;

    public VehicleViewModel() {
        firebaseRef = FirebaseDatabase.getInstance().getReference("vehicle");
    }

    public LiveData<String> getSelectedVehicleId() {
        return selectedVehicleId;
    }

    public LiveData<Boolean> getPowerStatus() {
        return isPowerOn;
    }

    public LiveData<Double> getTemperatureData() {
        return temperatureData;
    }

    public LiveData<Double> getHumidityData() {
        return humidityData;
    }

    public LiveData<Double> getLatitude() {
        return latitude;
    }

    public LiveData<Double> getLongitude() {
        return longitude;
    }

    public LiveData<Long> getTimestamp() {
        return timestamp;
    }

    public LiveData<String> getModemOperator() {
        return modemOperator;
    }

    public LiveData<String> getModemImei() {
        return modemImei;
    }

    public LiveData<String> getModemImsi() {
        return modemImsi;
    }

    public LiveData<Integer> getModemSignalStrength() {
        return modemSignalStrength;
    }

    public LiveData<String> getModemIpAddress() {
        return modemIpAddress;
    }

    public LiveData<Double> getVoltage() {
        return voltage;
    }

    public LiveData<String> getVehicleState() { return vehicleState; }

    public LiveData<Long> getVehicleStateTimestamp() { return vehicleStateTimestamp; }

    public LiveData<Integer> getDrowsiness() {return drowsinessStatus; }

    public LiveData<Integer> getFacerecog() {return facerecognitionStatus; }



    public void setSelectedVehicleId(String vehicleId) {
        if (!vehicleId.equals(selectedVehicleId.getValue())) {
            selectedVehicleId.setValue(vehicleId);
            loadTemperatureData(vehicleId);
            loadLocationData(vehicleId);
            loadMasterSwitch(vehicleId);
            loadModemData(vehicleId);
            loadElectricityData(vehicleId);
            loadVehicleModeData(vehicleId);
            loadDrowsinessData(vehicleId);
            loadFacerecogData(vehicleId);
        }
    }

    public void setPowerStatus(boolean status) {
        String vehicleId = selectedVehicleId.getValue();
        if (vehicleId != null) {
            firebaseRef.child(vehicleId).child("master_switch").child("value").setValue(status).addOnSuccessListener(aVoid -> {
                        Log.d("VehicleViewModel", "Master switch updated sukses: " + status);
                        isPowerOn.setValue(status);
                    })
                    .addOnFailureListener(e -> Log.e("VehicleViewModel", "Gagal update master switch guys", e));
        } else {
            Log.e("VehicleViewModel", "Vehicle masih kosong");
        }
        isPowerOn.setValue(status);
    }

    private void loadMasterSwitch(String vehicleId) {
        if (firebaseRef != null) {
            firebaseRef.child(vehicleId).child("master_switch").child("value")
                    .addValueEventListener(new ValueEventListener() {
                        @Override
                        public void onDataChange(DataSnapshot dataSnapshot) {
                            Boolean value = dataSnapshot.getValue(Boolean.class);
                            if (value != null) {
                                Log.d("VehicleViewModel", "Master switch data retrieved: " + value);
                            } else {
                                Log.d("VehicleViewModel", "Master switch data is null");
                            }
                            isPowerOn.setValue(value);
                        }

                        @Override
                        public void onCancelled(DatabaseError databaseError) {
                            Log.e("VehicleViewModel", "Failed to load master switch data.", databaseError.toException());
                        }
                    });
        }
    }

    // ambil data temperaturenya rek
    private void loadTemperatureData(String vehicleId) {
        if (firebaseRef != null) {
            firebaseRef.child(vehicleId).child("monitoring")
                    .addValueEventListener(new ValueEventListener() {
                        @Override
                        public void onDataChange(DataSnapshot dataSnapshot) {
                            Double temperature = dataSnapshot.child("temperature").getValue(Double.class);
                            Double humidity = dataSnapshot.child("humidity").getValue(Double.class);


                            if (temperature != null && humidity != null) {
                                Log.d("VehicleViewModel", "Temperature data retrieved: Temp =" + temperature + " Humidity =" + humidity);
                                temperatureData.setValue(temperature);
                                humidityData.setValue(humidity);
                            } else {
                                Log.d("VehicleViewModel", "Data DHT masih kosong");
                            }
                        }

                        @Override
                        public void onCancelled(DatabaseError databaseError) {
                            Log.e("VehicleViewModel", "Failed to load electric data.", databaseError.toException());
                        }
                    });
        }
    }

    // buat ambil lokasi e dari firebase
    private void loadLocationData(String vehicleId) {
        if (firebaseRef != null) {
            firebaseRef.child(vehicleId).child("location")
                    .addValueEventListener(new ValueEventListener() {
                        @Override
                        public void onDataChange(DataSnapshot dataSnapshot) {
                            Double lat = dataSnapshot.child("lat").getValue(Double.class);
                            Double lng = dataSnapshot.child("lng").getValue(Double.class);
                            Long time = dataSnapshot.child("timestamp").getValue(Long.class);

                            if (lat != null && lng != null && time != null) {
                                Log.d("VehicleViewModel", "Location data retrieved: Lat=" + lat + ", Lng=" + lng + ", Timestamp=" + time);
                                latitude.setValue(lat);
                                longitude.setValue(lng);
                                timestamp.setValue(time);
                            } else {
                                Log.d("VehicleViewModel", "One or more location values are null");
                            }
                        }

                        @Override
                        public void onCancelled(DatabaseError databaseError) {
                            Log.e("VehicleViewModel", "Failed to load location data.", databaseError.toException());
                        }
                    });
        }
    }

    private void loadModemData(String vehicleId) {
        if (firebaseRef != null) {
            firebaseRef.child(vehicleId).child("modem")
                    .addValueEventListener(new ValueEventListener() {
                        @Override
                        public void onDataChange(DataSnapshot dataSnapshot) {
                            String operator = dataSnapshot.child("operator").getValue(String.class);
                            String imei = dataSnapshot.child("IMEI").getValue(String.class);
                            String imsi = dataSnapshot.child("IMSI").getValue(String.class);
                            String ip_address = dataSnapshot.child("ip_address").getValue(String.class);
                            Integer signal_strength = dataSnapshot.child("signal_strength").getValue(Integer.class);

                            if (operator != null && imei != null && imsi != null && signal_strength != null && ip_address != null) {
                                Log.d("VehicleViewModel", "Modem data retrieved: Operator =" + operator + ", IMEI =" + imei + ", IMSI =" + imsi + ", Signal =" + signal_strength);
                                modemOperator.setValue(operator);
                                modemImei.setValue(imei);
                                modemImsi.setValue(imsi);
                                modemIpAddress.setValue(ip_address);
                                modemSignalStrength.setValue(signal_strength);
                            } else {
                                Log.d("VehicleViewModel", "Data modem ada yang masih kosong");
                            }
                        }

                        @Override
                        public void onCancelled(DatabaseError databaseError) {
                            Log.e("VehicleViewModel", "Failed to load mofrm data.", databaseError.toException());
                        }
                    });
        }
    }


    private void loadElectricityData(String vehicleId) {
        if (firebaseRef != null) {
            firebaseRef.child(vehicleId).child("electricity")
                    .addValueEventListener(new ValueEventListener() {
                        @Override
                        public void onDataChange(DataSnapshot dataSnapshot) {
                            Double volt = dataSnapshot.child("voltage").getValue(Double.class);


                            if (volt != null) {
                                Log.d("VehicleViewModel", "Aki data retrieved: Volt =" + volt);
                                voltage.setValue(volt);
                            } else {
                                Log.d("VehicleViewModel", "Data aki masih kosong");
                            }
                        }

                        @Override
                        public void onCancelled(DatabaseError databaseError) {
                            Log.e("VehicleViewModel", "Failed to load electric data.", databaseError.toException());
                        }
                    });
        }
    }

    private void loadVehicleModeData(String vehicleId) {
        if (firebaseRef != null) {
            firebaseRef.child(vehicleId).child("state")
                    .addValueEventListener(new ValueEventListener() {
                        @Override
                        public void onDataChange(DataSnapshot dataSnapshot) {

                            String state = dataSnapshot.child("status").getValue(String.class);
                            Long time = dataSnapshot.child("timestamp").getValue(Long.class);
//                            Double volt = dataSnapshot.child("voltage").getValue(Double.class);


                            if (state != null && time != null) {
                                Log.d("VehicleViewModel", "State vehicle data retrieved: State =" + state);
                                vehicleState.setValue(state);
                                vehicleStateTimestamp.setValue(time);
                            } else {
                                Log.d("VehicleViewModel", "Data state masih kosong");
                            }
                        }

                        @Override
                        public void onCancelled(DatabaseError databaseError) {
                            Log.e("VehicleViewModel", "Failed to load vehicle state data.", databaseError.toException());
                        }
                    });
        }
    }

    private void loadDrowsinessData(String vehicleId) {
        if (firebaseRef != null) {
            firebaseRef.child(vehicleId).child("detection").child("drowsiness")
                    .addValueEventListener(new ValueEventListener() {
                        @Override
                        public void onDataChange(DataSnapshot dataSnapshot) {
                            Integer drowsiness = dataSnapshot.child("status_code").getValue(Integer.class);


                            if (drowsiness != null) {
                                Log.d("VehicleViewModel", "Drowsiness status retrieved =" + drowsiness);
                                drowsinessStatus.setValue(drowsiness);
                            } else {
                                Log.d("VehicleViewModel", "Data drowsy masih kosong");
                            }
                        }

                        @Override
                        public void onCancelled(DatabaseError databaseError) {
                            Log.e("VehicleViewModel", "Failed to load drowsy data.", databaseError.toException());
                        }
                    });
        }
    }

    private void loadFacerecogData(String vehicleId) {
        if (firebaseRef != null) {
            firebaseRef.child(vehicleId).child("detection").child("face_detection")
                    .addValueEventListener(new ValueEventListener() {
                        @Override
                        public void onDataChange(DataSnapshot dataSnapshot) {
                            Integer facerecognition = dataSnapshot.child("status").getValue(Integer.class);


                            if (facerecognition != null) {
                                Log.d("VehicleViewModel", "Face recognition status retrieved =" + facerecognition);
                                facerecognitionStatus.setValue(facerecognition);
                            } else {
                                Log.d("VehicleViewModel", "Data face recognition masih kosong");
                            }
                        }

                        @Override
                        public void onCancelled(DatabaseError databaseError) {
                            Log.e("VehicleViewModel", "Failed to load face recog data.", databaseError.toException());
                        }
                    });
        }

    }
}
