import { View, Text, ActivityIndicator } from 'react-native';
import React, { useEffect, useState, useRef } from "react";
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from "react-native-maps";
import { useDriverStore, useLocationStore } from "@/store";
import {
  calculateDriverTimes,
  calculateRegion,
  generateMarkersFromData,
} from "@/lib/map";
import { Driver, MarkerData } from "@/types/type";
import { icons } from "@/constants";

const drivers: Driver[] = [
  {
    id: 1,
    first_name: "James",
    last_name: "Wilson",
    profile_image_url: "https://randomuser.me/api/portraits/men/1.jpg",
    car_image_url: "https://images.pexels.com/photos/170811/pexels-photo-170811.jpeg",
    car_seats: 4,
    rating: 4.8
  },
  {
    id: 2,
    first_name: "David",
    last_name: "Brown",
    profile_image_url: "https://randomuser.me/api/portraits/men/40.jpg",
    car_image_url: "https://images.pexels.com/photos/210019/pexels-photo-210019.jpeg",
    car_seats: 4,
    rating: 4.6
  },
  {
    id: 3,
    first_name: "Ben",
    last_name: "Sam",
    profile_image_url: "https://randomuser.me/api/portraits/men/30.jpg",
    car_image_url: "https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=400",
    car_seats: 4,
    rating: 4.9
  },
  {
    id: 4,
    first_name: "Mathew",
    last_name: "Sani",
    profile_image_url: "https://randomuser.me/api/portraits/men/20.jpg",
    car_image_url: "https://images.pexels.com/photos/1402787/pexels-photo-1402787.jpeg",
    car_seats: 4,
    rating: 4.7
  },
  {
    id: 5,
    first_name: "James",
    last_name: "Davis",
    profile_image_url: "https://randomuser.me/api/portraits/men/50.jpg",
    car_image_url: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400",
    car_seats: 3,
    rating: 4.85
  }
];

// Get Geoapify API key from environment variables
const GEOAPIFY_API_KEY = process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY || "";

interface RouteCoordinate {
  latitude: number;
  longitude: number;
}

