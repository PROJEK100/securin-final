package com.thehashss.securin;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import java.util.HashSet;
import java.util.Set;

public class VehiclePreferences {
    private static final String PREF_NAME = "vehicle_preferences";
    private static final String KEY_VEHICLE_IDS = "vehicle_ids";
    private static final String KEY_SELECTED_VEHICLE_ID = "selected_vehicle_id";

    private final SharedPreferences sharedPreferences;

    public VehiclePreferences(Context context) {
        sharedPreferences = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
    }

    // Add a new vehicle ID
    public void addVehicleId(String vehicleId) {
        Set<String> vehicleIds = getVehicleIds();
        vehicleIds.add(vehicleId);

        SharedPreferences.Editor editor = sharedPreferences.edit();
        editor.putStringSet(KEY_VEHICLE_IDS, vehicleIds);
        editor.apply();
    }

    // Remove a vehicle ID
    public void removeVehicleId(String vehicleId) {
        Set<String> vehicleIds = getVehicleIds();
        if (vehicleIds.contains(vehicleId)) {
            vehicleIds.remove(vehicleId);

            SharedPreferences.Editor editor = sharedPreferences.edit();
            editor.putStringSet(KEY_VEHICLE_IDS, vehicleIds);
            editor.apply();
        }
    }

    // Get all vehicle IDs
    public Set<String> getVehicleIds() {
        return new HashSet<>(sharedPreferences.getStringSet(KEY_VEHICLE_IDS, new HashSet<>()));
    }

    // Clear all vehicle IDs
    public void clearVehicleIds() {
        SharedPreferences.Editor editor = sharedPreferences.edit();
        editor.remove(KEY_VEHICLE_IDS);
        editor.remove(KEY_SELECTED_VEHICLE_ID);
        editor.apply();
        Log.d("VehiclePreferences", "Data cleared: " + getVehicleIds().isEmpty()); // Debugging
    }

    // Save the selected vehicle ID
    public void setSelectedVehicleId(String vehicleId) {
        SharedPreferences.Editor editor = sharedPreferences.edit();
        editor.putString(KEY_SELECTED_VEHICLE_ID, vehicleId);
        editor.apply();
    }

    // Get the selected vehicle ID
    public String getSelectedVehicleId() {
        return sharedPreferences.getString(KEY_SELECTED_VEHICLE_ID, null); // null jika tidak ada vehicle terpilih
    }
}
