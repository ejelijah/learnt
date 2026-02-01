import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { supabase } from '../../../superbaseClient';

const CreateProduct = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setImages((prev) => [...prev, ...selectedFiles]);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (images.length === 0) {
      alert("Please upload at least one image.");
      return;
    }

    setUploading(true);

    try {
      const imageUrls = [];

      // 1. Upload Images to Supabase Storage
      for (const file of images) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('products')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('products')
          .getPublicUrl(filePath);
        
        imageUrls.push(publicUrl);
      }

      // 2. Save Product Data to Database
      const { error: dbError } = await supabase
        .from('listings')
        .insert([
          {
            prod_name:name,
            description: description,
            price: parseFloat(price),
            product_pic: imageUrls,
            user_id: (await supabase.auth.getUser()).data.user?.id,
          },
        ]);

      if (dbError) throw dbError;

      alert('Product created successfully!');
      navigate('/create'); 
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Error saving product. Check console.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen w-full mx-auto bg-opacity-10 backdrop-blur-lg rounded-lg p-4 md:p-8 shadow-lg overflow-y-auto">
  {/* Wrap the button in a div to ensure it stays in the block flow */}
  <div className="w-full ">
    <button 
      onClick={() => navigate(-1)}
      className="mt-6 p-2 rounded-full transition-colors inline-flex items-center hover:bg-gray-200 btu hover:text-black"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m15 18-6-6 6-6"/>
      </svg>
      <span className="ml-1 font-medium">Back</span>
    </button>
  </div>

  <h1 className="text-3xl font-bold md:text-3xl text-primary">
    Create New Listing
  </h1>



      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Image Upload Area */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-secondary">Product Images (At least 1)</label>
          <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:border-blue-500 transition-colors bg-gray-50 relative">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="space-y-2">
              <div className="flex justify-center text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
              </div>
              <p className="text-sm text-gray-600">Click or drag to upload multiple images</p>
            </div>
          </div>

          {/* Image Previews */}
          {images.length > 0 && (
            <div className="grid grid-cols-4 gap-4 mt-4">
              {images.map((file, index) => (
                <div key={index} className="relative group aspect-square">
                  <img
                    src={URL.createObjectURL(file)}
                    alt="preview"
                    className="w-full h-full object-cover rounded-xl border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Product Name */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-secondary">Product Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Vintage Camera"
            className="w-full p-3.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
          />
        </div>

        {/* Price */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-secondary">Price (USD)</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-xs">USD</span>
            <input
              type="number"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              className="w-full pl-14 pr-4 py-3.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-secondary">Description</label>
          <textarea
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Tell buyers about your product..."
            className="w-full p-3.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={uploading}
          className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all ${
            uploading 
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98] shadow-blue-500/25'
          }`}
        >
          {uploading ? 'Uploading Product...' : 'List Product Now'}
        </button>
      </form>
    </div>
  );
};

export default CreateProduct;