const Map = () => {
  const mapRef = useRef<MapView>(null);
  const {
    userLatitude,
    userLongitude,
    destinationLatitude,
    destinationLongitude,  
  } = useLocationStore();
  const { selectedDriver, setDrivers } = useDriverStore();
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState<RouteCoordinate[]>([]);
  const [routeDistance, setRouteDistance] = useState<string>('');
  const [routeDuration, setRouteDuration] = useState<string>('');
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  const region = calculateRegion({
    userLatitude,
    userLongitude,
    destinationLatitude,
    destinationLongitude,
  });

  // Generate initial markers and calculate times when destination is set
  useEffect(() => {
    const setupDrivers = async () => {
      if (!Array.isArray(drivers)) return;
      if (!userLatitude || !userLongitude) return;

      // Generate markers with random positions near user
      const newMarkers = generateMarkersFromData({
        data: drivers,
        userLatitude,
        userLongitude,
      });
      
      setMarkers(newMarkers);

      // If destination is set, calculate driver times and prices
      if (destinationLatitude && destinationLongitude) {
        console.log("Calculating driver times and prices...");
        
        const driversWithTimes = await calculateDriverTimes({
          markers: newMarkers,
          userLatitude,
          userLongitude,
          destinationLatitude,
          destinationLongitude,
        });

        if (driversWithTimes) {
          console.log("Drivers with calculated times:", driversWithTimes);
          setMarkers(driversWithTimes);
          // IMPORTANT: Update store so other pages can access price/time data
          setDrivers(driversWithTimes);
        }
      } else {
        // No destination set yet, just set markers without price/time
        setDrivers(newMarkers);
      }
    };

    setupDrivers();
  }, [userLatitude, userLongitude, destinationLatitude, destinationLongitude]);

  // Fetch Geoapify Directions with traffic data
  useEffect(() => {
    const fetchDirections = async () => {
      if (!userLatitude || !userLongitude || !destinationLatitude || !destinationLongitude || !GEOAPIFY_API_KEY) {
        setRouteCoordinates([]);
        setRouteDistance('');
        setRouteDuration('');
        return;
      }

      setIsLoadingRoute(true);

      try {
        // Use Geoapify Routing API with traffic data
        const response = await fetch(
          `https://api.geoapify.com/v1/routing?waypoints=${userLatitude},${userLongitude}|${destinationLatitude},${destinationLongitude}&mode=drive&traffic=approximated&details=instruction_details&apiKey=${GEOAPIFY_API_KEY}`
        );

        const data = await response.json();

        if (data.features && data.features.length > 0) {
          const route = data.features[0];
          const coordinates = route.geometry.coordinates[0].map((coord: number[]) => ({
            latitude: coord[1],
            longitude: coord[0],
          }));

          setRouteCoordinates(coordinates);
          
          // Format distance
          const distanceInKm = route.properties.distance / 1000;
          if (distanceInKm < 1) {
            setRouteDistance(`${Math.round(distanceInKm * 1000)} m`);
          } else {
            setRouteDistance(`${distanceInKm.toFixed(1)} km`);
          }
          
          // Format duration
          const durationInMin = route.properties.time / 60;
          if (durationInMin < 60) {
            setRouteDuration(`${Math.round(durationInMin)} min`);
          } else {
            const hours = Math.floor(durationInMin / 60);
            const mins = Math.round(durationInMin % 60);
            setRouteDuration(`${hours}h ${mins}min`);
          }
        }
      } catch (error) {
        console.error('Error fetching Geoapify directions:', error);
        setRouteCoordinates([]);
        setRouteDistance('');
        setRouteDuration('');
      } finally {
        setIsLoadingRoute(false);
      }
    };

    fetchDirections();
  }, [userLatitude, userLongitude, destinationLatitude, destinationLongitude]);

  // Animate map to fit both origin and destination when destination is set
  useEffect(() => {
    if (
      mapRef.current &&
      userLatitude &&
      userLongitude &&
      destinationLatitude &&
      destinationLongitude
    ) {
      // Small delay to ensure map is ready
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(
          [
            { latitude: userLatitude, longitude: userLongitude },
            { latitude: destinationLatitude, longitude: destinationLongitude },
          ],
          {
            edgePadding: { top: 70, right: 50, bottom: 50, left: 50 },
            animated: true,
          }
        );
      }, 500);
    }
  }, [destinationLatitude, destinationLongitude]);

  if (!userLatitude || !userLongitude) {
    return (
      <View className="w-full h-full rounded-2xl bg-gray-100 items-center justify-center">
        <ActivityIndicator size="large" color="#000" />
        <Text className="text-gray-500 mt-2">Loading map...</Text>
      </View>
    );
  }

  return (
    <View style={{ width: '100%', height: '100%' }}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={{ width: '100%', height: '100%' }}
        mapType="standard"
        showsPointsOfInterest={false}
        initialRegion={region}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsTraffic={true}
        onMapReady={() => setMapReady(true)}
      >
        {/* Driver Markers */}
        {mapReady && markers.map((marker, index) => (
          <Marker
            key={marker.id || `marker-${index}`}
            coordinate={{
              latitude: marker.latitude,
              longitude: marker.longitude,
            }}
            title={marker.title}
            description={`${marker.car_seats} seats - Rating: ${marker.rating}⭐`}
            image={
              selectedDriver === +marker.id ? icons.selectedMarker : icons.marker
            }
          />
        ))}

        {/* Destination Marker */}
        {destinationLatitude && destinationLongitude && (
          <Marker
            coordinate={{
              latitude: destinationLatitude,
              longitude: destinationLongitude,
            }}
            title="Destination"
            description="Your destination"
            pinColor="red"
          />
        )}

        {/* Route Polyline using Geoapify */}
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#0286FF"
            strokeWidth={5}
            lineCap="round"
            lineJoin="round"
          />
        )}
      </MapView>
      
      {/* Route Info Display */}
      {(routeDistance || isLoadingRoute) && (
        <View style={{
          position: 'absolute',
          top: 10,
          left: 10,
          right: 10,
          backgroundColor: 'white',
          padding: 14,
          borderRadius: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
          elevation: 5,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          {isLoadingRoute ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#0286FF" />
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#666', marginLeft: 8 }}>
                Calculating route...
              </Text>
            </View>
          ) : (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#0286FF' }}>
                  {routeDuration}
                </Text>
                <Text style={{ fontSize: 14, color: '#666', marginLeft: 8 }}>
                  ({routeDistance})
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: '#999' }}>
                with traffic
              </Text>
            </>
          )}
        </View>
      )}
      
      {!mapReady && (
        <View style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          justifyContent: 'center', 
          alignItems: 'center',
          backgroundColor: 'rgba(255,255,255,0.8)'
        }}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={{ marginTop: 10 }}>Loading map...</Text>
        </View>
      )}
    </View>
  );
}

export default Map;