import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Image, Alert, ActivityIndicator} from "react-native";
import { router } from "expo-router";
import { StripeProvider, useStripe } from "@stripe/stripe-react-native";
import { useUser } from "@clerk/clerk-expo";
import { ReactNativeModal } from "react-native-modal";

import RideLayout from "@/components/RideLayout";
import { icons, images } from "@/constants";
import { useDriverStore, useLocationStore } from "@/store";
import CustomButton from "@/components/CustomButton";
import { fetchAPI } from "@/lib/fetch";

const BookRideContent = () => {
  const { user } = useUser();
  const { userAddress, destinationAddress, userLatitude, userLongitude, destinationLatitude, destinationLongitude } = useLocationStore();
  const { drivers, selectedDriver } = useDriverStore();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [loading, setLoading] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [success, setSuccess] = useState(false);

  // Get selected driver details
  const driverDetails = drivers?.find(
    (driver) => driver.id === selectedDriver
  );

  // Handle null addresses with fallback
  const pickupAddress = userAddress || "Pickup location not set";
  const dropoffAddress = destinationAddress || "Destination not set";

  // Check if driver data is incomplete (missing price/time)
  const isDriverDataIncomplete = !driverDetails || !driverDetails.price || !driverDetails.time;

  // Validate required data
  if (!driverDetails) {
    return (
      <RideLayout title="Book Ride" snapPoints={["55%"]}>
        <View className="flex-1 items-center justify-center px-5">
          <Text className="text-lg text-gray-900 text-center mb-2">
            No driver selected
          </Text>
          <Text className="text-sm text-gray-600 text-center mb-4">
            Please go back and select a driver.
          </Text>
          <CustomButton
            title="Go Back"
            onPress={() => router.back()}
            className="mt-4"
          />
        </View>
      </RideLayout>
    );
  }

  // Show error if price/time data is missing
  if (isDriverDataIncomplete) {
    return (
      <RideLayout title="Book Ride" snapPoints={["55%"]}>
        <View className="flex-1 items-center justify-center px-5">
          <View className="bg-yellow-50 rounded-2xl p-6 mb-4">
            <Text className="text-lg font-bold text-gray-900 text-center mb-2">
              ⚠️ Incomplete Route Data
            </Text>
            <Text className="text-sm text-gray-600 text-center mb-4">
              Price and time information are missing. Please make sure you've selected both pickup and destination locations.
            </Text>
            <Text className="text-xs text-gray-500 text-center">
              Missing: {!driverDetails.price ? "Price " : ""}{!driverDetails.time ? "Time" : ""}
            </Text>
          </View>
          <CustomButton
            title="Go Back to Map"
            onPress={() => router.back()}
            className="bg-yellow-500"
          />
        </View>
      </RideLayout>
    );
  }

  // Initialize payment sheet with Expo Router API
  const initializePaymentSheet = async () => {
    try {
      const amount = driverDetails.price?.toString() || "0";
      const driverName = user?.fullName || user?.emailAddresses[0]?.emailAddress?.split("@")[0] || "Guest";
      const driverEmail = user?.emailAddresses[0]?.emailAddress || "";

      // Validate minimum amount
      const numericAmount = parseFloat(amount);
      if (numericAmount < 0.5) {
        Alert.alert(
          "Invalid Amount",
          `The ride fare ($${amount}) is below Stripe's minimum charge of $0.50. Please contact support.`
        );
        return false;
      }

      // Create payment intent using your existing API route
      const { paymentIntent, ephemeralKey, customer } = await fetchAPI(
        "/(api)/(stripe)/create",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: driverName,
            email: driverEmail,
            amount: amount,
          }),
        },
      );

      if (!paymentIntent) {
        throw new Error("Failed to create payment intent");
      }

      const { error } = await initPaymentSheet({
        merchantDisplayName: "MyRide",
        customerId: customer,
        customerEphemeralKeySecret: ephemeralKey.secret,
        paymentIntentClientSecret: paymentIntent.client_secret,
        defaultBillingDetails: {
          name: user?.fullName || undefined,
          email: user?.emailAddresses[0]?.emailAddress || undefined,
        },
        returnURL: "myapp://book-ride",
      });

      if (error) {
        console.error("Error initializing payment sheet:", error);
        Alert.alert("Error", error.message);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error in initializePaymentSheet:", error);
      Alert.alert("Error", "Failed to initialize payment. Please try again.");
      return false;
    }
  };

  // Handle payment
  const handlePayment = async () => {
    setLoading(true);

    try {
      const initialized = await initializePaymentSheet();

      if (!initialized) {
        setLoading(false);
        return;
      }

      const { error } = await presentPaymentSheet();

      if (error) {
        if (error.code === "Canceled") {
          Alert.alert("Payment Cancelled", "You cancelled the payment.");
        } else {
          Alert.alert("Payment Failed", error.message);
        }
        setLoading(false);
        return;
      }

      // Payment successful - create ride in database
      try {
        const farePrice = driverDetails.price ? parseInt(driverDetails.price.toString()) * 100 : 0;
        const rideTime = Math.round(driverDetails.time || 0); // Round to integer (e.g., 11)
        
        await fetchAPI("/(api)/ride/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            origin_address: userAddress || "Unknown",
            destination_address: destinationAddress || "Unknown",
            origin_latitude: userLatitude || 0,
            origin_longitude: userLongitude || 0,
            destination_latitude: destinationLatitude || 0,
            destination_longitude: destinationLongitude || 0,
            ride_time: rideTime, // Send as integer, NOT string
            fare_price: farePrice,
            payment_status: "paid",
            driver_id: driverDetails.id,
            user_id: user?.id || "",
          }),
        });

        // Show success modal after 500ms delay
        setTimeout(() => {
          setLoading(false);
          setSuccess(true);
        }, 500);
      } catch (rideError) {
        console.error("Error creating ride:", rideError);
        setLoading(false);
        Alert.alert(
          "Warning",
          "Payment was successful but there was an issue saving your ride. Please contact support."
        );
      }
    } catch (error) {
      console.error("Payment error:", error);
      setLoading(false);
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    }
  };

  return (
    <RideLayout title="Book Ride" snapPoints={["75%","85%", "95%"]}>
      <View className="flex-1">
        
        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ paddingBottom:20 }}
          showsVerticalScrollIndicator={true}
        >
      
        {/* Driver Profile */}
        <View className="items-center py-4 mb-4">
          <View
            className="mb-2"
            style={{
              borderWidth: 3,
              borderColor: '#3B82F6',
              borderRadius: 40,
              padding: 2,
              backgroundColor: '#F3F4F6',
            }}
          >
            {!imageError && driverDetails.profile_image_url ? (
              <Image
                source={{ uri: driverDetails.profile_image_url }}
                style={{ width: 64, height: 64, borderRadius: 32 }}
                resizeMode="cover"
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
              />
            ) : (
              <View style={{ 
                width: 64, 
                height: 64, 
                borderRadius: 32, 
                backgroundColor: '#3B82F6', 
                justifyContent: 'center', 
                alignItems: 'center' 
              }}>
                <Text style={{ fontSize: 28, color: '#FFFFFF', fontWeight: 'bold' }}>
                  {driverDetails.first_name?.[0]}{driverDetails.last_name?.[0]}
                </Text>
              </View>
            )}
          </View>

          <Text className="text-lg font-bold text-gray-900 mb-1">
            {driverDetails.title}
          </Text>

          <View className="flex-row items-center bg-yellow-50 px-3 py-1 rounded-full">
            <Image source={icons.star} className="w-3.5 h-3.5" resizeMode="contain" />
            <Text className="text-xs font-bold text-yellow-600 ml-1">
              {driverDetails.rating}
            </Text>
          </View>
        </View>

        {/* Payment Summary */}
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
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-base font-bold text-gray-900">
              Payment Summary
            </Text>
            <View className="bg-green-100 px-2.5 py-1 rounded-full">
              <Text className="text-xs font-semibold text-green-700">SECURE</Text>
            </View>
          </View>

          {/* Fare Details */}
          <View className="bg-white rounded-xl p-3 mb-3">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-sm text-gray-600">Base Fare</Text>
              <Text className="text-sm text-gray-900">${driverDetails.price}</Text>
            </View>
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-sm text-gray-600">Service Fee</Text>
              <Text className="text-sm text-gray-900">$0.00</Text>
            </View>
            <View className="h-px bg-gray-200 my-2" />
            <View className="flex-row justify-between items-center">
              <Text className="text-base font-bold text-gray-900">Total</Text>
              <Text className="text-xl font-bold text-green-600">
                ${driverDetails.price}
              </Text>
            </View>
          </View>

          {/* Trip Info */}
          <View className="flex-row items-center justify-between py-2.5 border-t border-gray-200">
            <Text className="text-sm text-gray-600">Pickup Time</Text>
            <Text className="text-sm font-semibold text-gray-900">
              {Math.round(driverDetails.time || 0)} min
            </Text>
          </View>

          <View className="flex-row items-center justify-between py-2.5 border-t border-gray-200">
            <Text className="text-sm text-gray-600">Seats Available</Text>
            <Text className="text-sm font-semibold text-gray-900">
              {driverDetails.car_seats}
            </Text>
          </View>
        </View>

        {/* Route Summary */}
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
      <View className="px-5 pb-14 pt-0">
        <CustomButton
          title={loading ? "Processing..." : `Pay $${driverDetails.price}`}
          onPress={handlePayment}
          disabled={loading}
          className={loading ? "bg-gray-400" : "bg-blue-600"}
        />

        {loading && (
          <View className="flex-row items-center justify-center mt-2">
            <ActivityIndicator size="small" color="#3B82F6" />
            <Text className="text-xs text-gray-600 ml-2">
              Initializing secure payment...
            </Text>
          </View>
        )}

        <Text className="text-xs text-gray-500 text-center mt-2">
          By continuing, you agree to our Terms & Conditions
        </Text>
      </View>
      
      </View>

      {/* Success Modal */}
      <ReactNativeModal
        isVisible={success}
        onBackdropPress={() => setSuccess(false)}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        backdropOpacity={0.9}
        useNativeDriver={true}
        hideModalContentWhileAnimating={true}
      >
        <View className="flex flex-col items-center justify-center bg-white p-7 rounded-2xl mx-5">
          <Image source={images.check} className="w-28 h-28 mt-5" />

          <Text className="text-2xl text-center font-JakartaBold mt-5">
            Booking placed successfully
          </Text>

          <Text className="text-md text-general-200 font-JakartaRegular text-center mt-3">
            Thank you for your booking. Your reservation has been successfully
            placed. Please proceed with your trip.
          </Text>

          <CustomButton
            title="Back Home"
            onPress={() => {
              setSuccess(false);
              router.push("/(root)/(tabs)/home");
            }}
            className="mt-5"
          />
        </View>
      </ReactNativeModal>
    </RideLayout>
  );
};

const BookRide = () => {
  return (
    <StripeProvider
      publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!}
      merchantIdentifier="merchant.com.myride"
      urlScheme="myapp"
    >
      <BookRideContent />
    </StripeProvider>
  );
};

export default BookRide;