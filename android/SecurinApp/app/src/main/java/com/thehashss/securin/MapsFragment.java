package com.thehashss.securin;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;

import com.google.android.gms.maps.CameraUpdateFactory;
import com.google.android.gms.maps.GoogleMap;
import com.google.android.gms.maps.OnMapReadyCallback;
import com.google.android.gms.maps.SupportMapFragment;
import com.google.android.gms.maps.model.LatLng;
import com.google.android.gms.maps.model.MarkerOptions;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.TimeZone;

public class MapsFragment extends Fragment implements OnMapReadyCallback {
    private GoogleMap gMap;
    private VehicleViewModel vehicleViewModel;

    // TODO: Rename parameter arguments, choose names that match
    // the fragment initialization parameters, e.g. ARG_ITEM_NUMBER
    private static final String ARG_PARAM1 = "param1";
    private static final String ARG_PARAM2 = "param2";

    // TODO: Rename and change types of parameters
    private String mParam1;
    private String mParam2;

    public MapsFragment() {
        // Required empty public constructor
    }

    /**
     * Use this factory method to create a new instance of
     * this fragment using the provided parameters.
     *
     * @param param1 Parameter 1.
     * @param param2 Parameter 2.
     * @return A new instance of fragment MapsFragment.
     */
    // TODO: Rename and change types and number of parameters
    public static MapsFragment newInstance(String param1, String param2) {
        MapsFragment fragment = new MapsFragment();
        Bundle args = new Bundle();
        args.putString(ARG_PARAM1, param1);
        args.putString(ARG_PARAM2, param2);
        fragment.setArguments(args);
        return fragment;
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (getArguments() != null) {
            mParam1 = getArguments().getString(ARG_PARAM1);
            mParam2 = getArguments().getString(ARG_PARAM2);
        }
    }

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {

        return inflater.inflate(R.layout.fragment_maps, container, false);
    }

    @Override
    public void onViewCreated(View view, Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        vehicleViewModel = new ViewModelProvider(requireActivity()).get(VehicleViewModel.class);

        SupportMapFragment mapFragment = (SupportMapFragment) getChildFragmentManager().findFragmentById(R.id.map);
        if (mapFragment != null) {
            mapFragment.getMapAsync(this);
        }
    }

    @Override
    public void onMapReady(@NonNull GoogleMap googleMap) {
        this.gMap = googleMap;

        vehicleViewModel = new ViewModelProvider(requireActivity()).get(VehicleViewModel.class);

        vehicleViewModel.getLatitude().observe(getViewLifecycleOwner(), latitude -> updateMapMarker());
        vehicleViewModel.getLongitude().observe(getViewLifecycleOwner(), longitude -> updateMapMarker());
        vehicleViewModel.getTimestamp().observe(getViewLifecycleOwner(), timestamp -> updateMapMarker());
    }

    private void updateMapMarker() {
        if (gMap == null) return;

        Double latitude = vehicleViewModel.getLatitude().getValue();
        Double longitude = vehicleViewModel.getLongitude().getValue();
        Long timestamp = vehicleViewModel.getTimestamp().getValue();

        if (latitude != null && longitude != null && timestamp != null) {
            gMap.clear();

            Date date = new Date(timestamp * 1000);

            SimpleDateFormat simpleDateFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
            simpleDateFormat.setTimeZone(TimeZone.getTimeZone("Asia/Jakarta")); // WIB

            String terakhirUpdate = simpleDateFormat.format(date);

            LatLng location = new LatLng(latitude, longitude);
            gMap.addMarker(new MarkerOptions()
                    .position(location)
                    .title("Updated " + terakhirUpdate));

            gMap.moveCamera(CameraUpdateFactory.newLatLngZoom(location, 15));
        }
    }

}
