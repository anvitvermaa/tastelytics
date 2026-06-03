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
    <div className="relative min-h-screen flex items-center justify-center p-6 text-dark-100 font-sans">
      <div className="z-10 bg-dark-900 border-3d p-10 max-w-sm w-full flex flex-col items-center">
        <div className="w-16 h-16 bg-brand-500 border-3d-inset text-white mb-6 flex items-center justify-center">
          <PlayCircle size={36} strokeWidth={2} />
        </div>

        {view === 'choice' && (
          <div className="w-full flex flex-col items-center">
            <h1 className="text-4xl font-bold text-brand-500 mb-2 text-center" style={{ fontFamily: 'Georgia, serif' }}>Tastelytics</h1>
            <p className="text-dark-600 text-sm text-center mb-8">Early Internet Music Discovery.</p>
            <div className="flex flex-col gap-4 w-full">
              <button onClick={() => setView('signup')} className="w-full bg-brand-500 text-white border-3d py-2 font-bold hover:bg-brand-600 active:border-3d-inset">
                Create Account
              </button>
              <button onClick={() => setView('login')} className="w-full bg-dark-800 text-black border-3d py-2 font-bold hover:bg-gray-200 active:border-3d-inset">
                Log In
              </button>
            </div>
          </div>
        )}

        {view !== 'choice' && (
          <div className="w-full flex flex-col items-center">
            <h1 className="text-2xl font-bold text-brand-500 mb-2 text-center" style={{ fontFamily: 'Georgia, serif' }}>
              {view === 'signup' ? 'Join Us' : 'Welcome Back'}
            </h1>
            <p className="text-dark-600 text-sm text-center mb-8">
              {view === 'signup' ? 'Create your new Tastelytics account.' : 'Log in to your existing account.'}
            </p>
            <button onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-3 bg-dark-800 text-black font-bold py-2 border-3d hover:bg-gray-200 active:border-3d-inset">
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
              Sign in with Google
            </button>
            <button onClick={() => setView('choice')} className="mt-8 text-xs text-brand-500 hover:underline">
              [ Go Back ]
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
      <div className="max-w-2xl w-full bg-dark-800 p-10 border-3d">
        <div className="flex gap-2 mb-10 justify-center">
          {[1, 2, 3].map(i => (
            <div key={i} className={`h-4 w-16 border-2 border-dark-700 ${step >= i ? 'bg-brand-500' : 'bg-white'}`} />
          ))}
        </div>

        {step === 1 && (
          <div>
            <h1 className="text-4xl font-bold text-brand-500 mb-2" style={{ fontFamily: 'Georgia, serif' }}>Welcome.</h1>
            <p className="text-dark-600 mb-8 font-bold text-sm">Let's get to know you before we build your library.</p>
            <div className="space-y-5 mb-10">
              <div>
                <label className="block text-sm font-bold text-dark-600 mb-1">What should we call you?</label>
                <input type="text" value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} className="w-full bg-white text-black px-3 py-2 border-3d-inset focus:outline-none focus:bg-yellow-50" placeholder="Your display name" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-dark-600 mb-1">Age</label>
                  <input type="number" value={profile.age} onChange={e => setProfile({ ...profile, age: e.target.value })} className="w-full bg-white text-black px-3 py-2 border-3d-inset focus:outline-none focus:bg-yellow-50" placeholder="25" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-dark-600 mb-1">Gender</label>
                  <select value={profile.gender} onChange={e => setProfile({ ...profile, gender: e.target.value })} className="w-full bg-white text-black px-3 py-2 border-3d-inset focus:outline-none focus:bg-yellow-50">
                    <option value="" disabled>Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="non-binary">Non-binary</option>
                    <option value="prefer-not">Prefer not to say</option>
                  </select>
                </div>
              </div>
            </div>
            <button onClick={handleNextStep1} disabled={!profile.name || !profile.age} className="w-full bg-brand-500 disabled:bg-dark-500 text-white font-bold py-3 px-6 border-3d hover:bg-brand-600 active:border-3d-inset flex justify-center items-center gap-2">
              Continue <ChevronRight size={20} />
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h1 className="text-4xl font-bold text-brand-500 mb-2" style={{ fontFamily: 'Georgia, serif' }}>Pick your vibes.</h1>
            <p className="text-dark-600 mb-8 font-bold text-sm">Select a few genres you listen to.</p>
            <div className="flex flex-wrap gap-2 mb-10">
              {POPULAR_GENRES.map(genre => {
                const isSelected = selectedGenres.includes(genre);
                return (
                  <button key={genre} onClick={() => { if (isSelected) setSelectedGenres(selectedGenres.filter(g => g !== genre)); else setSelectedGenres([...selectedGenres, genre]); }} className={`px-4 py-1.5 font-bold text-sm border-3d hover:bg-gray-200 active:border-3d-inset ${isSelected ? 'bg-brand-500 text-white' : 'bg-dark-800 text-black'}`}>
                    {genre}
                  </button>
                )
              })}
            </div>
            <button onClick={handleNextStep2} disabled={selectedGenres.length === 0} className="w-full bg-brand-500 disabled:bg-dark-500 text-white font-bold py-3 px-6 border-3d hover:bg-brand-600 active:border-3d-inset flex justify-center items-center gap-2">
              Continue <ChevronRight size={20} />
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col h-[500px]">
            <h1 className="text-4xl font-bold text-brand-500 mb-2" style={{ fontFamily: 'Georgia, serif' }}>Choose artists.</h1>
            <p className="text-dark-600 mb-6 font-bold text-sm">We've curated these based on your genres.</p>
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Spinner />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto mb-6 pr-2" style={{ scrollbarWidth: 'thin' }}>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                  {recommendedArtists.map(artist => {
                    const isSelected = selectedArtists.includes(artist.id);
                    return (
                      <div key={artist.id}>
                        <div className={`relative group cursor-pointer border-3d ${isSelected ? 'bg-brand-500' : 'bg-white'}`} onClick={() => { if (isSelected) setSelectedArtists(selectedArtists.filter(id => id !== artist.id)); else setSelectedArtists([...selectedArtists, artist.id]); }}>
                          <img src={artist.images?.[0]?.url} className={`w-full aspect-square object-cover ${isSelected ? 'opacity-90 mix-blend-multiply' : ''}`} alt={artist.name} />
                          {isSelected && <div className="absolute inset-0 flex items-center justify-center"><CheckCircle2 className="text-white drop-shadow-md" size={36} /></div>}
                        </div>
                        <p className="text-center font-bold text-xs mt-2 truncate text-dark-100">{artist.name}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            <button onClick={finishOnboarding} disabled={selectedArtists.length === 0 || isLoading} className="w-full bg-brand-500 disabled:bg-dark-500 text-white font-bold py-3 px-6 border-3d hover:bg-brand-600 active:border-3d-inset flex justify-center items-center gap-2 mt-auto shrink-0">
              {isLoading ? 'WORKING...' : 'FINISH ONBOARDING'}
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

