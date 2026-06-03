import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { signInWithRedirect, getCurrentUser, fetchUserAttributes } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import { PlayCircle, ChevronRight, CheckCircle2 } from 'lucide-react';
import Dashboard from './Dashboard';

const API_URL = "https://ny8zhk2zga.execute-api.us-east-1.amazonaws.com/prod";
const POPULAR_GENRES = ["Pop", "Electronic", "Hip-Hop", "Rock", "R&B", "Jazz", "Classical", "Country", "Indie", "K-Pop", "Metal", "Latin"];

/* ─── Auth Context ─── */
const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const [authStatus, setAuthStatus] = useState('loading');
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => checkUser(), 500);
    const unsubscribe = Hub.listen('auth', ({ payload }) => {
      if (payload.event === 'signedIn' || payload.event === 'signInWithRedirect') {
        checkUser();
      } else if (payload.event === 'signedOut') {
        setAuthStatus('unauthenticated');
      } else if (payload.event === 'signInWithRedirect_failure') {
        setAuthStatus('unauthenticated');
      }
    });
    return () => { clearTimeout(timer); unsubscribe(); };
  }, []);

  async function checkUser() {
    try {
      const user = await getCurrentUser();
      localStorage.setItem('tastelytics_uid', user.userId);
      
      // Check localStorage for onboarding completion
      const onboardingDone = localStorage.getItem('tastelytics_onboarding_done');
      setNeedsOnboarding(!onboardingDone);
      setAuthStatus('authenticated');
    } catch {
      setAuthStatus('unauthenticated');
    }
  }

  function completeOnboarding() {
    localStorage.setItem('tastelytics_onboarding_done', 'true');
    setNeedsOnboarding(false);
  }

  return (
    <AuthContext.Provider value={{ authStatus, needsOnboarding, completeOnboarding }}>
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  return useContext(AuthContext);
}

