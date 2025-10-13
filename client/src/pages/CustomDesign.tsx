import { useState } from "react";
import { useSelector } from "react-redux";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { RootState } from "@/store/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const customDesignSchema = z.object({
  furnitureType: z.string().min(1, "Furniture type is required"),
  dimensions: z.string().optional(),
  materialPreference: z.string().optional(),
  colorPreference: z.string().optional(),
  specialRequirements: z.string().optional(),
  budgetRange: z.string().optional(),
  // New: optional multi-line reference links (one URL per line)
  referenceLinks: z.string().optional(),
});

type CustomDesignFormData = z.infer<typeof customDesignSchema>;

export default function CustomDesign() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  
  const form = useForm<CustomDesignFormData>({
    resolver: zodResolver(customDesignSchema),
    defaultValues: {
      furnitureType: "",
      dimensions: "",
      materialPreference: "",
      colorPreference: "",
      specialRequirements: "",
      budgetRange: "",
      referenceLinks: "",
    },
  });

  const submitDesignMutation = useMutation({
    mutationFn: async (data: CustomDesignFormData) => {
      const formData = new FormData();
      
      // Add form fields
      Object.entries(data).forEach(([key, value]) => {
        if (key !== 'referenceLinks' && value) formData.append(key, value as string);
      });
      
      // Add files
      if (selectedFiles) {
        Array.from(selectedFiles).forEach((file) => {
          formData.append('images', file);
        });
      }

      // Add reference links as JSON string array
      if (data.referenceLinks) {
        const links = data.referenceLinks
          .split(/\r?\n/)
          .map(l => l.trim())
          .filter(l => l.length > 0);
        if (links.length > 0) {
          formData.append('referenceLinks', JSON.stringify(links));
        }
      }
      const response = await apiRequest('POST', '/api/custom-designs', formData);
      if (!response.ok) throw new Error('Failed to submit design request');
      return response.json();
    },
    onSuccess: () => {
      form.reset();
      setSelectedFiles(null);
      // Clean up preview URLs
      previewUrls.forEach(url => URL.revokeObjectURL(url));
      setPreviewUrls([]);
      toast({
        title: "Design Request Submitted",
        description: "Thank you! We'll review your request and get back to you within 2-3 business days with a quote.",
      });
      if (isAuthenticated) {
        setLocation('/orders');
      }
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    processFiles(files);
  };

  const processFiles = (files: FileList | null) => {
    if (!files) return;

    // Validate file types and size
    const validFiles: File[] = [];
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];

    Array.from(files).forEach((file, index) => {
      if (validFiles.length >= 5) return; // Max 5 files
      
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a supported file type. Please use JPG, PNG, WebP, or PDF.`,
          variant: "destructive",
        });
        return;
      }
      
      if (file.size > maxSize) {
        toast({
          title: "File too large",
          description: `${file.name} is larger than 10MB. Please compress the image or choose a smaller file.`,
          variant: "destructive",
        });
        return;
      }
      
      validFiles.push(file);
    });

    if (validFiles.length === 0) return;

    // Create FileList from valid files
    const dataTransfer = new DataTransfer();
    validFiles.forEach(file => dataTransfer.items.add(file));
    setSelectedFiles(dataTransfer.files);

    // Generate preview URLs for images
    const urls: string[] = [];
    validFiles.forEach(file => {
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        urls.push(url);
      }
    });
    
    // Clean up previous URLs
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    setPreviewUrls(urls);

    if (validFiles.length > 0) {
      toast({
        title: "Files uploaded successfully!",
        description: `${validFiles.length} file${validFiles.length > 1 ? 's' : ''} ready to upload.`,
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    processFiles(files);
  };

  const removeFile = (index: number) => {
    if (!selectedFiles) return;
    
    const dataTransfer = new DataTransfer();
    Array.from(selectedFiles).forEach((file, i) => {
      if (i !== index) dataTransfer.items.add(file);
    });
    
    setSelectedFiles(dataTransfer.files.length > 0 ? dataTransfer.files : null);
    
    // Update preview URLs
    const newUrls = previewUrls.filter((_, i) => i !== index);
    URL.revokeObjectURL(previewUrls[index]);
    setPreviewUrls(newUrls);
  };

  const onSubmit = (data: CustomDesignFormData) => {
    if (!isAuthenticated) {
      setLocation('/login');
      return;
    }
    submitDesignMutation.mutate(data);
  };

  return (
    <div className="py-12 px-4 md:px-8 lg:px-16">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-4" data-testid="text-custom-design-title">
            Custom Design Request ✨
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg" data-testid="text-custom-design-description">
            Have a unique vision? Let's bring your dream furniture to life! Our skilled craftsmen specialize in creating 
            one-of-a-kind pieces that perfectly match your style and space.
          </p>
          <div className="flex items-center justify-center space-x-4 mt-4 text-sm text-primary">
            <div className="flex items-center">
              <span className="material-icons text-lg mr-1">schedule</span>
              2-3 day response
            </div>
            <div className="flex items-center">
              <span className="material-icons text-lg mr-1">verified</span>
              Expert craftsmanship
            </div>
            <div className="flex items-center">
              <span className="material-icons text-lg mr-1">local_shipping</span>
              Free consultation
            </div>
          </div>
        </div>

        {!isAuthenticated && (
          <Card className="material-shadow mb-8 bg-accent/10">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <span className="material-icons text-primary">info</span>
                <div>
                  <h3 className="font-medium">Login Required</h3>
                  <p className="text-sm text-muted-foreground">
                    Please log in to submit a custom design request. This helps us track your request and send updates.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="material-shadow">
          <CardHeader className="space-y-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center" data-testid="text-design-form-title">
                <span className="material-icons mr-2 text-primary">design_services</span>
                Tell Us About Your Vision
              </CardTitle>
              <div className="flex items-center space-x-2 px-3 py-1 bg-primary/10 rounded-full">
                <span className="material-icons text-primary text-sm">edit_note</span>
                <span className="text-sm font-medium text-primary">Design Request Form</span>
              </div>
            </div>
            <p className="text-muted-foreground">
              The more details you provide, the better we can understand and create your perfect piece. Take your time and share everything that comes to mind! ✨
            </p>
            <div className="flex items-center space-x-4 text-sm bg-amber-50 border border-amber-200 rounded-lg p-3">
              <span className="material-icons text-amber-600">tips_and_updates</span>
              <div className="flex-1">
                <span className="font-medium text-amber-800">Tip: </span>
                <span className="text-amber-700">Don't worry about getting everything perfect - we'll discuss all the details in our consultation call!</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {/* Personal Information */}
                {isAuthenticated && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-border">
                    <div>
                      <label className="block text-sm font-medium mb-2">Full Name</label>
                      <Input 
                        value={user?.name || ''} 
                        disabled 
                        className="bg-muted"
                        data-testid="input-customer-name-readonly"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Email Address</label>
                      <Input 
                        value={user?.email || ''} 
                        disabled 
                        className="bg-muted"
                        data-testid="input-customer-email-readonly"
                      />
                    </div>
                  </div>
                )}

                {/* Design Specifications */}
                <div className="space-y-6">
                  <div className="border-l-4 border-primary pl-4">
                    <h3 className="font-semibold text-lg mb-1">🪑 What would you like us to create?</h3>
                    <p className="text-sm text-muted-foreground">Start by telling us the type of furniture and your budget range.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="furnitureType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-medium">What type of furniture? *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-furniture-type" className="h-12">
                                <SelectValue placeholder="Choose your furniture type..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="headboard">🛏️ Headboard</SelectItem>
                              <SelectItem value="dining-table">🍽️ Dining Table</SelectItem>
                              <SelectItem value="coffee-table">☕ Coffee Table</SelectItem>
                              <SelectItem value="chair">🪑 Chair/Seating</SelectItem>
                              <SelectItem value="storage">📦 Storage/Cabinet</SelectItem>
                              <SelectItem value="desk">💻 Desk</SelectItem>
                              <SelectItem value="bookshelf">📚 Bookshelf</SelectItem>
                              <SelectItem value="other">✨ Something else entirely</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="budgetRange"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-medium">What's your budget range?</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-budget-range" className="h-12">
                                <SelectValue placeholder="Choose your budget range..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="1000-3000">💵 R 1,000 - R 3,000 (Simple designs)</SelectItem>
                              <SelectItem value="3000-5000">💰 R 3,000 - R 5,000 (Standard pieces)</SelectItem>
                              <SelectItem value="5000-10000">🌟 R 5,000 - R 10,000 (Premium quality)</SelectItem>
                              <SelectItem value="10000-20000">✨ R 10,000 - R 20,000 (Luxury designs)</SelectItem>
                              <SelectItem value="20000+">💎 R 20,000+ (Exceptional pieces)</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground mt-1">
                            Don't worry - this is just to help us understand your expectations. We'll provide an accurate quote!
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h3 className="font-semibold text-lg mb-1">📏 Size & Specifications</h3>
                    <p className="text-sm text-muted-foreground">Help us understand the size and materials you have in mind.</p>
                  </div>

                  <FormField
                    control={form.control}
                    name="dimensions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium">What size should it be?</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., 2m long, 1m wide, 75cm high (or however you'd describe it!)"
                            {...field}
                            data-testid="input-dimensions"
                            className="h-12"
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground mt-1">
                          Any format is fine - we'll work with you to get exact measurements later.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="materialPreference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium">What material would you prefer?</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-material-preference" className="h-12">
                              <SelectValue placeholder="Choose your preferred material..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="oak">🌳 Oak (Strong & classic)</SelectItem>
                            <SelectItem value="pine">🌲 Pine (Light & affordable)</SelectItem>
                            <SelectItem value="mahogany">🪵 Mahogany (Rich & elegant)</SelectItem>
                            <SelectItem value="cherry">🍒 Cherry (Warm & beautiful)</SelectItem>
                            <SelectItem value="bamboo">🎋 Bamboo (Eco-friendly)</SelectItem>
                            <SelectItem value="metal">⚡ Metal (Modern & durable)</SelectItem>
                            <SelectItem value="mixed">🎨 Mixed Materials (Get creative!)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="colorPreference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium">What colors or finish do you like?</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Natural wood, Dark walnut stain, Matte black, White painted..."
                            {...field}
                            data-testid="input-color-preference"
                            className="h-12"
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground mt-1">
                          Describe the look you're going for - we have lots of finish options!
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-6">
                  <div className="border-l-4 border-green-500 pl-4">
                    <h3 className="font-semibold text-lg mb-1">💭 Your Vision</h3>
                    <p className="text-sm text-muted-foreground">Tell us about your ideas, special needs, and inspiration!</p>
                  </div>

                  <FormField
                    control={form.control}
                    name="specialRequirements"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium">Describe your vision and any special requirements</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tell us about your ideas! For example:&#10;• Special features (drawers, hidden compartments, charging stations)&#10;• Style preferences (modern, rustic, minimalist, industrial)&#10;• Where it will go and how it will be used&#10;• Any specific measurements or constraints&#10;• Inspiration or design elements you love&#10;&#10;The more you tell us, the better we can create your perfect piece!"
                            rows={6}
                            {...field}
                            data-testid="textarea-special-requirements"
                            className="resize-none"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-6">
                  <div className="border-l-4 border-purple-500 pl-4">
                    <h3 className="font-semibold text-lg mb-1">📸 Show Us Your Inspiration</h3>
                    <p className="text-sm text-muted-foreground">
                      Share photos or links to help us understand the style and look you want.
                    </p>
                  </div>

                  {/* Enhanced File Upload */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="block text-base font-medium flex items-center">
                        <span className="material-icons mr-2 text-primary">add_photo_alternate</span>
                        Upload Your Photos 📸
                      </label>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">Optional</span>
                    </div>

                    <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <span className="material-icons text-green-600 mt-1">photo_camera</span>
                        <div>
                          <p className="text-sm font-medium text-green-800 mb-2">📷 What photos help us most?</p>
                          <div className="grid grid-cols-2 gap-2 text-xs text-green-700">
                            <div className="flex items-center">
                              <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-2"></span>
                              Room measurements & space
                            </div>
                            <div className="flex items-center">
                              <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-2"></span>
                              Inspiration furniture photos
                            </div>
                            <div className="flex items-center">
                              <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-2"></span>
                              Hand-drawn sketches/ideas
                            </div>
                            <div className="flex items-center">
                              <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-2"></span>
                              Style examples you like
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div 
                      className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                        isDragging 
                          ? 'border-primary bg-primary/10 scale-[1.02]' 
                          : selectedFiles && selectedFiles.length > 0
                          ? 'border-green-400 bg-green-50'
                          : 'border-primary/20 bg-gradient-to-br from-primary/5 to-transparent hover:border-primary/40'
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      {selectedFiles && selectedFiles.length > 0 ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-center mb-4">
                            <span className="material-icons text-green-600 text-3xl mr-2">check_circle</span>
                            <div>
                              <p className="text-lg font-medium text-green-800">
                                {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} ready to upload!
                              </p>
                              <p className="text-sm text-green-600">
                                Drag more files here or click to add more (max 5 total)
                              </p>
                            </div>
                          </div>

                          {/* Image Preview Grid */}
                          {previewUrls.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                              {previewUrls.map((url, index) => (
                                <div key={index} className="relative group">
                                  <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border-2 border-gray-200">
                                    <img 
                                      src={url} 
                                      alt={`Preview ${index + 1}`}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removeFile(index)}
                                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                  >
                                    <span className="material-icons text-sm">close</span>
                                  </button>
                                  <div className="absolute bottom-1 left-1 right-1 bg-black/70 text-white text-xs px-2 py-1 rounded truncate">
                                    {selectedFiles && selectedFiles[index]?.name}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* File List for non-image files */}
                          {selectedFiles && Array.from(selectedFiles).some(f => !f.type.startsWith('image/')) && (
                            <div className="bg-white border border-gray-200 rounded-lg p-3">
                              <p className="text-sm font-medium mb-2">Other files:</p>
                              <ul className="space-y-1">
                                {Array.from(selectedFiles).map((file, index) => (
                                  !file.type.startsWith('image/') && (
                                    <li key={index} className="flex items-center justify-between text-sm">
                                      <div className="flex items-center">
                                        <span className="material-icons text-red-500 mr-2 text-sm">
                                          {file.type.includes('pdf') ? 'picture_as_pdf' : 'attach_file'}
                                        </span>
                                        <span>{file.name}</span>
                                        <span className="text-xs text-muted-foreground ml-2">
                                          ({(file.size / 1024 / 1024).toFixed(1)} MB)
                                        </span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => removeFile(index)}
                                        className="text-red-500 hover:text-red-700"
                                      >
                                        <span className="material-icons text-sm">delete</span>
                                      </button>
                                    </li>
                                  )
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="mb-4">
                            <span className="material-icons text-6xl text-primary/40 mb-2 animate-pulse">
                              {isDragging ? 'file_download' : 'add_photo_alternate'}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-medium text-xl mb-2 text-gray-800">
                              {isDragging ? 'Drop your files here!' : 'Share Your Vision Through Photos'}
                            </h4>
                            <p className="text-muted-foreground mb-4">
                              {isDragging 
                                ? 'Release to upload your inspiration photos'
                                : 'Drag & drop photos here, or click to browse your files'
                              }
                            </p>
                          </div>
                        </div>
                      )}

                      <input
                        ref={(input) => {
                          if (input) {
                            (input as any).openFilePicker = () => input.click();
                          }
                        }}
                        type="file"
                        multiple
                        accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                        onChange={handleFileChange}
                        className="hidden"
                        id="file-upload"
                        data-testid="input-reference-images"
                      />
                      
                      <Button 
                        type="button" 
                        variant={selectedFiles && selectedFiles.length > 0 ? "outline" : "default"}
                        size="lg"
                        className={`cursor-pointer ${
                          selectedFiles && selectedFiles.length > 0
                            ? 'border-green-500 text-green-700 hover:bg-green-50'
                            : 'bg-primary text-white hover:bg-primary/90'
                        }`}
                        onClick={() => {
                          const fileInput = document.getElementById('file-upload') as HTMLInputElement;
                          if (fileInput) {
                            fileInput.click();
                          }
                        }}
                        data-testid="button-choose-files"
                      >
                        <span className="material-icons mr-2">
                          {selectedFiles && selectedFiles.length > 0 ? 'add_photo_alternate' : 'cloud_upload'}
                        </span>
                        {selectedFiles && selectedFiles.length > 0 ? 'Add More Photos' : 'Choose Photos'}
                      </Button>

                      <div className="mt-4 flex items-center justify-center space-x-4 text-xs text-muted-foreground">
                        <div className="flex items-center">
                          <span className="material-icons mr-1 text-xs">image</span>
                          JPG, PNG, WebP, PDF
                        </div>
                        <div className="flex items-center">
                          <span className="material-icons mr-1 text-xs">data_usage</span>
                          Max 10MB each
                        </div>
                        <div className="flex items-center">
                          <span className="material-icons mr-1 text-xs">folder</span>
                          Up to 5 files
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Reference Links */}
                  <div>
                    <label className="block text-base font-medium mb-3">Share Inspiration Links</label>
                    <div className="space-y-3">
                      <FormField
                        control={form.control}
                        name="referenceLinks"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Textarea
                                placeholder="🔗 Paste links to inspiration (one per line):&#10;&#10;https://pinterest.com/pin/...&#10;https://instagram.com/p/...&#10;https://example-furniture-site.com/...&#10;&#10;Pinterest boards, Instagram posts, furniture websites, or any other inspiration you found online!"
                                rows={5}
                                {...field}
                                data-testid="textarea-reference-links"
                                className="resize-none font-mono text-sm"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex items-start space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <span className="material-icons text-blue-600 mt-0.5">lightbulb</span>
                        <div className="text-sm">
                          <p className="font-medium text-blue-800 mb-1">💡 Pro tip:</p>
                          <p className="text-blue-700">
                            Pinterest, Instagram, and furniture websites are great sources of inspiration! 
                            Even if you don't have the exact link, just describe what you saw.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="space-y-6 pt-6 border-t border-border">
                  <div className="text-center">
                    <div className="inline-flex items-center space-x-2 px-4 py-2 bg-green-50 border border-green-200 rounded-full text-green-800 text-sm mb-4">
                      <span className="material-icons text-sm">verified</span>
                      <span>Free consultation • No obligation • Expert advice</span>
                    </div>
                    
                    <Button
                      type="submit"
                      size="lg"
                      className="bg-gradient-to-r from-primary to-primary/80 text-white px-12 py-4 rounded-xl font-semibold hover:from-primary/90 hover:to-primary/70 transition-all duration-200 shadow-lg hover:shadow-xl"
                      disabled={submitDesignMutation.isPending}
                      data-testid="button-submit-design-request"
                    >
                      {submitDesignMutation.isPending ? (
                        <>
                          <span className="material-icons animate-spin mr-3">hourglass_empty</span>
                          <span className="text-lg">Sending Your Request...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-icons mr-3 text-xl">send</span>
                          <span className="text-lg">Send My Custom Design Request</span>
                        </>
                      )}
                    </Button>
                    
                    <div className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-4">
                      <p className="text-sm font-semibold text-center text-gray-800 mb-3 flex items-center justify-center">
                        <span className="material-icons mr-2 text-blue-600">timeline</span>
                        🚀 Your Custom Design Journey
                      </p>
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex flex-col items-center text-center flex-1">
                          <div className="w-8 h-8 bg-blue-100 border-2 border-blue-500 rounded-full flex items-center justify-center mb-2">
                            <span className="material-icons text-blue-600 text-sm">send</span>
                          </div>
                          <span className="font-medium text-blue-800">Submit Request</span>
                          <span className="text-blue-600">Right now!</span>
                        </div>
                        <div className="flex-1 h-px bg-gradient-to-r from-blue-300 to-green-300 mx-2"></div>
                        <div className="flex flex-col items-center text-center flex-1">
                          <div className="w-8 h-8 bg-green-100 border-2 border-green-500 rounded-full flex items-center justify-center mb-2">
                            <span className="material-icons text-green-600 text-sm">visibility</span>
                          </div>
                          <span className="font-medium text-green-800">We Review</span>
                          <span className="text-green-600">Within 24 hours</span>
                        </div>
                        <div className="flex-1 h-px bg-gradient-to-r from-green-300 to-purple-300 mx-2"></div>
                        <div className="flex flex-col items-center text-center flex-1">
                          <div className="w-8 h-8 bg-purple-100 border-2 border-purple-500 rounded-full flex items-center justify-center mb-2">
                            <span className="material-icons text-purple-600 text-sm">phone</span>
                          </div>
                          <span className="font-medium text-purple-800">Consultation</span>
                          <span className="text-purple-600">Personal call</span>
                        </div>
                        <div className="flex-1 h-px bg-gradient-to-r from-purple-300 to-orange-300 mx-2"></div>
                        <div className="flex flex-col items-center text-center flex-1">
                          <div className="w-8 h-8 bg-orange-100 border-2 border-orange-500 rounded-full flex items-center justify-center mb-2">
                            <span className="material-icons text-orange-600 text-sm">description</span>
                          </div>
                          <span className="font-medium text-orange-800">Get Quote</span>
                          <span className="text-orange-600">2-3 days</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Process Overview */}
        <Card className="material-shadow mt-8">
          <CardHeader>
            <CardTitle data-testid="text-process-overview-title">Our Custom Design Process</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="material-icons">chat</span>
                </div>
                <h3 className="font-medium mb-2">1. Consultation</h3>
                <p className="text-sm text-muted-foreground">We review your request and discuss your vision</p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="material-icons">calculate</span>
                </div>
                <h3 className="font-medium mb-2">2. Quote</h3>
                <p className="text-sm text-muted-foreground">We provide a detailed quote and timeline</p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="material-icons">build</span>
                </div>
                <h3 className="font-medium mb-2">3. Creation</h3>
                <p className="text-sm text-muted-foreground">Our craftsmen bring your design to life</p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="material-icons">local_shipping</span>
                </div>
                <h3 className="font-medium mb-2">4. Delivery</h3>
                <p className="text-sm text-muted-foreground">We deliver and install your custom piece</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
