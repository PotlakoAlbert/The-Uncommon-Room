import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import ProductCard from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { testNetworkConnectivity, testBackendHealth } from "@/lib/networkDebug";

export default function Products() {
  const [, setLocation] = useLocation();
  const [filters, setFilters] = useState({
    category: "",
    minPrice: "",
    maxPrice: "",
    material: "",
    search: "",
  });
  const [sortBy, setSortBy] = useState("featured");
  const [viewMode, setViewMode] = useState("grid");

  // Run network connectivity tests on component mount
  useEffect(() => {
    console.log('[Products] Component mounted, running network tests...');
    testNetworkConnectivity();
    testBackendHealth();
  }, []);

  const { data: products, isLoading, error } = useQuery({
    queryKey: ['/api/products', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      console.log('[Products] === FETCHING PRODUCTS ===');
      console.log('[Products] Filters:', filters);
      console.log('[Products] Query params:', params.toString());
      console.log('[Products] Environment VITE_API_URL:', import.meta.env.VITE_API_URL);
      
      try {
        const response = await apiRequest('GET', `/api/products?${params}`, undefined, { throwOn401: false });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('[Products] Response not OK:', {
            status: response.status,
            statusText: response.statusText,
            errorText
          });
          throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
        }
        
        const data = await response.json();
        console.log('[Products] ✅ Successfully fetched products:', {
          count: Array.isArray(data) ? data.length : 'not an array',
          data: data
        });
        return data;
      } catch (error) {
        console.error('[Products] ❌ Fetch failed:', {
          error: error instanceof Error ? error.message : error,
          type: error instanceof Error ? error.constructor.name : typeof error,
          stack: error instanceof Error ? error.stack : undefined
        });
        throw error;
      }
    },
    retry: false, // Disable retry for better debugging
    staleTime: 0, // Always fetch fresh data
  });

  const handleFilterChange = (key: string, value: string | boolean) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      category: "",
      minPrice: "",
      maxPrice: "",
      material: "",
      search: "",
    });
  };

  const sortedProducts = products ? [...products].sort((a, b) => {
    switch (sortBy) {
      case "price-low":
        return parseFloat(a.price) - parseFloat(b.price);
      case "price-high":
        return parseFloat(b.price) - parseFloat(a.price);
      case "newest":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      default:
        return 0;
    }
  }) : [];

  if (error) {
    console.error('[Products] Error loading products:', error);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Error Loading Products</h2>
          <p className="text-muted-foreground mb-4">
            Failed to load products. Please check your connection and try again.
          </p>
          <Button onClick={() => window.location.reload()}>Refresh Page</Button>
        </div>
      </div>
    );
  }

  return (
    <section className="py-12 px-4 md:px-8 lg:px-16">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className="w-full md:w-64 flex-shrink-0">
            <div className="bg-card rounded-lg material-shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium text-lg" data-testid="text-filters-title">Filters</h3>
                <Button variant="outline" size="sm" onClick={clearFilters} data-testid="button-clear-filters">
                  Clear
                </Button>
              </div>
              
              {/* Search */}
              <div className="mb-6">
                <h4 className="font-medium mb-3">Search</h4>
                <Input
                  type="text"
                  placeholder="Search products..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  data-testid="input-search"
                />
              </div>

              {/* Category Filter */}
              <div className="mb-6">
                <h4 className="font-medium mb-3">Category</h4>
                <div className="space-y-2">
                  {['headboards', 'tables', 'seating', 'storage'].map((category) => (
                    <div key={category} className="flex items-center space-x-2">
                      <Checkbox
                        id={category}
                        checked={filters.category === category}
                        onCheckedChange={(checked) => 
                          handleFilterChange('category', checked ? category : '')
                        }
                        data-testid={`checkbox-category-${category}`}
                      />
                      <label htmlFor={category} className="text-sm capitalize cursor-pointer">
                        {category}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Price Filter */}
              <div className="mb-6">
                <h4 className="font-medium mb-3">Price Range (R)</h4>
                <div className="space-y-2">
                  <Input
                    type="number"
                    placeholder="Min price"
                    value={filters.minPrice}
                    onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                    data-testid="input-min-price"
                  />
                  <Input
                    type="number"
                    placeholder="Max price"
                    value={filters.maxPrice}
                    onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                    data-testid="input-max-price"
                  />
                </div>
              </div>

              {/* Material Filter */}
              <div className="mb-6">
                <h4 className="font-medium mb-3">Material</h4>
                <div className="space-y-2">
                  {['Oak', 'Pine', 'Mahogany', 'Metal'].map((material) => (
                    <div key={material} className="flex items-center space-x-2">
                      <Checkbox
                        id={material}
                        checked={filters.material === material}
                        onCheckedChange={(checked) => 
                          handleFilterChange('material', checked ? material : '')
                        }
                        data-testid={`checkbox-material-${material.toLowerCase()}`}
                      />
                      <label htmlFor={material} className="text-sm cursor-pointer">
                        {material}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-products-title">
                Products
              </h1>
              <div className="flex items-center space-x-4">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-48" data-testid="select-sort-by">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="featured">Sort by: Featured</SelectItem>
                    <SelectItem value="price-low">Price: Low to High</SelectItem>
                    <SelectItem value="price-high">Price: High to Low</SelectItem>
                    <SelectItem value="newest">Newest</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex border border-border rounded-md">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    data-testid="button-grid-view"
                  >
                    <span className="material-icons text-sm">grid_view</span>
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    data-testid="button-list-view"
                  >
                    <span className="material-icons text-sm">view_list</span>
                  </Button>
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="bg-card rounded-lg material-shadow p-4">
                    <Skeleton className="w-full h-48 rounded-lg mb-4" />
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full mb-3" />
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-10 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : sortedProducts.length > 0 ? (
              <div className={`grid gap-6 ${
                viewMode === 'grid' 
                  ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                  : 'grid-cols-1'
              }`}>
                {sortedProducts.map((product) => (
                  <ProductCard key={product.prodId} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="material-icons text-6xl text-muted-foreground mb-4">search_off</div>
                <h3 className="text-xl font-medium mb-2" data-testid="text-no-products-title">
                  No products found
                </h3>
                <p className="text-muted-foreground mb-4" data-testid="text-no-products-description">
                  Try adjusting your filters or search terms
                </p>
                <Button onClick={clearFilters} data-testid="button-reset-filters">
                  Reset Filters
                </Button>
              </div>
            )}

            {/* Pagination could be added here if needed */}
          </div>
        </div>
      </div>
    </section>
  );
}
