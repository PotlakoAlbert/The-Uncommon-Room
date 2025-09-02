import { db } from "./db";
import { users, products, admins, inventory } from "@shared/schema";
import bcrypt from "bcrypt";

async function seed() {
  console.log("🌱 Starting database seeding...");

  try {
    // Create admin user (skip if exists)
    try {
      const adminPasswordHash = await bcrypt.hash("admin123", 12);
      const [admin] = await db.insert(admins).values({
        name: "Admin User",
        email: "admin@theuncommonroom.co.za",
        passwordHash: adminPasswordHash,
        phone: "+27 21 123 4567",
        address: "Cape Town, South Africa",
      }).returning();
      console.log("✅ Admin user created:", admin.email);
      
      // Also create corresponding user record
      try {
        await db.insert(users).values({
          name: admin.name,
          email: admin.email,
          passwordHash: admin.passwordHash,
          role: 'admin',
          phone: admin.phone,
          address: admin.address,
          adminId: admin.adminId
        });
        console.log("✅ Admin user record created in users table");
      } catch (userError: any) {
        if (userError.code === '23505') {
          console.log("ℹ️ Admin user record already exists in users table");
        } else {
          console.error("Failed to create admin user record:", userError);
        }
      }
    } catch (error: any) {
      if (error.code === '23505') {
        console.log("ℹ️ Admin user already exists, skipping...");
      } else {
        throw error;
      }
    }

    // Create test customer (skip if exists)
    try {
      const customerPasswordHash = await bcrypt.hash("customer123", 12);
      const [customer] = await db.insert(users).values({
        name: "John Doe",
        email: "customer@example.com",
        passwordHash: customerPasswordHash,
        phone: "+27 82 123 4567",
        address: "123 Main Street, Cape Town, 8001",
      }).returning();
      console.log("✅ Test customer created:", customer.email);
    } catch (error: any) {
      if (error.code === '23505') {
        console.log("ℹ️ Test customer already exists, skipping...");
      } else {
        throw error;
      }
    }

    // Create sample products
    const sampleProducts = [
      {
        name: "Classic Wooden Dining Table",
        description: "A beautiful handcrafted wooden dining table made from reclaimed oak. Perfect for family gatherings and dinner parties.",
        price: "8500.00",
        category: "tables" as const,
        material: "Reclaimed Oak",
        dimensions: "200cm x 100cm x 75cm",
        mainImage: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800",
        galleryImages: [
          "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800",
          "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800"
        ],
      },
      {
        name: "Luxury Tufted Headboard",
        description: "Elegant upholstered headboard with premium fabric and tufted design. Adds sophistication to any bedroom.",
        price: "4500.00",
        category: "headboards" as const,
        material: "Premium Fabric & Wood",
        dimensions: "180cm x 120cm",
        mainImage: "https://images.unsplash.com/photo-1615529328331-f8917597711f?w=800",
        galleryImages: [
          "https://images.unsplash.com/photo-1615529328331-f8917597711f?w=800",
          "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800"
        ],
      },
      {
        name: "Modern Glass Coffee Table",
        description: "Sleek and modern coffee table with tempered glass top and brushed steel legs. Perfect for contemporary living spaces.",
        price: "3200.00",
        category: "tables" as const,
        material: "Tempered Glass & Steel",
        dimensions: "120cm x 60cm x 45cm",
        mainImage: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800",
        galleryImages: [
          "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800"
        ],
      },
      {
        name: "Premium Leather Armchair",
        description: "Plush armchair with ergonomic design and premium Italian leather upholstery. Perfect for reading or relaxing.",
        price: "6800.00",
        category: "seating" as const,
        material: "Italian Leather & Hardwood",
        dimensions: "85cm x 95cm x 100cm",
        mainImage: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800",
        galleryImages: [
          "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800"
        ],
      },
      {
        name: "Multi-Drawer Storage Cabinet",
        description: "Multi-purpose storage cabinet with six drawers and open shelving. Great for organizing any room with style.",
        price: "5200.00",
        category: "storage" as const,
        material: "Solid Pine Wood",
        dimensions: "150cm x 60cm x 200cm",
        mainImage: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800",
        galleryImages: [
          "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800"
        ],
      },
      {
        name: "Custom Mahogany Bookshelf",
        description: "Handcrafted bookshelf with adjustable shelves and elegant mahogany finish. Perfect for displaying books and decor.",
        price: "3800.00",
        category: "storage" as const,
        material: "Solid Mahogany Wood",
        dimensions: "180cm x 30cm x 200cm",
        mainImage: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800",
        galleryImages: [
          "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800"
        ],
      },
      {
        name: "Rustic Farmhouse Headboard",
        description: "Rustic wooden headboard with weathered finish and metal accents. Brings warmth and character to your bedroom.",
        price: "3200.00",
        category: "headboards" as const,
        material: "Reclaimed Wood & Metal",
        dimensions: "160cm x 110cm",
        mainImage: "https://images.unsplash.com/photo-1615529328331-f8917597711f?w=800",
        galleryImages: [
          "https://images.unsplash.com/photo-1615529328331-f8917597711f?w=800"
        ],
      },
      {
        name: "Executive Office Chair",
        description: "High-back executive chair with genuine leather upholstery and ergonomic support. Perfect for long working hours.",
        price: "4200.00",
        category: "seating" as const,
        material: "Genuine Leather & Chrome",
        dimensions: "70cm x 70cm x 120cm",
        mainImage: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800",
        galleryImages: [
          "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800"
        ],
      },
      {
        name: "Industrial Side Table",
        description: "Industrial-style side table with metal frame and reclaimed wood top. Perfect accent piece for modern interiors.",
        price: "1800.00",
        category: "tables" as const,
        material: "Reclaimed Wood & Metal",
        dimensions: "50cm x 50cm x 60cm",
        mainImage: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800",
        galleryImages: [
          "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800"
        ],
      },
      {
        name: "Velvet Accent Chair",
        description: "Elegant accent chair with plush velvet upholstery and gold-finished legs. A statement piece for any room.",
        price: "3600.00",
        category: "seating" as const,
        material: "Velvet & Brass",
        dimensions: "75cm x 80cm x 85cm",
        mainImage: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800",
        galleryImages: [
          "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800"
        ],
      },
    ];

    const createdProducts = await db.insert(products).values(sampleProducts).returning();
    console.log(`✅ Created ${createdProducts.length} products`);

    // Create inventory for products
    const inventoryData = createdProducts.map(product => ({
      productId: product.prodId,
      quantity: Math.floor(Math.random() * 20) + 5, // Random quantity between 5-25
      costPrice: (parseFloat(product.price) * 0.6).toString(), // 60% of selling price
    }));

    await db.insert(inventory).values(inventoryData);
    console.log(`✅ Created inventory for ${inventoryData.length} products`);

    console.log("\n🎉 Database seeding completed successfully!");
    console.log("\n📋 Admin Credentials:");
    console.log("Email: admin@theuncommonroom.co.za");
    console.log("Password: admin123");
    console.log("\n👤 Test Customer Credentials:");
    console.log("Email: customer@example.com");
    console.log("Password: customer123");

  } catch (error) {
    console.error("❌ Seeding failed:", error);
    throw error;
  }
}

// Run the seed function
seed()
  .then(() => {
    console.log("✅ Seeding completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  });
