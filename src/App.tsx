
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Index from './pages/Index';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import Profile from './pages/Profile';
import Tournaments from './pages/Tournaments';
import TournamentDetail from './pages/TournamentDetail';
import Admin from './pages/Admin';
import Leaderboard from './pages/Leaderboard';
import Brackets from './pages/Brackets';
import BracketView from './pages/BracketView';
import MatchDetails from './pages/MatchDetails';
import Archive from './pages/Archive';
import Bracket from './pages/Bracket';
import TournamentAutomation from './components/TournamentAutomation';
import NotificationSystem from './components/NotificationSystem';

// ScrollToTop component to ensure page scrolls to top on route change
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <NotificationSystem />
      <TournamentAutomation />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/tournaments" element={<Tournaments />} />
        <Route path="/tournament/:id" element={<TournamentDetail />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/brackets" element={<Brackets />} />
        <Route path="/bracket/:id" element={<BracketView />} />
        <Route path="/match/:id" element={<MatchDetails />} />
        <Route path="/archive" element={<Archive />} />
        <Route path="/bracket" element={<Bracket />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
