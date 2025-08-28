import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import ProductCard from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const { data: products, isLoading } = useQuery({
    queryKey: ['/api/products'],
    select: (data) => data?.slice(0, 6), // Show only first 6 products
  });

  const categories = [
    {
      name: "Headboards",
      image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
      href: "/products?category=headboards"
    },
    {
      name: "Tables", 
      image: "https://images.unsplash.com/photo-1549497538-303791108f95?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
      href: "/products?category=tables"
    },
    {
      name: "Seating",
      image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
      href: "/products?category=seating"
    },
    {
      name: "Storage",
      image: "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
      href: "/products?category=storage"
    }
  ];

  return (
    <div>
      {/* Hero Section */}
      <section className="relative h-96 md:h-[600px] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent z-10"></div>
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&h=1080')"
          }}
        ></div>
        <div className="relative z-20 flex items-center h-full px-4 md:px-8 lg:px-16">
          <div className="max-w-2xl text-white">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4" data-testid="text-hero-title">
              Handcrafted Furniture
              <span className="block text-secondary">Made for You</span>
            </h1>
            <p className="text-lg md:text-xl mb-6 text-gray-200" data-testid="text-hero-description">
              Discover unique, bespoke furniture pieces crafted with passion in South Africa. 
              From custom headboards to dining tables, we bring your vision to life.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/products">
                <Button className="bg-primary text-primary-foreground px-6 py-3 rounded-md font-medium hover:bg-primary/90 transition-colors" data-testid="button-browse-collection">
                  Browse Collection
                </Button>
              </Link>
              <Link href="/custom-design">
                <Button variant="outline" className="bg-transparent border-2 border-white text-white px-6 py-3 rounded-md font-medium hover:bg-white hover:text-gray-900 transition-colors" data-testid="button-custom-design">
                  Custom Design
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Categories */}
      <section className="py-12 px-4 md:px-8 lg:px-16">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8" data-testid="text-categories-title">
            Shop by Category
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {categories.map((category) => (
              <Link key={category.name} href={category.href}>
                <div className="bg-card rounded-lg material-shadow hover-lift transition-all cursor-pointer" data-testid={`card-category-${category.name.toLowerCase()}`}>
                  <img 
                    src={category.image} 
                    alt={`Custom ${category.name.toLowerCase()}`}
                    className="w-full h-32 md:h-40 object-cover rounded-t-lg"
                    data-testid={`img-category-${category.name.toLowerCase()}`}
                  />
                  <div className="p-4">
                    <h3 className="font-medium text-center" data-testid={`text-category-name-${category.name.toLowerCase()}`}>
                      {category.name}
                    </h3>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-12 px-4 md:px-8 lg:px-16 bg-muted">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold" data-testid="text-featured-products-title">
              Featured Products
            </h2>
            <Link href="/products">
              <Button variant="ghost" className="text-primary font-medium hover:text-primary/80 transition-colors" data-testid="button-view-all-products">
                View All <span className="material-icons text-sm ml-1">arrow_forward</span>
              </Button>
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="bg-card rounded-lg material-shadow p-4">
                  <Skeleton className="w-full h-48 rounded-lg mb-4" />
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full mb-3" />
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-10 w-24" />
                  </div>
                </div>
              ))
            ) : products?.length ? (
              products.map((product) => (
                <ProductCard key={product.prodId} product={product} />
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground" data-testid="text-no-products">No products available at the moment.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Custom Design Process */}
      <section className="py-12 px-4 md:px-8 lg:px-16 bg-primary text-primary-foreground">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4" data-testid="text-process-title">
            Our Custom Design Process
          </h2>
          <p className="text-lg mb-8 opacity-90" data-testid="text-process-description">
            From concept to creation, we guide you through every step
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center" data-testid="step-consultation">
              <div className="w-16 h-16 bg-primary-foreground text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-icons text-2xl">chat</span>
              </div>
              <h3 className="font-medium text-lg mb-2">1. Consultation</h3>
              <p className="opacity-80">Share your vision and requirements with our design team</p>
            </div>
            
            <div className="text-center" data-testid="step-design">
              <div className="w-16 h-16 bg-primary-foreground text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-icons text-2xl">design_services</span>
              </div>
              <h3 className="font-medium text-lg mb-2">2. Design</h3>
              <p className="opacity-80">We create detailed plans and 3D renderings for approval</p>
            </div>
            
            <div className="text-center" data-testid="step-crafting">
              <div className="w-16 h-16 bg-primary-foreground text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-icons text-2xl">build</span>
              </div>
              <h3 className="font-medium text-lg mb-2">3. Crafting</h3>
              <p className="opacity-80">Our skilled artisans bring your design to life with precision</p>
            </div>
            
            <div className="text-center" data-testid="step-delivery">
              <div className="w-16 h-16 bg-primary-foreground text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-icons text-2xl">local_shipping</span>
              </div>
              <h3 className="font-medium text-lg mb-2">4. Delivery</h3>
              <p className="opacity-80">We deliver and install your custom piece with care</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-12 px-4 md:px-8 lg:px-16">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-bold text-lg mb-4 text-primary" data-testid="text-footer-title">
                The Uncommon Room
              </h3>
              <p className="text-muted-foreground text-sm mb-4" data-testid="text-footer-description">
                Crafting unique, handmade furniture in South Africa. Every piece tells a story.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-muted-foreground hover:text-primary" data-testid="link-facebook">
                  <span className="material-icons">facebook</span>
                </a>
                <a href="#" className="text-muted-foreground hover:text-primary" data-testid="link-instagram">
                  <span className="material-icons">camera_alt</span>
                </a>
                <a href="#" className="text-muted-foreground hover:text-primary" data-testid="link-email">
                  <span className="material-icons">email</span>
                </a>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-4">Products</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/products?category=headboards"><a className="text-muted-foreground hover:text-primary">Headboards</a></Link></li>
                <li><Link href="/products?category=tables"><a className="text-muted-foreground hover:text-primary">Tables</a></Link></li>
                <li><Link href="/products?category=seating"><a className="text-muted-foreground hover:text-primary">Seating</a></Link></li>
                <li><Link href="/products?category=storage"><a className="text-muted-foreground hover:text-primary">Storage</a></Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-4">Services</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/custom-design"><a className="text-muted-foreground hover:text-primary">Custom Design</a></Link></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary">Furniture Repair</a></li>
                <li><Link href="/inquiry"><a className="text-muted-foreground hover:text-primary">Consultation</a></Link></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary">Delivery</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-4">Contact</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li data-testid="text-contact-location">📍 Cape Town, South Africa</li>
                <li data-testid="text-contact-phone">📞 +27 XX XXX XXXX</li>
                <li data-testid="text-contact-email">📧 hello@theuncommonroom.co.za</li>
                <li data-testid="text-contact-instagram">📱 @theuncommonroom_za</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p data-testid="text-copyright">
              &copy; 2024 The Uncommon Room. All rights reserved. | Privacy Policy | Terms of Service
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
