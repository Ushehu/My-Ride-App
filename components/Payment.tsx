import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, Image, Text, View } from "react-native";
import { ReactNativeModal } from "react-native-modal";
import { useStripe } from "@stripe/stripe-react-native";
import { useAuth } from "@clerk/clerk-expo";

import CustomButton from "@/components/CustomButton";
import { images } from "@/constants";
import { fetchAPI } from "@/lib/fetch";
import { useLocationStore } from "@/store";
import { PaymentProps } from "@/types/type";

const Payment = ({
  fullName,
  email,
  amount,
  driverId,
  rideTime,
}: PaymentProps) => {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const {
    userAddress,
    userLongitude,
    userLatitude,
    destinationLatitude,
    destinationAddress,
    destinationLongitude,
  } = useLocationStore();

  const { userId } = useAuth();
  const [success, setSuccess] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const openPaymentSheet = async () => {
    setLoading(true);
    await initializePaymentSheet();

    const { error } = await presentPaymentSheet();

    if (error) {
      setLoading(false);
      Alert.alert(`Error code: ${error.code}`, error.message);
    }
    // Note: Don't set success here - it will be set in confirmHandler
  };

  const initializePaymentSheet = async () => {
    const { error } = await initPaymentSheet({
      merchantDisplayName: "MyRide",
      intentConfiguration: {
        mode: {
          amount: parseInt(amount) * 100,
          currencyCode: "usd",
        },
        confirmHandler: async (
          paymentMethod,
          shouldSavePaymentMethod,
          intentCreationCallback,
        ) => {
          try {
            console.log("🔄 Starting payment confirmation...");

            // Step 1: Create payment intent and customer
            const { paymentIntent, customer } = await fetchAPI(
              "/(api)/(stripe)/create",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  name: fullName || email.split("@")[0],
                  email: email,
                  amount: amount,
                  paymentMethodId: paymentMethod.id,
                }),
              },
            );

            if (paymentIntent.client_secret) {
              console.log("✅ Payment intent created");

              // Step 2: Confirm payment
              const { result } = await fetchAPI("/(api)/(stripe)/pay", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  payment_method_id: paymentMethod.id,
                  payment_intent_id: paymentIntent.id,
                  customer_id: customer,
                  client_secret: paymentIntent.client_secret,
                }),
              });

              if (result.client_secret) {
                console.log("✅ Payment confirmed");

                // Step 3: Create ride record in database
                await fetchAPI("/(api)/ride/create", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    origin_address: userAddress,
                    destination_address: destinationAddress,
                    origin_latitude: userLatitude,
                    origin_longitude: userLongitude,
                    destination_latitude: destinationLatitude,
                    destination_longitude: destinationLongitude,
                    ride_time: Math.round(rideTime), // Convert to integer
                    fare_price: parseInt(amount) * 100,
                    payment_status: "paid",
                    driver_id: driverId,
                    user_id: userId,
                  }),
                });

                console.log("✅ Ride created in database");

                // Return client secret to complete payment
                intentCreationCallback({
                  clientSecret: result.client_secret,
                });

                // Wait a moment for payment sheet to dismiss, then show success modal
                setTimeout(() => {
                  setLoading(false);
                  setSuccess(true);
                  console.log("🎉 Payment flow complete - showing modal");
                }, 500); // 500ms delay to ensure payment sheet is dismissed
              }
            }
          } catch (error) {
            console.error("❌ Payment error:", error);
            setLoading(false);
            intentCreationCallback({
              error: {
                code: "Failed",
                message: "Payment failed. Please try again.",
                localizedMessage: "Payment failed",
              },
            });
          }
        },
      },
      returnURL: "myapp://book-ride",
    });

    if (error) {
      setLoading(false);
      Alert.alert("Error", error.message);
    }
  };

  return (
    <>
      <CustomButton
        title={loading ? "Processing..." : "Confirm Ride"}
        className="my-10"
        onPress={openPaymentSheet}
        disabled={loading}
      />

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
    </>
  );
};

export default Payment;