/* ─── Spinner ─── */
function Spinner() {
  return (
    <div className="min-h-screen bg-dark-900 flex justify-center items-center">
      <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}

/* ─── Login Page ─── */
function Login() {
  const [view, setView] = useState('choice');

  const handleGoogleLogin = () => {
    signInWithRedirect({ provider: 'Google' });
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-dark-900 overflow-hidden text-dark-100 font-sans">
      <div className="z-10 bg-dark-900 p-10 max-w-sm w-full flex flex-col items-center">
        <div className="w-12 h-12 bg-white text-black mb-8 flex items-center justify-center">
          <PlayCircle size={28} />
        </div>

        {view === 'choice' && (
          <div className="w-full flex flex-col items-center">
            <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2 text-center">Tastelytics</h1>
            <p className="text-dark-400 text-sm text-center font-medium mb-10">Minimalist music discovery.</p>
            <div className="flex flex-col gap-4 w-full">
              <button onClick={() => setView('signup')} className="w-full bg-white text-black font-bold py-3.5 hover:bg-gray-200 transition-colors">
                Create Account
              </button>
              <button onClick={() => setView('login')} className="w-full bg-transparent text-white border border-dark-600 font-bold py-3.5 hover:border-white transition-colors">
                Log In
              </button>
            </div>
          </div>
        )}

        {view !== 'choice' && (
          <div className="w-full flex flex-col items-center">
            <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2 text-center">
              {view === 'signup' ? 'Join Us' : 'Welcome Back'}
            </h1>
            <p className="text-dark-400 text-sm text-center font-medium mb-10">
              {view === 'signup' ? 'Create your new Tastelytics account.' : 'Log in to your existing account.'}
            </p>
            <button onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-3 bg-white text-black font-semibold py-3.5 border border-transparent hover:bg-gray-200 transition-colors">
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
              Continue with Google
            </button>
            <button onClick={() => setView('choice')} className="mt-8 text-sm font-semibold text-dark-400 hover:text-white transition-colors">
              ← Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Onboarding Wizard ─── */
function Onboarding() {
  const navigate = useNavigate();
  const { completeOnboarding } = useAuth();
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState({ name: '', age: '', gender: '' });
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [recommendedArtists, setRecommendedArtists] = useState([]);
  const [selectedArtists, setSelectedArtists] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleNextStep1 = () => {
    if (profile.name && profile.age) setStep(2);
  };

  const handleNextStep2 = async () => {
    if (selectedGenres.length === 0) return;
    setStep(3);
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/onboarding/recommendations?genres=${encodeURIComponent(selectedGenres.join(','))}`);
      const data = await res.json();
      if (data?.artists?.items) {
        setRecommendedArtists(data.artists.items);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const finishOnboarding = async () => {
    setIsLoading(true);
    try {
      // Save profile to localStorage
      const profileData = {
        name: profile.name,
        age: profile.age,
        gender: profile.gender,
        favorite_genres: selectedGenres.join(','),
        selected_artists: selectedArtists
      };
      localStorage.setItem('tastelytics_profile', JSON.stringify(profileData));

      // Mark onboarding as complete and navigate
      completeOnboarding();
      navigate('/dashboard');
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900 text-dark-100 font-sans p-6">
      <div className="max-w-2xl w-full bg-dark-900 p-10 border border-dark-700/50">
        <div className="flex gap-2 mb-10 justify-center">
          {[1, 2, 3].map(i => (
            <div key={i} className={`h-1 w-16 transition-colors duration-500 ${step >= i ? 'bg-white' : 'bg-dark-700'}`} />
          ))}
        </div>

        {step === 1 && (
          <div>
            <h1 className="text-4xl font-extrabold text-white mb-2 tracking-tight">Welcome.</h1>
            <p className="text-dark-400 mb-8 font-medium">Let's get to know you before we build your library.</p>
            <div className="space-y-5 mb-10">
              <div>
                <label className="block text-sm font-semibold text-dark-400 mb-2 uppercase tracking-wider">What should we call you?</label>
                <input type="text" value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} className="w-full bg-dark-900/50 text-white placeholder-dark-500 px-4 py-3.5 rounded-xl border border-dark-600/50 focus:outline-none focus:border-brand-500 transition-all font-medium" placeholder="Your display name" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-dark-400 mb-2 uppercase tracking-wider">Age</label>
                  <input type="number" value={profile.age} onChange={e => setProfile({ ...profile, age: e.target.value })} className="w-full bg-dark-900/50 text-white placeholder-dark-500 px-4 py-3.5 rounded-xl border border-dark-600/50 focus:outline-none focus:border-brand-500 transition-all font-medium" placeholder="25" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-dark-400 mb-2 uppercase tracking-wider">Gender</label>
                  <select value={profile.gender} onChange={e => setProfile({ ...profile, gender: e.target.value })} className="w-full bg-dark-900/50 text-white px-4 py-3.5 rounded-xl border border-dark-600/50 focus:outline-none focus:border-brand-500 transition-all font-medium appearance-none">
                    <option value="" disabled>Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="non-binary">Non-binary</option>
                    <option value="prefer-not">Prefer not to say</option>
                  </select>
                </div>
              </div>
            </div>
            <button onClick={handleNextStep1} disabled={!profile.name || !profile.age} className="w-full bg-white disabled:bg-dark-700 disabled:text-dark-500 text-black font-bold py-3.5 px-6 transition-colors hover:bg-gray-200 flex justify-center items-center gap-2">
              Continue <ChevronRight size={20} />
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h1 className="text-4xl font-extrabold text-white mb-2 tracking-tight">Pick your vibes.</h1>
            <p className="text-dark-400 mb-8 font-medium">Select a few genres you listen to.</p>
            <div className="flex flex-wrap gap-3 mb-10">
              {POPULAR_GENRES.map(genre => {
                const isSelected = selectedGenres.includes(genre);
                return (
                  <button key={genre} onClick={() => { if (isSelected) setSelectedGenres(selectedGenres.filter(g => g !== genre)); else setSelectedGenres([...selectedGenres, genre]); }} className={`px-5 py-2.5 rounded-full font-bold transition-all duration-300 border ${isSelected ? 'bg-white text-black border-white scale-105' : 'bg-dark-700/50 text-white border-dark-600 hover:border-dark-400'}`}>
                    {genre}
                  </button>
                )
              })}
            </div>
            <button onClick={handleNextStep2} disabled={selectedGenres.length === 0} className="w-full bg-white disabled:bg-dark-700 disabled:text-dark-500 text-black font-bold py-3.5 px-6 transition-colors hover:bg-gray-200 flex justify-center items-center gap-2">
              Continue <ChevronRight size={20} />
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col h-[500px]">
            <h1 className="text-4xl font-extrabold text-white mb-2 tracking-tight">Choose artists you love.</h1>
            <p className="text-dark-400 mb-6 font-medium">We've curated these based on your genres.</p>
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto mb-6 pr-2">
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                  {recommendedArtists.map(artist => {
                    const isSelected = selectedArtists.includes(artist.id);
                    return (
                      <div key={artist.id}>
                        <div className="relative group cursor-pointer" onClick={() => { if (isSelected) setSelectedArtists(selectedArtists.filter(id => id !== artist.id)); else setSelectedArtists([...selectedArtists, artist.id]); }}>
                          <img src={artist.images?.[0]?.url} className={`w-full aspect-square object-cover transition-all duration-300 ${isSelected ? 'opacity-100' : 'opacity-60 grayscale hover:grayscale-0 hover:opacity-100'}`} alt={artist.name} />
                          {isSelected && <div className="absolute inset-0 border-2 border-white pointer-events-none flex items-center justify-center bg-black/40"><CheckCircle2 className="text-white" size={32} /></div>}
                        </div>
                        <p className="text-center text-sm font-bold mt-3 truncate text-white">{artist.name}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            <button onClick={finishOnboarding} disabled={selectedArtists.length === 0 || isLoading} className="w-full bg-white disabled:bg-dark-700 disabled:text-dark-500 text-black font-bold py-3.5 px-6 transition-colors hover:bg-gray-200 flex justify-center items-center gap-2 mt-auto shrink-0">
              {isLoading ? 'Setting up your library...' : 'Finish Onboarding'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Route Guard ─── */
function AppRoutes() {
  const { authStatus, needsOnboarding } = useAuth();
  if (authStatus === 'loading') return <Spinner />;

  return (
    <Routes>
      <Route path="/" element={authStatus === 'authenticated' ? <Navigate to={needsOnboarding ? '/onboarding' : '/dashboard'} replace /> : <Login />} />
      <Route path="/onboarding" element={authStatus === 'authenticated' ? (needsOnboarding ? <Onboarding /> : <Navigate to="/dashboard" replace />) : <Navigate to="/" replace />} />
      <Route path="/dashboard" element={authStatus === 'authenticated' ? (needsOnboarding ? <Navigate to="/onboarding" replace /> : <Dashboard />) : <Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;

