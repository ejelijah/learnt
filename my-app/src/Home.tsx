import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './superbaseClient';
import Profile from './components/Profile';
import './css/Home.css' // You'll need to create this

interface Container {
  id: string;
  title: string;
  user_id: string;
  is_public: boolean;
  created_at: string;
}

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  container_id: string;
  user_id: string;
  created_at: string;
}

const Home = () => {
  const navigate = useNavigate();
  const [containers, setContainers] = useState<Container[]>([]);
  const [filteredContainers, setFilteredContainers] = useState<Container[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContainer, setSelectedContainer] = useState<Container | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [showStudyMode, setShowStudyMode] = useState(false);
  
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [studyCards, setStudyCards] = useState<Flashcard[]>([]);
  const [passedCards, setPassedCards] = useState<Flashcard[]>([]);
  const [failedCards, setFailedCards] = useState<Flashcard[]>([]);
  const [studyComplete, setStudyComplete] = useState(false);

  useEffect(() => {
    fetchContainers();
  }, []);

  useEffect(() => {
    // Filter containers based on search query
    if (searchQuery.trim() === '') {
      setFilteredContainers(containers);
    } else {
      const filtered = containers.filter(container =>
        container.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredContainers(filtered);
    }
  }, [searchQuery, containers]);

  const fetchContainers = async () => {
    const { data } = await supabase
      .from('flashcards_container')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false });
    
    if (data) {
      setContainers(data);
      setFilteredContainers(data);
    }
  };

  const fetchFlashcards = async (containerId: string) => {
    const { data } = await supabase
      .from('flashcards')
      .select('*')
      .eq('container_id', containerId)
      .order('created_at', { ascending: false });
    
    if (data) setFlashcards(data);
  };

  const handleContainerClick = async (container: Container) => {
    setSelectedContainer(container);
    await fetchFlashcards(container.id);
    setShowOptions(true);
  };

  const handleStudy = () => {
    setShowOptions(false);
    startStudyMode();
  };

  const handleEdit = () => {
    navigate('/cards', { state: 
      { containerId: selectedContainer?.id,
      deckTitle: selectedContainer?.title 
    } 
  });
  };

  const startStudyMode = () => {
    setStudyCards([...flashcards]);
    setCurrentCardIndex(0);
    setShowAnswer(false);
    setPassedCards([]);
    setFailedCards([]);
    setStudyComplete(false);
    setShowStudyMode(true);
  };

  const shuffleCards = () => {
    const shuffled = [...studyCards].sort(() => Math.random() - 0.5);
    setStudyCards(shuffled);
    setCurrentCardIndex(0);
    setShowAnswer(false);
  };

  const handleCardResponse = (passed: boolean) => {
    const currentCard = studyCards[currentCardIndex];
    
    if (passed) {
      setPassedCards([...passedCards, currentCard]);
    } else {
      setFailedCards([...failedCards, currentCard]);
    }

    if (currentCardIndex < studyCards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setShowAnswer(false);
    } else {
      setStudyComplete(true);
    }
  };

  const restudyFailedCards = () => {
    setStudyCards([...failedCards]);
    setCurrentCardIndex(0);
    setShowAnswer(false);
    setPassedCards([]);
    setFailedCards([]);
    setStudyComplete(false);
  };


  if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
  

  return (
    <div className="home-container">
      {/* Header */}

      <header className="header">

    

  {/* Top: profile left, title right */}

    <h1 className="logo">lear</h1>

  <div>
      {/* Center: search bar */}
      <div className="header-center">
      <input 
        type="text"
        placeholder="Search flashcard decks..."
        className="search-input"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      </div>

                {/* Bottom: nav buttons */}
      <nav className="nav-buttons">
      <button className="nav-btn create-btn" onClick={() => navigate('/newitem')}>
      Create New
      </button>
      <button className="nav-btn" onClick={() => navigate('/view_cards')}>
      Library
      </button>
      <button className="nav-btn"
      onClick={() => {
        navigate('/create');
      }}>Sell/Buy</button>
      </nav>
    </div>

  <div className="profile-wrapper" onClick={() => navigate('/user')}>
      <Profile />
    </div>
      </header>

      {/* Main Content - Card Grid */}
      {!showStudyMode && !showOptions && (
        <main className="main-content">
          <div className="content-header">
            <h2 className='list-cards'>My Flashcard Decks</h2>
            <p className="deck-count">{filteredContainers.length} {filteredContainers.length === 1 ? 'deck' : 'decks'}</p>
          </div>
          
          <div className="cards-grid">
            {filteredContainers.map(container => (
              <div 
                key={container.id}
                className="card-template"
                onClick={() => handleContainerClick(container)}
              >
                <div className="card-icon">📋</div>
                <h3 className="card-title">{container.title}</h3>
                <p className="card-subtitle">Click to view options</p>
                <div className="card-footer">
                  <span className="card-date">
                    {new Date(container.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          {filteredContainers.length === 0 && (
            <div className="empty-state">
              <p className="empty-icon">📚</p>
              <p className="empty-text">
                {searchQuery ? 'No decks found matching your search' : 'No decks yet. Create your first one!'}
              </p>
              {!searchQuery && (
                <button className="create-first-btn" onClick={() => navigate('/newitem')}>
                  Create First Deck
                </button>
              )}
            </div>
          )}
        </main>
      )}

      {/* Study/Edit Options Modal */}
      {showOptions && selectedContainer && (
        <div className="modal-overlay" onClick={() => setShowOptions(false)}>
          <div className="options-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowOptions(false)}>✕</button>
            <h2>{selectedContainer.title}</h2>
            <p className="modal-subtitle">{flashcards.length} cards in this deck</p>
            
            <div className="options-buttons">
              <button 
                className="option-btn study-btn" 
                onClick={handleStudy}
                disabled={flashcards.length === 0}
              >
                <span className="btn-icon">📖</span>
                <span className="btn-text">Study</span>
                <span className="btn-desc">Start studying this deck</span>
              </button>
              
              <button className="option-btn edit-btn" onClick={handleEdit}>
                <span className="btn-icon">✏️</span>
                <span className='btn-text'>Edit</span>
                <span className="btn-desc"> Start editing, adding, or deleting cards</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Study Mode */}
      {showStudyMode && !studyComplete && studyCards.length > 0 && (
        <div className="study-mode-overlay">
          <div className="study-card-container">
            <div className="study-header">
              <span className="card-counter">Card {currentCardIndex + 1} of {studyCards.length}</span>
              <div className="study-controls">
                <button onClick={shuffleCards} className="control-btn">🔀 Shuffle</button>
                <button onClick={() => setShowStudyMode(false)} className="control-btn exit-btn">✕ Exit</button>
              </div>
            </div>
            
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{width: `${((currentCardIndex + 1) / studyCards.length) * 100}%`}}
              />
            </div>
            
            <div className="study-card-content">
              <h2 className="question">{studyCards[currentCardIndex].question}</h2>
              {showAnswer && (
                <div className="answer-box">
                  <p className="answer-label">Answer:</p>
                  <p className="answer">{studyCards[currentCardIndex].answer}</p>
                </div>
              )}
            </div>
            
            {!showAnswer ? (
              <button onClick={() => setShowAnswer(true)} className="show-answer-btn">
                👁️ Show Answer
              </button>
            ) : (
              <div className="response-buttons">
                <button onClick={() => handleCardResponse(false)} className="response-btn fail-btn">
                  ❌ Failed
                </button>
                <button onClick={() => handleCardResponse(true)} className="response-btn pass-btn">
                  ✅ Passed
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Study Complete Modal */}
      {studyComplete && (
        <div className="study-mode-overlay">
          <div className="complete-modal">
            <h2 className="complete-title">Study Session Complete! 🎉</h2>
            
            <div className="stats-container">
              <div className="stat-box">
                <p className="stat-number passed">{passedCards.length}</p>
                <p className="stat-label">Passed</p>
              </div>
              <div className="stat-box">
                <p className="stat-number failed">{failedCards.length}</p>
                <p className="stat-label">Failed</p>
              </div>
              <div className="stat-box">
                <p className="stat-number score">{Math.round((passedCards.length / studyCards.length) * 100)}%</p>
                <p className="stat-label">Score</p>
              </div>
            </div>
            
            {failedCards.length > 0 && (
              <div className="failed-cards-section">
                <h3 className="failed-title">Cards to Review ({failedCards.length}):</h3>
                <div className="failed-cards-list">
                  {failedCards.map((card, idx) => (
                    <div key={idx} className="failed-card-item">
                      <p className="failed-question">Q: {card.question}</p>
                      <p className="failed-answer">A: {card.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="complete-buttons">
              {failedCards.length > 0 && (
                <button onClick={restudyFailedCards} className="complete-btn restudy-btn">
                  🔄 Restudy Failed Cards
                </button>
              )}
              <button onClick={startStudyMode} className="complete-btn again-btn">
                🔁 Study All Again
              </button>
              <button 
                onClick={() => { setShowStudyMode(false); setStudyComplete(false); setShowOptions(false); }} 
                className="complete-btn home-btn"
              >
                🏠 Back to Home
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
  );
};

export default Home;


      
      
            




