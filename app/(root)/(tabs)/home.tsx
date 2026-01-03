import { View, Text, TouchableOpacity, Image, FlatList, ActivityIndicator, Alert, Linking, AppState } from 'react-native';
import { useUser, useAuth } from "@clerk/clerk-expo";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useState, useEffect, useRef } from "react";
import * as Location from "expo-location";

import RideCard from '@/components/RideCard';
import GoogleTextInput from "@/components/GoogleTextInput";
import Map from "@/components/Map";
import { icons, images } from "@/constants";
import { useLocationStore } from "@/store";
import { useFetch } from "@/lib/fetch";
import { Ride } from "@/types/type";

export default function Page() {
  const { setUserLocation, setDestinationLocation } = useLocationStore();
  const { user } = useUser();
  const { signOut } = useAuth();
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const {
    data: recentRides,
    loading,
    error,
  } = useFetch<Ride[]>(`/(api)/ride/${user?.id}`);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const appState = useRef(AppState.currentState)

  const handleSignOut = async () => {
    await signOut();
    router.replace("/(auth)/sign-in");
  };

  const handleDestinationPress = (location: {
    latitude: number;
    longitude: number;
    address: string;
  }) => {
    setDestinationLocation(location);
    router.push("/(root)/find-ride");
  };

  const requestLocation = async () => {
    setLocationLoading(true);
    setLocationError(null);

    try {
      // First check if location services are enabled
      const isLocationEnabled = await Location.hasServicesEnabledAsync();
      
      if (!isLocationEnabled) {
        setLocationError("location_disabled");
        setLocationLoading(false);
        setHasPermission(false);
        
        // Don't show alert - the UI already explains what to do
        
        return;
      }

      // Request location permissions
      let { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        setLocationError("permission_denied");
        setHasPermission(false);
        setLocationLoading(false);
        
        
        return;
      }

      setHasPermission(true);

      // Get current position with timeout
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: "Current Location",
      });

      setLocationLoading(false);
      setLocationError(null);

    } catch (error: any) {
      console.error("Error getting location:", error);
      setLocationLoading(false);
      setHasPermission(false);

      // Handle specific error cases
      if (error.message?.includes("unavailable")) {
        setLocationError("location_unavailable");
        Alert.alert(
          "Location Unavailable",
          "Unable to get your current location. Please make sure:\n\n1. Location services are enabled\n2. You have a GPS signal\n3. You're not in airplane mode",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Try Again", onPress: () => requestLocation() }
          ]
        );
      } else {
        setLocationError("unknown_error");
        Alert.alert(
          "Location Error",
          "An error occurred while getting your location. Please try again.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Retry", onPress: () => requestLocation() }
          ]
        );
      }
    }
  };

  useEffect(() => {
    requestLocation();

    // Listen for app state changes (when user comes back from settings)
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        
        // App has come to foreground, retry location
        if (locationError) {
          requestLocation();
        }
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Also retry when locationError changes (user dismissed an alert)
  useEffect(() => {
    if (locationError && !locationLoading) {
      // Auto-retry after 2 seconds if there was an error
      const timer = setTimeout(() => {
        
        requestLocation();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [locationError]);

  return (
    <SafeAreaView className="bg-general-500">
      <FlatList
        data={recentRides?.slice(0, 5)}
        renderItem={({ item }) => <RideCard ride={item} />}
        keyExtractor={(item, index) => index.toString()}
        className="px-5"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingBottom: 120, // Extra space to avoid bottom overlap
        }}
        ListEmptyComponent={() => (
          <View className="flex flex-col items-center justify-center">
            {!loading ? (
              <>
                <Image
                  source={images.noResult}
                  className="w-40 h-40"
                  alt="No recent rides found"
                  resizeMode="contain"
                />
                <Text className="text-sm">No recent rides found</Text>
              </>
            ) : (
              <ActivityIndicator size="small" color="#000" />
            )}
          </View>
        )}
        ListHeaderComponent={
          <>
            <View className="flex flex-row items-center justify-between my-5">
              <Text className="text-2xl font-JakartaExtraBold">
                Welcome {user?.firstName}👋
              </Text>
              <TouchableOpacity
                onPress={handleSignOut}
                className="justify-center items-center w-10 h-10 rounded-full bg-white"
              >
                <Image source={icons.out} className="w-4 h-4" />
              </TouchableOpacity>
            </View>

            <GoogleTextInput
              icon={icons.search}
              containerStyle="bg-white shadow-md shadow-neutral-300"
              handlePress={handleDestinationPress}
            />

            <>
              <Text className="text-xl font-JakartaBold mt-5 mb-3">
                Your Current Location
              </Text>
              <View className="flex flex-row items-center bg-transparent h-[300px]">
                {locationLoading ? (
                  <View className="flex-1 items-center justify-center bg-gray-100 rounded-2xl">
                    <ActivityIndicator size="large" color="#000" />
                    <Text className="mt-2 text-sm text-gray-500">
                      Getting your location...
                    </Text>
                  </View>
                ) : locationError ? (
                  <View className="flex-1 items-center justify-center bg-gray-100 rounded-2xl p-5">
                    <View className="items-center mb-4">
                      <View className="w-20 h-20 bg-red-100 rounded-full items-center justify-center mb-3">
                        <Text className="text-4xl">📍</Text>
                      </View>
                      <Text className="text-lg font-bold text-gray-900 mb-2 text-center">
                        {locationError === "location_disabled"
                          ? "Location Services Disabled"
                          : locationError === "permission_denied"
                          ? "Location Permission Required"
                          : "Location Unavailable"}
                      </Text>
                      <Text className="text-sm text-gray-600 text-center mb-1">
                        {locationError === "location_disabled"
                          ? "Please enable location in your device settings"
                          : locationError === "permission_denied"
                          ? "Grant location access to use MyRide"
                          : "Unable to get your current location"}
                      </Text>
                      {locationError === "location_disabled" && (
                        <View className="bg-blue-50 rounded-lg p-3 mt-3 mb-4">
                          <Text className="text-xs text-blue-900 font-semibold mb-1">
                            📱 Quick Steps:
                          </Text>
                          <Text className="text-xs text-blue-800">
                            1. Tap "Open Settings" below{'\n'}
                            2. Turn ON Location Services{'\n'}
                            3. Return to MyRide (auto-refreshes)
                          </Text>
                        </View>
                      )}
                    </View>
                    <View className="flex-row gap-2">
                      {locationError === "location_disabled" && (
                        <TouchableOpacity
                          onPress={() => Linking.openSettings()}
                          className="bg-blue-500 px-6 py-3 rounded-lg flex-1"
                        >
                          <Text className="text-white font-semibold text-center">
                            Open Settings
                          </Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        onPress={requestLocation}
                        className="bg-green-500 px-6 py-3 rounded-lg flex-1"
                      >
                        <Text className="text-white font-semibold text-center">
                          Try Again
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <Text className="text-xs text-gray-500 text-center mt-3">
                      Auto-checking in background...
                    </Text>
                  </View>
                ) : !hasPermission ? (
                  <View className="flex-1 items-center justify-center bg-gray-100 rounded-2xl p-5">
                    <Text className="text-4xl mb-3">🔒</Text>
                    <Text className="text-base font-semibold text-gray-900 mb-2 text-center">
                      Location Access Required
                    </Text>
                    <Text className="text-sm text-gray-600 text-center mb-4">
                      MyRide needs your location to show nearby drivers
                    </Text>
                    <TouchableOpacity
                      onPress={requestLocation}
                      className="bg-blue-500 px-6 py-3 rounded-lg"
                    >
                      <Text className="text-white font-semibold">
                        Enable Location
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Map />
                )}
              </View>
            </>

            <Text className="text-xl font-JakartaBold mt-5 mb-3">
              Recent Rides
            </Text>
          </>
        }
      />
    </SafeAreaView>
  );
}
