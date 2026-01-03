import React from "react";
import { View, Text, ScrollView, Image } from "react-native";
import { router } from "expo-router";

import RideLayout from "@/components/RideLayout";
import { icons } from "@/constants";
import { formatTime } from "@/lib/utils";
import { useDriverStore, useLocationStore } from "@/store";
import CustomButton from "@/components/CustomButton";

const ConfirmRide = () => {
  const { userAddress, destinationAddress } = useLocationStore();
  const { drivers, selectedDriver } = useDriverStore();

  // Get selected driver details
  const driverDetails = drivers?.find(
    (driver) => driver.id === selectedDriver
  );

  // Handle null addresses with fallback
  const pickupAddress = userAddress || "Pickup location not set";
  const dropoffAddress = destinationAddress || "Destination not set";

  const handleBookRide = () => {
    router.push("/(root)/book-ride");
  };

  return (
    <RideLayout title="Confirm Ride" snapPoints={["50%", "75%", "90%"]}>
      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Driver Profile Section */}
        <View className="items-center py-5 mb-4">
          <View
            className="mb-3"
            style={{
              borderWidth: 3,
              borderColor: '#3B82F6',
              borderRadius: 50,
              padding: 3,
            }}
          >
            <Image
              source={{ uri: driverDetails?.profile_image_url }}
              className="w-20 h-20 rounded-full"
            />
          </View>

          <Text className="text-xl font-bold text-gray-900 mb-2">
            {driverDetails?.title}
          </Text>

          <View className="flex-row items-center bg-yellow-50 px-4 py-2 rounded-full">
            <Image
              source={icons.star}
              className="w-4 h-4"
              resizeMode="contain"
            />
            <Text className="text-sm font-bold text-yellow-600 ml-2">
              {driverDetails?.rating}
            </Text>
          </View>
        </View>

        {/* Trip Details Card */}
        <View
          className="bg-gray-50 rounded-2xl p-4 mb-4"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <Text className="text-base font-bold text-gray-900 mb-3">
            Trip Details
          </Text>

          {/* Price */}
          <View className="flex-row items-center justify-between py-3 border-b border-gray-200">
            <View className="flex-row items-center">
              <View className="w-9 h-9 bg-green-100 rounded-full items-center justify-center mr-3">
                <Text className="text-base">💵</Text>
              </View>
              <Text className="text-sm text-gray-700">Fare</Text>
            </View>
            <Text className="text-xl font-bold text-green-600">
              ${driverDetails?.price}
            </Text>
          </View>

          {/* Time */}
          <View className="flex-row items-center justify-between py-3 border-b border-gray-200">
            <View className="flex-row items-center">
              <View className="w-9 h-9 bg-blue-100 rounded-full items-center justify-center mr-3">
                <Text className="text-base">⏱️</Text>
              </View>
              <Text className="text-sm text-gray-700">Pickup Time</Text>
            </View>
            <Text className="text-sm font-semibold text-gray-900">
              {Math.round(driverDetails?.time || 0)} min
            </Text>
          </View>

          {/* Seats */}
          <View className="flex-row items-center justify-between py-3">
            <View className="flex-row items-center">
              <View className="w-9 h-9 bg-purple-100 rounded-full items-center justify-center mr-3">
                <Text className="text-base">🚗</Text>
              </View>
              <Text className="text-sm text-gray-700">Seats</Text>
            </View>
            <Text className="text-sm font-semibold text-gray-900">
              {driverDetails?.car_seats}
            </Text>
          </View>
        </View>

        {/* Route Card */}
        <View
                  className="bg-gray-50 rounded-2xl p-4 mb-4"
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                >
                  <Text className="text-base font-bold text-gray-900 mb-3">Route</Text>
        
                  {/* Pickup */}
                  <View className="flex-row mb-4">
                    <View className="items-center mr-3">
                      <View className="w-3 h-3 bg-blue-500 rounded-full mt-1" />
                      <View className="w-0.5 flex-1 bg-gray-300 my-1" style={{ minHeight: 40 }} />
                    </View>
                    <View className="flex-1 pt-0.5">
                      <Text className="text-xs font-medium text-gray-500 uppercase mb-1">
                        Pickup
                      </Text>
                      <Text className="text-sm text-gray-900 leading-5" numberOfLines={3}>
                        {pickupAddress}
                      </Text>
                    </View>
                  </View>
        
                  {/* Destination */}
                  <View className="flex-row">
                    <View className="items-center mr-3">
                      <View className="w-3 h-3 bg-green-500 rounded-full mt-1" />
                    </View>
                    <View className="flex-1 pt-0.5">
                      <Text className="text-xs font-medium text-gray-500 uppercase mb-1">
                        Destination
                      </Text>
                      <Text className="text-sm text-gray-900 leading-5" numberOfLines={3}>
                        {dropoffAddress}
                      </Text>
                    </View>
                  </View>
                </View>
      </ScrollView>

      {/* Fixed Bottom Button */}
      <View
        className="absolute bottom-0 left-0 right-0 bg-white px-5 py-4 border-t border-gray-200"
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 5,
        }}
      >
        <CustomButton
          title="Proceed to Payment"
          onPress={handleBookRide}
          className="bg-blue-600"
        />
      </View>
    </RideLayout>
  );
};

export default ConfirmRide;