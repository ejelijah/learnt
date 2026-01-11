import React, { useEffect, useState } from 'react';
import '../../css/gen.css';
import '../../css/wel.css';
import '../../css/cards.css';
import { supabase } from '../../superbaseClient';
import { useNavigate, useLocation } from 'react-router-dom';

interface Flashcard {
  id?: string;
  question: string;
  answer: string;
}

const Cards = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [foldername, setFoldername] = useState("");
  const [containerId, setContainerId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Fetch user and load deck if editing
  useEffect(() => {
    let mounted = true;

    const initializeComponent = async () => {
      try {
        console.log('🔍 Starting initialization...');
        console.log('📍 Location state:', location.state);
        
        // Get user
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) {
          console.error('❌ User error:', userError);
          throw userError;
        }
        
        const user = userData?.user;
        if (!user) {
          console.error('❌ No user found');
          throw new Error("User not logged in.");
        }
        
        console.log('✅ User found:', user.id);
        setUserId(user.id);

        // Check if editing existing deck
        const state = location.state as { containerId?: string; deckTitle?: string } | null;
        
        if (state?.containerId) {
          console.log('📝 Edit mode - Container ID:', state.containerId);
          
          // EDIT MODE - Load existing deck
          setIsEditMode(true);
          setContainerId(state.containerId);
          setFoldername(state.deckTitle || "");

          // Fetch container details
          const { data: containerData, error: containerError } = await supabase
            .from("flashcards_container")
            .select("*")
            .eq("id", state.containerId)
            .single();

          if (containerError) {
            console.error('❌ Container error:', containerError);
            throw new Error(`Failed to load deck: ${containerError.message}`);
          }
          
          console.log('✅ Container loaded:', containerData);
          setIsPublic(containerData.is_public);

          // Fetch existing cards for this deck
          const { data: cardsData, error: cardsError } = await supabase
            .from("flashcards")
            .select("*")
            .eq("container_id", state.containerId);

          if (cardsError) {
            console.error('❌ Cards error:', cardsError);
            throw new Error(`Failed to load cards: ${cardsError.message}`);
          }

          console.log('✅ Cards loaded:', cardsData?.length || 0, 'cards');
          if (mounted) setCards(cardsData || []);
        } else {
          console.log('✨ Create mode - starting fresh');
          // CREATE MODE - Start fresh
          setIsEditMode(false);
        }
      } catch (err) {
        console.error("❌ Error initializing:", err);
        
        // Better error handling
        let errorMessage = "An unknown error occurred";
        if (err instanceof Error) {
          errorMessage = err.message;
        } else if (typeof err === 'object' && err !== null) {
          errorMessage = JSON.stringify(err);
        } else {
          errorMessage = String(err);
        }
        
        setError(errorMessage);
      } finally {
        console.log('✅ Initialization complete');
        if (mounted) setLoading(false);
      }
    };

    initializeComponent();
    return () => { mounted = false; };
  }, [location.state]);

  // Add new flashcard (only adds to local state)
  const handleAddFlashcard = () => {
    if (!question.trim() || !answer.trim()) {
      alert("Please enter both question and answer");
      return;
    }

    const newCard: Flashcard = {
      id: `temp-${Date.now()}`,
      question,
      answer
    };

    console.log('➕ Adding card:', newCard);
    setCards(prev => [...prev, newCard]);
    setQuestion("");
    setAnswer("");
  };

  // Delete flashcard from current list
  const handleDeleteFlashcard = (cardIndex: number) => {
    console.log('🗑️ Deleting card at index:', cardIndex);
    setCards(prev => prev.filter((_, i) => i !== cardIndex));
    if (index >= cards.length - 1) {
      setIndex(Math.max(0, cards.length - 2));
    }
  };

  // Save or Update deck
  const handlesave = async () => {
    console.log('💾 Saving deck...');
    
    if (!userId) {
      setError("User not logged in.");
      return;
    }
    if (cards.length === 0) {
      setError("No flashcards to save.");
      return;
    }
    if (!foldername.trim()) {
      setError("Please enter a folder name.");
      return;
    }

    try {
      if (isEditMode && containerId) {
        console.log('📝 Updating existing deck:', containerId);
        console.log("State before update:", isPublic);
        
        // UPDATE existing deck
        const { error: updateError } = await supabase
          .from("flashcards_container")
          .update({ title: foldername, is_public: isPublic })
          .eq("id", containerId);

        if (updateError) throw new Error(`Update failed: ${updateError.message}`);

        // Delete old cards
        await supabase.from("flashcards").delete().eq("container_id", containerId);

        // Insert updated cards
        const flashcardsToInsert = cards.map(card => ({
          question: card.question,
          answer: card.answer,
          container_id: containerId
        }));

        const { error: insertError } = await supabase
          .from("flashcards")
          .insert(flashcardsToInsert);

        if (insertError) throw new Error(`Card insert failed: ${insertError.message}`);

        console.log('✅ Deck updated successfully');
        alert("Deck updated successfully!");
        navigate('/Home');
      } else {
        console.log('✨ Creating new deck');
        
        // CREATE new deck
        const { data: containerData, error: containerError } = await supabase
          .from("flashcards_container")
          .insert({ title: foldername, user_id: userId, is_public: isPublic })
          .select()
          .single();

        if (containerError) throw new Error(`Create failed: ${containerError.message}`);

        console.log('✅ Container created:', containerData.id);

        // Insert flashcards with the new container ID
        const flashcardsToInsert = cards.map(card => ({
          question: card.question,
          answer: card.answer,
          container_id: containerData.id
        }));


        const { error: insertError } = await supabase
          .from("flashcards")
          .insert(flashcardsToInsert);

        if (insertError) throw new Error(`Card insert failed: ${insertError.message}`);

        console.log('✅ Deck created successfully');
        alert("Deck created successfully!");
        navigate('/');
      }
    } catch (err) {
      console.error("❌ Error saving deck:", err);
      
      let errorMessage = "Failed to save deck";
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null) {
        errorMessage = JSON.stringify(err);
      }
      
      setError(errorMessage);
    }
  };

  // Delete entire deck
  const handleDeleteDeck = async () => {
    if (!containerId || !isEditMode) return;

    const confirmDelete = window.confirm("Are you sure you want to delete this entire deck? This cannot be undone.");
    if (!confirmDelete) return;

    try {
      console.log('🗑️ Deleting entire deck:', containerId);
      
      // Delete all cards in the deck
      await supabase.from("flashcards").delete().eq("set_id", containerId);

      // Delete the container
      const { error } = await supabase
        .from("flashcards_container")
        .delete()
        .eq("id", containerId);

      if (error) throw new Error(`Delete failed: ${error.message}`);

      console.log('✅ Deck deleted successfully');
      alert("Deck deleted successfully!");
      navigate('/Home');
    } catch (err) {
      console.error("❌ Error deleting deck:", err);
      
      let errorMessage = "Failed to delete deck";
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen text-white">Loading flashcards...</div>;
  
  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-screen text-red-500 px-4">
      <h2 className="text-2xl font-bold mb-4">Error</h2>
      <p className="text-center mb-4">{error}</p>
      <button 
        onClick={() => navigate('/Home')}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white"
      >
        Go Back Home
      </button>
    </div>
  );

  const card = cards[index];

  return (
    <div className="container min-h-screen text-white text-center px-4 py-8">

  {/* <div 
    className='profile-container mb-8'
    onClickCapture={(e) => {
      console.log('🔴 CLICK CAPTURED!', e.target);
      console.log('🔴 Event phase:', e.eventPhase);
      console.log('🔴 Current target:', e.currentTarget);
    }}
  >
    <Profile />
  </div> */}
  <button 
              onClick={() => navigate(-1)}
              className="fixed top-6 left-6 z-50 p-2  backdrop-blur-sm border border-gray-200 shadow-sm hover:bg-gray-800 rounded-full transition-all flex items-center justify-center active:scale-95"
              aria-label="Go back"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="24" 
                height="24" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="m15 18-6-6 6-6"/>
              </svg>
            </button>


  <div className="gen">

    <div className="w-full max-w-3xl mx-auto  bg-opacity-10 backdrop-blur-lg rounded-lg p-6 shadow-lg">
      <h2 className="text-3xl font-bold mb-2 text-center">
        {isEditMode ? "Edit Deck" : "Create New Deck"}
      </h2>
      <p className="text-white-400 mb-6 text-center">
        Click on the card to flip between question and answer.
      </p>

      {cards.length > 0 ? (
        <div className="mb-8">
          <div
            className="flashcard bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg p-8 min-h-[200px] flex items-center justify-center text-xl font-medium cursor-pointer shadow-lg hover:shadow-xl transition-shadow"
            onClick={() => setFlipped((f) => !f)}
          >
            {flipped ? card.answer : card.question}
          </div>

          <div className="flex justify-center gap-3 mt-4">
            <button
              onClick={() => {
                setFlipped(false);
                setIndex((i) => Math.max(0, i - 1));
              }}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
            >
              Prev
            </button>
            <button
              onClick={() => {
                setFlipped(false);
                setIndex((i) => (i + 1) % cards.length);
              }}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
            >
              Next
            </button>
            <button
              onClick={() => {
                setFlipped(false);
                setIndex(0);
              }}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
            >
              Restart
            </button>
          </div>
        </div>
      ) : (
        <p className="text-white-400 mb-8 text-center">
          No flashcards yet — create your first one below 👇{" "}
        </p>
      )}

      <input
        type="text"
        className="w-full max-w-md mx-auto px-4 py-3 bg-white-800 border border-gray-700 rounded-lg text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-6"
        placeholder="e.g Biology 2020"
        value={foldername}
        onChange={(e) => setFoldername(e.target.value)}
      />

      <div className="mt-8 mb-6">
        <h3 className="text-xl font-semibold mb-4 text-center">
          Create a new flashcard
        </h3>

        <input
          type="text"
          placeholder="question, e.g what is a cell"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="w-full max-w-md mx-auto px-4 py-3 bg-white-800 border border-gray-700 rounded-lg text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
        />

        <input
          type="text"
          placeholder="Answer, e.g a cell is the unit of life?"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          className="w-full max-w-md mx-auto px-4 py-3 bg-white-800 border border-gray-700 rounded-lg text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
        />
      </div>

      <div className="flex flex-wrap justify-center gap-3 mb-6">
        <button
          onClick={handleAddFlashcard}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors font-medium"
        >
          Add Flashcard
        </button>

        {cards.length > 0 && (
          <button
            onClick={() => handleDeleteFlashcard(index)}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-md transition-colors font-medium"
          >
            Delete Current Card
          </button>
        )}

        <button
          onClick={handlesave}
          className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-md transition-colors font-medium"
        >
          {isEditMode ? "Update Deck" : "Save Deck"}
        </button>

        {isEditMode && (
          <button
            onClick={handleDeleteDeck}
            className="px-6 py-2 bg-gray-600 hover:bg-gray-700 rounded-md transition-colors font-medium"
          >
            Delete Entire Deck
          </button>
        )}
      </div>

      <label className="flex items-center justify-center gap-2 text-white-300 cursor-pointer simple-hover">
        <input
          type="checkbox"
          checked={isPublic}
          onChange={(e) => {setIsPublic(e.target.checked)
            console.log('🌐 Public toggle:', e.target.checked);
          }}
          className="w-4 h-4 accent-blue-600"

        />
        Make this deck public
      </label>
    </div>
  </div>

</div>
  );
};

export default Cards;
