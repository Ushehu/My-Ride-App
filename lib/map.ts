import { Driver, MarkerData } from "@/types/type";

const geoapifyAPI = process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY;

export const generateMarkersFromData = ({
  data,
  userLatitude,
  userLongitude,
}: {
  data: Driver[];
  userLatitude: number;
  userLongitude: number;
}): MarkerData[] => {
  return data.map((driver) => {
    const latOffset = (Math.random() - 0.5) * 0.01; // Random offset between -0.005 and 0.005
    const lngOffset = (Math.random() - 0.5) * 0.01; // Random offset between -0.005 and 0.005

    return {
      latitude: userLatitude + latOffset,
      longitude: userLongitude + lngOffset,
      title: `${driver.first_name} ${driver.last_name}`,
      ...driver,
    };
  });
};

export const calculateRegion = ({
  userLatitude,
  userLongitude,
  destinationLatitude,
  destinationLongitude,
}: {
  userLatitude: number | null;
  userLongitude: number | null;
  destinationLatitude?: number | null;
  destinationLongitude?: number | null;
}) => {
  if (!userLatitude || !userLongitude) {
    return {
      latitude: 37.78825,
      longitude: -122.4324,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
  }

  if (!destinationLatitude || !destinationLongitude) {
    return {
      latitude: userLatitude,
      longitude: userLongitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
  }

  const minLat = Math.min(userLatitude, destinationLatitude);
  const maxLat = Math.max(userLatitude, destinationLatitude);
  const minLng = Math.min(userLongitude, destinationLongitude);
  const maxLng = Math.max(userLongitude, destinationLongitude);

  const latitudeDelta = (maxLat - minLat) * 1.3; // Adding some padding
  const longitudeDelta = (maxLng - minLng) * 1.3; // Adding some padding

  const latitude = (userLatitude + destinationLatitude) / 2;
  const longitude = (userLongitude + destinationLongitude) / 2;

  return {
    latitude,
    longitude,
    latitudeDelta,
    longitudeDelta,
  };
};

export const calculateDriverTimes = async ({
  markers,
  userLatitude,
  userLongitude,
  destinationLatitude,
  destinationLongitude,
}: {
  markers: MarkerData[];
  userLatitude: number | null;
  userLongitude: number | null;
  destinationLatitude: number | null;
  destinationLongitude: number | null;
}) => {
  if (
    !userLatitude ||
    !userLongitude ||
    !destinationLatitude ||
    !destinationLongitude
  )
    return;

  if (!geoapifyAPI) {
    console.error("EXPO_PUBLIC_GEOAPIFY_API_KEY is not set in .env");
    return;
  }

  try {
    console.log("Calculating times with Geoapify API...");

    const timesPromises = markers.map(async (marker) => {
      try {
        // Get time from driver to user using Geoapify
        const responseToUser = await fetch(
          `https://api.geoapify.com/v1/routing?waypoints=${marker.latitude},${marker.longitude}|${userLatitude},${userLongitude}&mode=drive&apiKey=${geoapifyAPI}`
        );
        const dataToUser = await responseToUser.json();

        // Check if API returned valid data
        if (!dataToUser.features || dataToUser.features.length === 0) {
          console.error("Geoapify API error (driver to user):", dataToUser);
          // Use fallback calculation
          const distanceToUser = calculateDistance(
            marker.latitude,
            marker.longitude,
            userLatitude,
            userLongitude
          );
          const timeToUser = (distanceToUser / 40) * 3600; // 40 km/h average
          
          const responseToDestination = await fetch(
            `https://api.geoapify.com/v1/routing?waypoints=${userLatitude},${userLongitude}|${destinationLatitude},${destinationLongitude}&mode=drive&apiKey=${geoapifyAPI}`
          );
          const dataToDestination = await responseToDestination.json();
          
          const timeToDestination = dataToDestination.features?.[0]?.properties?.time || 
            (calculateDistance(userLatitude, userLongitude, destinationLatitude, destinationLongitude) / 40) * 3600;
          
          const totalTime = (timeToUser + timeToDestination) / 60;
          const price = (totalTime * 0.5).toFixed(2);
          
          return { ...marker, time: totalTime, price };
        }

        // Time in seconds from Geoapify
        const timeToUser = dataToUser.features[0].properties.time;

        // Get time from user to destination
        const responseToDestination = await fetch(
          `https://api.geoapify.com/v1/routing?waypoints=${userLatitude},${userLongitude}|${destinationLatitude},${destinationLongitude}&mode=drive&apiKey=${geoapifyAPI}`
        );
        const dataToDestination = await responseToDestination.json();

        // Check if API returned valid data
        if (!dataToDestination.features || dataToDestination.features.length === 0) {
          console.error("Geoapify API error (user to destination):", dataToDestination);
          // Use fallback
          const distanceToDestination = calculateDistance(
            userLatitude,
            userLongitude,
            destinationLatitude,
            destinationLongitude
          );
          const timeToDestination = (distanceToDestination / 40) * 3600;
          const totalTime = (timeToUser + timeToDestination) / 60;
          const price = (totalTime * 0.5).toFixed(2);
          
          return { ...marker, time: totalTime, price };
        }

        // Time in seconds from Geoapify
        const timeToDestination = dataToDestination.features[0].properties.time;

        const totalTime = (timeToUser + timeToDestination) / 60; // Total time in minutes
        const price = (totalTime * 0.5).toFixed(2); // $0.50 per minute

        console.log(`Driver ${marker.id}: ${totalTime.toFixed(1)} min, $${price}`);

        return { ...marker, time: totalTime, price };
      } catch (error) {
        console.error(`Error calculating time for driver ${marker.id}:`, error);
        // Return marker with estimated price based on distance
        const distance = calculateDistance(
          userLatitude,
          userLongitude,
          destinationLatitude,
          destinationLongitude
        );
        const estimatedTime = (distance / 40) * 60; // 40 km/h average speed
        const estimatedPrice = (estimatedTime * 0.5).toFixed(2);
        
        return { ...marker, time: estimatedTime, price: estimatedPrice };
      }
    });

    const results = await Promise.all(timesPromises);
    console.log("All driver times calculated successfully!");
    return results;
  } catch (error) {
    console.error("Error calculating driver times:", error);
    // Return markers with estimated prices as fallback
    return markers.map(marker => {
      const distance = calculateDistance(
        userLatitude,
        userLongitude,
        destinationLatitude,
        destinationLongitude
      );
      const estimatedTime = (distance / 40) * 60;
      const estimatedPrice = (estimatedTime * 0.5).toFixed(2);
      return { ...marker, time: estimatedTime, price: estimatedPrice };
    });
  }
};

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in kilometers
  return distance;
}
