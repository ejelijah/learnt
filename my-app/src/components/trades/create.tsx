import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../superbaseClient';
import '../../css/app.css';
interface Product {
  id: string;
  prod_name: string;
  description: string;
  price: number;
  product_pic: string[];
  user_id: string;
  created_at: string;
}

const Create = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<'buy' | 'manage'>('buy');
  const [products, setProducts] = useState<Product[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<any>(null); // State for the Zillow-style modal

  useEffect(() => {
    fetchUserAndProducts();
  }, []);

  const fetchUserAndProducts = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);

      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((product) => {
    if (view === 'buy') {
      return product.user_id !== userId;
    } else {
      return product.user_id === userId;
    }
  });

  const deleteProduct = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this listing?")) {
      const { error } = await supabase.from('listings').delete().eq('id', id);
      if (!error) {
        setProducts(products.filter(p => p.id !== id));
      } else {
        alert("Error deleting product");
      }
    }
  };

  // Helper to clean image URLs from ["url"] format
  const getCleanImages = (picData: any): string[] => {
    if (!picData) return [];
    if (Array.isArray(picData)) return picData.map(url => url.replace(/[\[\]"]/g, ''));
    if (typeof picData === 'string') return [picData.replace(/[\[\]"]/g, '')];
    return [];
  };



  const handleChatWithSeller = async (sellerId: string) => {
    if (!userId) return alert("Please log in to chat");
  
    try {
      // Check if a conversation already exists between you and this seller
      const { data: existing, error: fetchError } = await supabase
        .from('conversations')
        .select('id')
        .or(`and(participant_1.eq.${userId},participant_2.eq.${sellerId}),and(participant_1.eq.${sellerId},participant_2.eq.${userId})`)
        .maybeSingle();
  
      if (existing) {
        navigate(`/chat/${existing.id}`);
      } else {
        // Create new conversation
        const { data: newConv, error: insertError } = await supabase
          .from('conversations')
          .insert([{ participant_1: userId, participant_2: sellerId }])
          .select()
          .single();
  
        if (newConv) navigate(`/chat/${newConv.id}`);
        else throw insertError;
      }
    } catch (err) {
      console.error("Chat error:", err);
    }

    document.getElementById('payment')?.addEventListener('click', () => {
      alert("we appreciate that you are considering to make a purchase, but the payment system is currently under development. Please check back later!");
    });
    
  };
  

  return (
    <div className="w-full max-w-7xl mx-auto p-6 min-h-screen">
      {/* Back Button */}
      <button 
        onClick={() => navigate(-1)}
        className="fixed top-6 left-6 z-40 p-2 backdrop-blur-sm border border-gray-200 shadow-sm hover:bg-gray-100 rounded-full transition-all flex items-center justify-center active:scale-95 bg-white/80"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
      </button>

      <div className="flex flex-col gap-6 mb-10 mt-12">
        <div className="flex items-center justify-between">
          <h1 className="text-primary text-3xl font-bold">
            {view === 'buy' ? 'Marketplace' : 'My Listings'}
          </h1>

          <div className="bg-gray-100 p-1.5 rounded-xl flex gap-1 shadow-sm">
            <button 
              onClick={() => setView('buy')}
              className={`px-6 py-2 rounded-lg transition-all text-sm font-medium ${view === 'buy' ? 'bg-white shadow-md text-blue-600' : 'bg-transparent text-gray-500 hover:text-gray-700'}`}
            >
              Buy
            </button>
            <button 
              onClick={() => setView('manage')}
              className={`px-6 py-2 rounded-lg transition-all text-sm font-medium ${view === 'manage' ? 'bg-white shadow-md text-blue-600' : 'bg-transparent text-gray-500 hover:text-gray-700'}`}
            >
              Manage
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-8">
          {view === 'manage' && (
            <div className="flex justify-end">
              <button 
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl transition-all font-semibold shadow-lg shadow-blue-500/25 flex items-center gap-2 transform active:scale-95 "
                onClick={() => navigate('/product')}
              >
                + Create New Listing
              </button>
            </div>
          )}

          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product) => {
                const images = getCleanImages(product.product_pic);
                const imageSrc = images.length > 0 ? images[0] : null;

                return (
                  <div key={product.id} 
                    onClick={() => setSelectedProduct(product)}
                    className="cursor-pointer group bg-white border border-gray-100 rounded-3xl overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col"
                  >
                    <div className="w-full aspect-square bg-gray-100 rounded-t-3xl overflow-hidden relative border-b border-gray-50">
                      {imageSrc ? (
                        <img 
                          src={imageSrc} 
                          alt={product.prod_name || "Product"}
                          className="w-full h-full object-cover block"
                          onError={(e) => {
                            e.currentTarget.src = "https://via.placeholder.com/300?text=Image+Error";
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs text-center p-4">
                          No image found
                        </div>
                      )}
                    </div>

                    <div className="p-5 flex flex-col flex-grow">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-gray-900 truncate pr-2">{product.prod_name}</h3>
                        <span className="text-blue-600 font-bold whitespace-nowrap">USD {product.price.toLocaleString()}</span>
                      </div>
                      <p className="text-gray-500 text-sm line-clamp-2 mb-4 flex-grow">{product.description}</p>
                      
                      <div className="flex gap-2">
                        <button className="flex-grow py-2.5 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50 transition-colors">
                          {view === 'buy' ? 'View Details' : 'Edit'}
                        </button>
                        {view === 'manage' && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteProduct(product.id);
                            }}
                            className="px-3 py-2.5 rounded-xl border border-red-100 text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-200 py-32 rounded-3xl text-center flex flex-col items-center justify-center space-y-4">
              <div className="bg-gray-50 p-4 rounded-full text-gray-300">
                <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
              </div>
              <p className=" text-secondary">
                {view === 'buy' ? 'No products available from other sellers.' : "You haven't listed any products yet."}
              </p>
              {view === 'manage' && (
                <button onClick={() => navigate('/product')} className="text-blue-600 text-sm font-bold hover:underline">
                  Create your first listing
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Zillow-Style Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl relative animate-in fade-in zoom-in duration-200">
            
            <button 
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 z-50 bg-white/90 p-2 rounded-full hover:bg-white shadow-md transition-all active:scale-90"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>

            {/* Image Carousel (Snap Scrolling) */}
            <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide h-[400px] bg-gray-50">
              {getCleanImages(selectedProduct.product_pic).length > 0 ? (
                getCleanImages(selectedProduct.product_pic).map((url, idx) => (
                  <img 
                    key={idx}
                    src={url} 
                    className="flex-shrink-0 w-full h-full object-cover snap-center"
                    alt={`Product ${idx}`}
                  />
                ))
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">No images available</div>
              )}
            </div>

            {/* Content Section */}
            <div className="p-8">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedProduct.prod_name}</h2>
                  <p className="text-blue-600 font-bold text-xl mt-1">USD {selectedProduct.price.toLocaleString()}</p>
                </div>
              </div>

              <div className="h-px bg-gray-100 w-full mb-6" />

              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Description</h4>
                <p className="text-gray-600 leading-relaxed">
                  {selectedProduct.description || "No description provided for this listing."}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="mt-10 grid grid-cols-2 gap-4">
                <button 
                onClick={() => handleChatWithSeller(selectedProduct.user_id)}
          
                  
                  className="py-4 px-6 bg-gray-100 text-gray-900 font-bold rounded-2xl hover:bg-gray-200 transition-all active:scale-95"

                >
                  Chat with Seller
                </button>
                <button 
                  onClick={() => console.log("Processing payment for:", selectedProduct.id)}
                  id='payment'
                  className="py-4 px-6 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95"
                >
                  Pay Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Create;


