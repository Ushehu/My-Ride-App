import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const sql = neon(process.env.DATABASE_URL!);

async function seed() {
  try {
    console.log("🌱 Starting database seed...");

    // Create drivers table
    console.log("📦 Creating drivers table...");
    await sql`
      CREATE TABLE IF NOT EXISTS drivers (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        title VARCHAR(150) NOT NULL,
        profile_image_url TEXT,
        car_image_url TEXT,
        car_seats INTEGER DEFAULT 4,
        rating DECIMAL(2, 1) DEFAULT 5.0,
        price DECIMAL(10, 2) NOT NULL,
        time INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Create rides table
    console.log("📦 Creating rides table...");
    await sql`
      CREATE TABLE IF NOT EXISTS rides (
        id SERIAL PRIMARY KEY,
        origin_address VARCHAR(255) NOT NULL,
        destination_address VARCHAR(255) NOT NULL,
        origin_latitude DECIMAL(10, 8) NOT NULL,
        origin_longitude DECIMAL(11, 8) NOT NULL,
        destination_latitude DECIMAL(10, 8) NOT NULL,
        destination_longitude DECIMAL(11, 8) NOT NULL,
        ride_time INTEGER NOT NULL,
        fare_price INTEGER NOT NULL,
        payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
        driver_id INTEGER NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Create payments table
    console.log("📦 Creating payments table...");
    await sql`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        ride_id INTEGER,
        stripe_payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
        stripe_customer_id VARCHAR(255) NOT NULL,
        amount INTEGER NOT NULL,
        currency VARCHAR(10) DEFAULT 'usd',
        status VARCHAR(50) NOT NULL,
        payment_method_id VARCHAR(255),
        user_id VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Create indexes
    console.log("🔗 Creating indexes...");
    await sql`CREATE INDEX IF NOT EXISTS idx_drivers_price ON drivers(price)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_drivers_rating ON drivers(rating)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_rides_user_id ON rides(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_rides_driver_id ON rides(driver_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_rides_created_at ON rides(created_at)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_payments_ride_id ON payments(ride_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id)`;

    // Clear existing drivers
    console.log("🗑️  Clearing existing drivers...");
    await sql`DELETE FROM drivers`;

    // Seed drivers with valid prices (≥ $0.50)
    console.log("👥 Seeding drivers...");
    const drivers = await sql`
      INSERT INTO drivers (first_name, last_name, title, profile_image_url, car_image_url, car_seats, rating, price, time)
      VALUES 
        ('James', 'Wilson', 'Economy Ride', 
         'https://randomuser.me/api/portraits/men/1.jpg',
         'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=400',
         4, 4.5, 5.00, 5),
        
        ('Michael', 'Johnson', 'Comfort Ride',
         'https://randomuser.me/api/portraits/men/2.jpg',
         'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=400',
         4, 4.8, 8.00, 8),
        
        ('Robert', 'Brown', 'Premium Sedan',
         'https://randomuser.me/api/portraits/men/3.jpg',
         'https://images.unsplash.com/photo-1617531653332-bd46c24f2068?w=400',
         4, 4.9, 12.00, 10),
        
        ('David', 'Martinez', 'Luxury SUV',
         'https://randomuser.me/api/portraits/men/4.jpg',
         'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=400',
         6, 5.0, 15.00, 12),
        
        ('Sarah', 'Anderson', 'Electric Ride',
         'https://randomuser.me/api/portraits/women/1.jpg',
         'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=400',
         4, 4.7, 7.00, 7),
        
        ('Emily', 'Davis', 'Family Van',
         'https://randomuser.me/api/portraits/women/2.jpg',
         'https://images.unsplash.com/photo-1552932522-5a35b76c0fb1?w=400',
         7, 4.9, 10.00, 9)
      RETURNING *;
    `;

    console.log(`✅ Seeded ${drivers.length} drivers`);

    // Display seeded data
    console.log("\n📊 Seeded Drivers:");
    drivers.forEach((driver) => {
      console.log(
        `   ${driver.id}. ${driver.title} - $${driver.price} (${driver.rating}⭐)`
      );
    });

    console.log("\n🎉 Database seeded successfully!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
}

seed();