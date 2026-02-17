import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Welcome from './Welcome';
import InputField from './components/InputField';
import './css/app.css';
import Home from './Home';
import NewItem from './components/newitem';
import User from './components/user';
import Cards from './components/cards/cards';
import ViewCards from './components/cards/view_cards';
import Create from './components/trades/create';
import Products from './components/trades/products';
import ChatPage from './components/trades/ChatPage';
import {Toaster} from 'sonner';
import Slogan from './components/slogan';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Welcome/>} />
        <Route path="/input" element={<InputField onFileSelect={(e) => console.log(e)}/>} />
        <Route path="/Home" element={<Home/>} />
        <Route path="/user" element={<User/>} />
        <Route path="/newitem" element={<NewItem/>} />
        <Route path="/cards" element={<Cards/>} />
        <Route path="/view_cards" element={<ViewCards/>} />
        <Route path = "/create" element={<Create/>} />
        <Route path = "/product" element=
{<Products/>} />
<Route path = "/chat/:conversationId" element={<ChatPage/>} />
<Route path ="/slogan" element={<Slogan/>} />
        
      </Routes>
      <Toaster position="top-right" richColors />
    </Router>
    
  );
}

export default App;
