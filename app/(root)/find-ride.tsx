import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Platform
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { icons } from "@/constants";
import { useDriverStore } from "@/store";
import CustomButton from "@/components/CustomButton";

interface Driver {
  id: number;
  title: string;
  profile_image_url: string;
  car_image_url: string;
  car_seats: number;
  rating: number;
  price?: string;
  time?: number;
  first_name: string;
  last_name: string;
  latitude: number;
  longitude: number;
}

const FindRide = () => {
  const { drivers, selectedDriver, setSelectedDriver } = useDriverStore();
  const [loading, setLoading] = useState(true);

  // Check if prices are being calculated
  useEffect(() => {
    // Give a moment for Map to calculate prices
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // Ensure drivers is typed correctly
  const driverList: Driver[] = (drivers as Driver[]) || [];

  // Check if any driver has price/time data
  const hasCalculatedData = driverList.some(d => d.price && d.time);

  // Handle driver selection
  const handleSelectDriver = (id: number) => {
    setSelectedDriver(id);
  };

  // Handle confirm ride navigation
  const handleConfirmRide = () => {
    if (!selectedDriver) return;
    
    // Check if selected driver has price and time
    const selected = driverList.find(d => d.id === selectedDriver);
    if (!selected?.price || !selected?.time) {
      alert("Price data is missing. Please go back and ensure you've selected a destination.");
      return;
    }
    
     router.push("/(root)/confirm-ride"); 
  };

  // Render individual driver card
  const renderDriverCard = ({ item }: { item: Driver }) => {
    const isSelected = selectedDriver === item.id;
    const hasPrice = item.price !== undefined && item.price !== null;
    const hasTime = item.time !== undefined && item.time !== null;

    return (
      <TouchableOpacity
        onPress={() => handleSelectDriver(item.id)}
        activeOpacity={0.7}
        className={`mb-4 rounded-2xl overflow-hidden ${
          isSelected
            ? "bg-blue-50 border-2 border-blue-500"
            : "bg-white border border-gray-200"
        }`}
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        {/* Driver Card Content */}
        <View className="p-4">
          {/* Driver Header - Profile & Rating */}
          <View className="flex-row items-center mb-4">
            {/* Profile Image */}
            <Image
              source={{ uri: item.profile_image_url }}
              className="w-16 h-16 rounded-full"
              style={{
                borderWidth: 2,
                borderColor: isSelected ? "#3B82F6" : "#E5E7EB",
              }}
            />

            {/* Driver Info */}
            <View className="flex-1 ml-3">
              <Text className="text-lg font-bold text-gray-900">
                {item.title}
              </Text>
              
              {/* Rating */}
              <View className="flex-row items-center mt-1">
                <Image
                  source={icons.star}
                  className="w-4 h-4"
                  resizeMode="contain"
                />
                <Text className="text-sm font-semibold text-yellow-500 ml-1">
                  {item.rating}
                </Text>
                <Text className="text-xs text-gray-500 ml-1">
                  ({item.car_seats} seats)
                </Text>
              </View>
            </View>

            {/* Price */}
            <View className="items-end">
              {hasPrice ? (
                <>
                  <Text className="text-2xl font-bold text-green-600">
                    ${item.price}
                  </Text>
                  <Text className="text-xs text-gray-500 mt-0.5">per ride</Text>
                </>
              ) : (
                <View className="items-center">
                  <ActivityIndicator size="small" color="#3B82F6" />
                  <Text className="text-xs text-gray-500 mt-1">Loading...</Text>
                </View>
              )}
            </View>
          </View>

          {/* Car Image */}
          <View className="bg-gray-50 rounded-xl p-3 mb-3">
            <Image
              source={{ uri: item.car_image_url }}
              className="w-full h-24"
              resizeMode="contain"
            />
          </View>

          {/* Time Estimate */}
          {hasTime ? (
            <View className="flex-row items-center justify-center bg-gray-100 rounded-lg py-2.5">
              <Image
                source={icons.to}
                className="w-4 h-4 mr-2"
                tintColor="#6B7280"
              />
              <Text className="text-sm font-medium text-gray-700">
                Trip duration: {Math.round(item.time || 0)} min
              </Text>
            </View>
          ) : (
            <View className="flex-row items-center justify-center bg-gray-100 rounded-lg py-2.5">
              <ActivityIndicator size="small" color="#6B7280" />
              <Text className="text-sm font-medium text-gray-700 ml-2">
                Calculating time...
              </Text>
            </View>
          )}

          {/* Selection Indicator */}
          {isSelected && (
            <View className="absolute top-4 right-4 bg-blue-500 rounded-full p-1.5">
              <Image
                source={icons.checkmark}
                className="w-4 h-4"
                tintColor="#FFFFFF"
              />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && driverList.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={["top", "bottom"]}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="text-gray-600 mt-4">Loading drivers...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top", "bottom"]}>
      {/* Header Section */}
      <View className="bg-white px-5 py-4 border-b border-gray-200">
        <Text className="text-2xl font-bold text-gray-900">
          Available Drivers
        </Text>
        <Text className="text-sm text-gray-600 mt-1">
          {!hasCalculatedData 
            ? "Calculating prices and times..." 
            : "Select a driver for your ride"}
        </Text>
      </View>

      {/* Warning if no price data */}
      {driverList.length > 0 && !hasCalculatedData && (
        <View className="mx-5 mt-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <View className="flex-row items-center">
            <Text className="text-2xl mr-2">⏳</Text>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-yellow-900">
                Calculating Route Details
              </Text>
              <Text className="text-xs text-yellow-700 mt-1">
                Prices and times are being calculated. Please wait a moment...
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Drivers List */}
      <FlatList
        data={driverList}
        renderItem={renderDriverCard}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 120, // Extra space for button
        }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            <Text className="text-gray-500 text-base mb-2">
              No drivers available
            </Text>
            <Text className="text-xs text-gray-400 text-center px-8">
              Make sure you've selected a destination to see available drivers
            </Text>
          </View>
        }
      />

      {/* Bottom Fixed Button Container */}
      <View className="px-5 pb-6  pt-2">
        <CustomButton
          title={
            !hasCalculatedData
              ? "Calculating prices..."
              : selectedDriver
              ? "Continue to Book"
              : "Select a Driver"
          }
          onPress={handleConfirmRide}
          disabled={!selectedDriver || !hasCalculatedData}
          className={`${
            !selectedDriver || !hasCalculatedData ? "bg-gray-300" : "bg-blue-600"
          }`}
        />
     </View>
    </SafeAreaView>
  );
};

export default FindRide;