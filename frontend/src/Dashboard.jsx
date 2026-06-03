import React, { useState, useEffect, useRef } from 'react';
import { Search, Library, PlayCircle, ArrowLeft, Music, Trash2, ChevronDown, ChevronUp, ExternalLink, Disc3 } from 'lucide-react';
import { API, getUserId, TrackRow, ReviewModal, PlaylistModal, Spinner } from './components';

export default function Dashboard() {
  const [view, setView] = useState('home');
  const [searchQ, setSearchQ] = useState('');
  const [searchTab, setSearchTab] = useState('all');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [reviewTrack, setReviewTrack] = useState(null);
  const [playlistTrack, setPlaylistTrack] = useState(null);
  const [feedArtists, setFeedArtists] = useState([]);
  const [recTracks, setRecTracks] = useState([]);
  const [newReleases, setNewReleases] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const searchTimer = useRef(null);
  const uid = getUserId();

  const profile = JSON.parse(localStorage.getItem('tastelytics_profile') || '{}');
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    const genres = profile.favorite_genres || 'pop';
    Promise.all([
      fetch(`${API}/feed?genres=${encodeURIComponent(genres)}`).then(r=>r.json()).catch(()=>({})),
      fetch(`${API}/recommendations?user_id=${uid}&genres=${encodeURIComponent(genres)}&limit=15`).then(r=>r.json()).catch(()=>({})),
      fetch(`${API}/new-releases?limit=10`).then(r=>r.json()).catch(()=>({}))
    ]).then(([feed, recs, releases]) => {
      setFeedArtists(feed.artists?.items || []);
      setRecTracks(recs.tracks || []);
      setNewReleases(releases.albums?.items || []);
      setFeedLoading(false);
    });
  }, []);

  const doSearch = (q) => {
    setSearchQ(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!q.trim()) { setSearchResults(null); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`${API}/search?q=${encodeURIComponent(q)}&type=artist,track,album&limit=12`);
        setSearchResults(await res.json());
      } catch(e) { console.error(e); }
      setSearching(false);
    }, 400);
  };

  const nav = (v) => { setView(v); if(v!=='search'){setSearchResults(null);setSearchQ('');} if(v!=='artist')setSelectedArtist(null); if(v!=='album')setSelectedAlbum(null); };

  return (
    <div className="min-h-screen bg-dark-900 text-dark-100 font-sans pb-12">
      {reviewTrack && <ReviewModal track={reviewTrack} onClose={()=>setReviewTrack(null)}/>}
      {playlistTrack && <PlaylistModal track={playlistTrack} onClose={()=>setPlaylistTrack(null)}/>}

      <marquee scrollamount="8" className="w-full bg-brand-500 text-white font-mono font-bold py-1 border-b-2 border-dark-700 text-sm tracking-widest">
        *** WELCOME TO TASTELYTICS *** NEW RELEASES UPDATED DAILY *** DON'T FORGET TO SIGN THE GUESTBOOK *** BEST VIEWED IN NETSCAPE NAVIGATOR ***
      </marquee>

      {/* Top Banner / Header */}
      <header className="bg-white border-b-[6px] border-dark-700 shadow-retro sticky top-0 z-40 mb-10">
        <div className="bg-yellow-300 border-b-[3px] border-dark-700 py-1 overflow-hidden flex items-center">
          <marquee className="text-xs font-extrabold uppercase tracking-widest text-black" scrollamount="10">🔥 WELCOME TO TASTELYTICS 🔥 THE BEST PLACE TO REVIEW MUSIC ON THE WORLD WIDE WEB 🔥 UNDER CONSTRUCTION BUT STILL AWESOME 🔥</marquee>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 cursor-pointer hover:scale-105 transition-transform" onClick={()=>nav('home')}>
              <div className="w-12 h-12 bg-brand-500 border-[3px] border-dark-700 shadow-[2px_2px_0_0_#000] text-white flex items-center justify-center"><PlayCircle size={32} strokeWidth={3} /></div>
              <h2 className="text-4xl font-extrabold text-brand-500 uppercase tracking-tighter" style={{ textShadow: '2px 2px 0px #000' }}>Tastelytics</h2>
            </div>
            <nav className="flex gap-3">
              {[['home','Home'],['search','Search'],['library','Library']].map(([key,label])=>(
                <button key={key} onClick={()=>nav(key)}
                  className={`px-4 py-2 font-extrabold uppercase tracking-widest text-sm border-[3px] border-dark-700 shadow-retro hover:shadow-retro-hover transition-transform ${view===key||(!['home','search','library'].includes(view)&&key==='home')?'bg-brand-500 text-white':'bg-white text-black'}`}>
                  {label}
                </button>
              ))}
            </nav>
          </div>
          
          <div className="relative w-full max-w-sm">
            <Search size={20} strokeWidth={3} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-700"/>
            <input type="text" value={searchQ} onChange={e=>{doSearch(e.target.value);setView('search');}} onFocus={()=>setView('search')}
              placeholder="Search music..." className="w-full bg-white text-black placeholder-dark-500 pl-10 pr-3 py-3 border-[4px] border-dark-700 shadow-[inset_4px_4px_0_0_rgba(0,0,0,0.2)] focus:outline-none focus:bg-yellow-200 font-extrabold uppercase tracking-widest text-sm"/>
          </div>
        </div>
      </header>

      {/* 2-Column Holy Grail Layout */}
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Main Content Column */}
        <main className="md:col-span-9">
          {view === 'home' && <HomeView feedArtists={feedArtists} recTracks={recTracks} newReleases={newReleases} feedLoading={feedLoading} onArtist={a=>{setSelectedArtist(a);setView('artist');}} onAlbum={a=>{setSelectedAlbum(a);setView('album');}} onReview={setReviewTrack} onPlaylist={setPlaylistTrack}/>}
          {view === 'search' && <SearchView searchQ={searchQ} searchResults={searchResults} searching={searching} searchTab={searchTab} setSearchTab={setSearchTab} onArtist={a=>{setSelectedArtist(a);setView('artist');}} onAlbum={a=>{setSelectedAlbum(a);setView('album');}} onReview={setReviewTrack} onPlaylist={setPlaylistTrack}/>}
          {view === 'artist' && selectedArtist && <ArtistPage artist={selectedArtist} onBack={()=>nav('home')} onArtist={a=>{setSelectedArtist(a);}} onAlbum={a=>{setSelectedAlbum(a);setView('album');}} onReview={setReviewTrack} onPlaylist={setPlaylistTrack}/>}
          {view === 'album' && selectedAlbum && <AlbumPage album={selectedAlbum} onBack={()=>selectedArtist?setView('artist'):nav('home')} onArtist={a=>{setSelectedArtist(a);setView('artist');}} onReview={setReviewTrack} onPlaylist={setPlaylistTrack}/>}
          {view === 'library' && <LibraryView/>}
        </main>

        {/* Right Widget Column */}
        <aside className="md:col-span-3 flex flex-col gap-8">
          {/* User Profile Widget */}
          <div className="bg-white border-[4px] border-dark-700 shadow-retro p-4">
            <h3 className="font-extrabold text-brand-500 border-b-4 border-dark-700 pb-2 mb-3 text-lg uppercase tracking-tighter">ID Badge</h3>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-16 h-16 bg-brand-500 border-[3px] border-dark-700 shadow-[2px_2px_0_0_#000] flex-shrink-0"></div>
              <div className="overflow-hidden">
                <p className="text-black font-extrabold text-sm uppercase tracking-widest truncate">{profile.name || 'Anonymous User'}</p>
                <p className="text-brand-500 font-bold text-xs uppercase tracking-widest mt-1">MEMBER</p>
              </div>
            </div>
            <p className="text-dark-700 text-xs font-bold bg-yellow-200 border-2 border-dark-700 p-2 mt-2 uppercase"><strong>Likes:</strong> {profile.favorite_genres?.split(',').slice(0,3).join(', ')}</p>
          </div>

          {/* Sticky Note Widget */}
          <div className="relative bg-yellow-200 border-[3px] border-dark-700 p-5 shadow-retro rotate-3 mt-2 ml-2 hover:rotate-0 transition-transform">
            <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-3xl drop-shadow-md">📌</span>
            <p className="font-comic text-brand-red text-sm leading-relaxed mt-2 text-center font-bold" style={{fontFamily: '"Comic Sans MS", cursive'}}>
              <strong>UPDATE!</strong><br/>
              Welcome to the page! Rate your favorite albums today. ~Anvit
            </p>
          </div>

          {/* Visitor Counter */}
          <div className="bg-black border-[4px] border-brand-500 shadow-retro p-3 text-center">
            <h3 className="text-brand-500 font-extrabold uppercase tracking-widest text-xs mb-2">Visitors</h3>
            <div className="font-mono text-2xl text-red-500 font-bold tracking-widest bg-dark-700 border-2 border-dark-500 p-2 inline-block">0042069</div>
          </div>

          {/* Web Badges */}
          <div className="flex flex-wrap gap-2 justify-center">
            <div className="w-[88px] h-[31px] bg-brand-500 border-2 border-white flex flex-col justify-center items-center cursor-pointer hover:scale-105 transition-transform"><span className="text-[10px] text-white font-extrabold uppercase leading-none">Best Viewed In</span><span className="text-xs text-white font-extrabold uppercase leading-none">Netscape</span></div>
            <div className="w-[88px] h-[31px] bg-yellow-400 border-2 border-black flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"><span className="text-[10px] text-black font-extrabold uppercase">Valid HTML</span></div>
          </div>
        </aside>

      </div>
    </div>
  );
}

/* ─── HOME ─── */
function HomeView({ feedArtists, recTracks, newReleases, feedLoading, onArtist, onAlbum, onReview, onPlaylist }) {
  const profile = JSON.parse(localStorage.getItem('tastelytics_profile') || '{}');
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  if (feedLoading) return <Spinner/>;
  return (
    <div className="space-y-10">
      <div className="bg-brand-500 border-[4px] border-dark-700 shadow-retro p-6 inline-block mb-4 text-white">
        <h1 className="text-5xl font-extrabold mb-2 uppercase tracking-tighter" style={{ textShadow: '3px 3px 0px #000' }}>{greeting}{profile.name?`, ${profile.name}`:''}</h1>
        <p className="text-sm font-extrabold bg-white text-black inline-block px-2 border-2 border-dark-700 uppercase tracking-widest">Discover and review music you love.</p>
      </div>

      {recTracks.length > 0 && (
        <section>
          <h2 className="text-2xl font-extrabold text-brand-500 mb-6 uppercase tracking-tighter bg-white inline-block px-3 py-1 border-[4px] border-dark-700 shadow-retro">Recommended for You</h2>
          <div className="space-y-2">{recTracks.slice(0,8).map(t=><TrackRow key={t.id} track={t} onReview={onReview} onPlaylist={onPlaylist}/>)}</div>
        </section>
      )}

      {newReleases.length > 0 && (
        <section>
          <h2 className="text-2xl font-extrabold text-brand-500 mb-6 uppercase tracking-tighter bg-white inline-block px-3 py-1 border-[4px] border-dark-700 shadow-retro">New Releases</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
            {newReleases.map(a=>(
              <div key={a.id} onClick={()=>onAlbum(a)} className="bg-white p-3 border-[4px] border-dark-700 shadow-retro hover:shadow-retro-hover transition-transform cursor-pointer group">
                <img src={a.images?.[0]?.url} className="w-full aspect-square mb-3 object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all border-[3px] border-dark-700" alt=""/>
                <h3 className="font-extrabold text-black uppercase tracking-tight truncate text-lg">{a.name}</h3>
                <p className="text-xs text-dark-500 font-bold uppercase tracking-widest truncate">{a.artists?.map(x=>x.name).join(', ')}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {feedArtists.length > 0 && (
        <section>
          <h2 className="text-2xl font-extrabold text-brand-500 mb-6 uppercase tracking-tighter bg-white inline-block px-3 py-1 border-[4px] border-dark-700 shadow-retro">Explore Artists</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
            {feedArtists.slice(0,10).map(a=>(
              <div key={a.id} onClick={()=>onArtist(a)} className="bg-white p-3 border-[4px] border-dark-700 shadow-retro hover:shadow-retro-hover transition-transform cursor-pointer group">
                <img src={a.images?.[0]?.url} className="w-full aspect-square mb-3 object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all border-[3px] border-dark-700" alt=""/>
                <h3 className="font-extrabold text-black uppercase tracking-tight truncate text-lg">{a.name}</h3>
                <p className="text-xs text-dark-500 font-bold uppercase tracking-widest truncate">{a.genres?.slice(0,2).join(', ')||'Artist'}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* ─── SEARCH ─── */
function SearchView({ searchQ, searchResults, searching, searchTab, setSearchTab, onArtist, onAlbum, onReview, onPlaylist }) {
  const tabs = ['all','artists','tracks','albums'];
  return (
    <div>
      <div className="flex gap-4 mb-10 flex-wrap">
        {tabs.map(t=>(
          <button key={t} onClick={()=>setSearchTab(t)} className={`px-5 py-2 border-[4px] border-dark-700 shadow-retro hover:shadow-retro-hover text-sm font-extrabold uppercase tracking-widest transition-transform ${searchTab===t?'bg-brand-500 text-white':'bg-white text-black'}`}>{t}</button>
        ))}
      </div>

      {searching && <Spinner/>}
      {!searching && !searchResults && !searchQ && <p className="text-dark-500 text-center py-12">Type something above to search Spotify</p>}

      {searchResults && <>
        {(searchTab==='all'||searchTab==='artists') && searchResults.artists?.items?.length > 0 && <>
          <h2 className="text-2xl font-extrabold text-brand-500 mb-6 uppercase tracking-tighter bg-white inline-block px-3 py-1 border-[4px] border-dark-700 shadow-retro">Artists</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-6 mb-12">
            {searchResults.artists.items.slice(0,searchTab==='artists'?12:6).map(a=>(
              <div key={a.id} onClick={()=>onArtist(a)} className="flex flex-col items-center gap-3 cursor-pointer group">
                <img src={a.images?.[0]?.url||'https://via.placeholder.com/150'} className="w-28 h-28 object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-transform border-[4px] border-dark-700 shadow-retro group-hover:shadow-retro-hover" alt=""/>
                <span className="text-sm font-extrabold text-black bg-white border-2 border-dark-700 px-2 uppercase tracking-widest truncate w-full text-center">{a.name}</span>
              </div>
            ))}
          </div>
        </>}

        {(searchTab==='all'||searchTab==='tracks') && searchResults.tracks?.items?.length > 0 && <>
          <h2 className="text-lg font-bold text-dark-700 mb-4 uppercase tracking-widest bg-yellow-200 inline-block px-2 border-2 border-dark-700 shadow-retro-sm">Tracks</h2>
          <div className="space-y-2 mb-8">{searchResults.tracks.items.slice(0,searchTab==='tracks'?20:8).map(t=><TrackRow key={t.id} track={t} onReview={onReview} onPlaylist={onPlaylist}/>)}</div>
        </>}

        {(searchTab==='all'||searchTab==='albums') && searchResults.albums?.items?.length > 0 && <>
          <h2 className="text-2xl font-extrabold text-brand-500 mb-6 uppercase tracking-tighter bg-white inline-block px-3 py-1 border-[4px] border-dark-700 shadow-retro">Albums</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
            {searchResults.albums.items.slice(0,searchTab==='albums'?15:5).map(a=>(
              <div key={a.id} onClick={()=>onAlbum(a)} className="bg-white p-3 border-[4px] border-dark-700 shadow-retro hover:shadow-retro-hover transition-transform cursor-pointer group">
                <img src={a.images?.[0]?.url} className="w-full aspect-square mb-3 object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all border-[3px] border-dark-700" alt=""/>
                <h3 className="font-extrabold text-black uppercase tracking-tight truncate text-lg">{a.name}</h3>
                <p className="text-xs text-dark-500 font-bold uppercase tracking-widest truncate">{a.artists?.map(x=>x.name).join(', ')}</p>
                <p className="text-xs font-mono text-brand-500 font-bold">{a.release_date?.slice(0,4)}</p>
              </div>
            ))}
          </div>
        </>}
      </>}
    </div>
  );
}

/* ─── ARTIST PAGE ─── */
function ArtistPage({ artist, onBack, onArtist, onAlbum, onReview, onPlaylist }) {
  const [tracks, setTracks] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API}/artist/${artist.id}/top-tracks`).then(r=>r.json()).catch(()=>({})),
      fetch(`${API}/artist/${artist.id}/albums`).then(r=>r.json()).catch(()=>({})),
      fetch(`${API}/artist/${artist.id}/related`).then(r=>r.json()).catch(()=>({}))
    ]).then(([detail, alb, rel]) => {
      setTracks(detail.tracks || []);
      setAlbums(alb.items || []);
      setRelated(rel.artists || []);
      setLoading(false);
    });
  }, [artist.id]);

  const img = artist.images?.[0]?.url;
  const spotifyUrl = `https://open.spotify.com/artist/${artist.id}`;
  const followers = artist.followers?.total;

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-2 text-black bg-white border-[4px] border-dark-700 shadow-retro hover:shadow-retro-hover px-4 py-2 font-extrabold uppercase tracking-widest mb-6 transition-transform"><ArrowLeft size={20} strokeWidth={3}/>Back</button>

      <div className="flex gap-6 mb-12">
        <img src={img} className="w-48 h-48 object-cover border-[4px] border-dark-700 shadow-retro grayscale hover:grayscale-0 transition-all" alt=""/>
        <div className="flex flex-col justify-end bg-white border-[4px] border-dark-700 shadow-retro p-6 flex-1">
          <p className="text-xs uppercase tracking-widest font-mono text-dark-500 font-bold mb-1 border-2 border-dark-700 inline-block px-1 w-max">Artist</p>
          <h1 className="text-5xl font-extrabold text-brand-500 tracking-tighter mb-2 uppercase" style={{ textShadow: '2px 2px 0px #000' }}>{artist.name}</h1>
          <p className="text-dark-700 font-bold uppercase tracking-widest text-sm mb-4">{artist.genres?.slice(0,3).join(' · ') || 'Music'}</p>
          <div className="flex items-center gap-6">
            {followers && <span className="text-white bg-dark-700 px-2 border-2 border-dark-700 font-mono text-sm font-bold">{followers.toLocaleString()} FOLLOWERS</span>}
            <a href={spotifyUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-brand-500 text-sm font-extrabold hover:underline uppercase tracking-widest"><ExternalLink size={18} strokeWidth={3}/>Spotify</a>
            <button onClick={()=>onReview({...artist, entity_type: 'artist'})} className="flex items-center gap-1 text-black text-sm font-extrabold hover:text-brand-500 uppercase tracking-widest"><Disc3 size={18} strokeWidth={3}/>Review</button>
          </div>
        </div>
      </div>

      {loading ? <Spinner/> : (
        <div className="space-y-12">
          <div className="p-6 border-[4px] border-dark-700 bg-white shadow-retro">
            <h2 className="text-2xl font-extrabold text-brand-500 mb-6 uppercase tracking-tighter" style={{ textShadow: '1px 1px 0px #000' }}>Artist Reviews</h2>
            <ReviewsPanel trackId={artist.id} padding="pl-0" />
          </div>
          {tracks.length > 0 && (
            <section className="bg-white border-[4px] border-dark-700 shadow-retro p-6">
              <h2 className="text-2xl font-extrabold text-brand-500 mb-6 uppercase tracking-tighter" style={{ textShadow: '1px 1px 0px #000' }}>Popular Tracks</h2>
              <div className="space-y-2">{tracks.map(t=><TrackRow key={t.id} track={t} onReview={onReview} onPlaylist={onPlaylist}/>)}</div>
            </section>
          )}

          {albums.length > 0 && (
            <section>
              <h2 className="text-2xl font-extrabold text-brand-500 mb-6 uppercase tracking-tighter bg-white inline-block px-3 py-1 border-[4px] border-dark-700 shadow-retro">Discography</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                {albums.map(a=>(
                  <div key={a.id} onClick={()=>onAlbum(a)} className="bg-white p-3 border-[4px] border-dark-700 shadow-retro hover:shadow-retro-hover transition-transform cursor-pointer group">
                    <img src={a.images?.[0]?.url} className="w-full aspect-square mb-3 object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all border-[3px] border-dark-700" alt=""/>
                    <h3 className="font-extrabold text-black uppercase tracking-tight truncate text-lg">{a.name}</h3>
                    <p className="text-xs text-dark-500 font-bold uppercase tracking-widest">{a.release_date?.slice(0,4)}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {related.length > 0 && (
            <section>
              <h2 className="text-2xl font-extrabold text-brand-500 mb-6 uppercase tracking-tighter bg-white inline-block px-3 py-1 border-[3px] border-dark-700 shadow-retro">Related Artists</h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-6">
                {related.slice(0,12).map(a=>(
                  <div key={a.id} onClick={()=>onArtist(a)} className="flex flex-col items-center gap-3 cursor-pointer group">
                    <img src={a.images?.[0]?.url||'https://via.placeholder.com/150'} className="w-28 h-28 object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-transform border-[4px] border-dark-700 shadow-retro group-hover:shadow-retro-hover" alt=""/>
                    <span className="text-sm font-extrabold text-black bg-white border-2 border-dark-700 px-2 uppercase tracking-widest truncate w-full text-center">{a.name}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── ALBUM PAGE ─── */
function AlbumPage({ album: albumProp, onBack, onArtist, onReview, onPlaylist }) {
  const [album, setAlbum] = useState(albumProp);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/album/${albumProp.id}`).then(r=>r.json()).then(d => {
      if (d.album) {
        setAlbum(d.album);
        setTracks((d.album.tracks?.items || []).map(t => ({...t, album: { images: d.album.images, name: d.album.name, id: d.album.id }})));
      }
      setLoading(false);
    }).catch(()=>setLoading(false));
  }, [albumProp.id]);

  const img = album.images?.[0]?.url;
  const spotifyUrl = `https://open.spotify.com/album/${album.id}`;
  const totalMs = tracks.reduce((s,t) => s + (t.duration_ms||0), 0);
  const mins = Math.round(totalMs / 60000);

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-2 text-black bg-white border-[4px] border-dark-700 shadow-retro hover:shadow-retro-hover px-4 py-2 font-extrabold uppercase tracking-widest mb-6 transition-transform"><ArrowLeft size={20} strokeWidth={3}/>Back</button>

      <div className="flex gap-6 mb-12">
        <img src={img} className="w-48 h-48 object-cover border-[4px] border-dark-700 shadow-retro grayscale hover:grayscale-0 transition-all" alt=""/>
        <div className="flex flex-col justify-end bg-white border-[4px] border-dark-700 shadow-retro p-6 flex-1">
          <p className="text-xs uppercase tracking-widest font-mono text-dark-500 font-bold mb-1 border-2 border-dark-700 inline-block px-1 w-max">{album.album_type || 'Album'}</p>
          <h1 className="text-5xl font-extrabold text-brand-500 tracking-tighter mb-2 uppercase" style={{ textShadow: '2px 2px 0px #000' }}>{album.name}</h1>
          <div className="flex items-center gap-2 font-mono text-dark-700 font-bold text-sm mb-4 uppercase tracking-widest">
            {album.artists?.map((a,i) => (
              <span key={a.id}>
                <button onClick={()=>onArtist(a)} className="hover:text-brand-500 hover:underline transition-colors">{a.name}</button>
                {i < album.artists.length - 1 && ', '}
              </span>
            ))}
            <span>· {album.release_date?.slice(0,4)}</span>
            {tracks.length > 0 && <span>· {tracks.length} tracks, {mins} min</span>}
          </div>
          <div className="flex items-center gap-6">
            <a href={spotifyUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-brand-500 text-sm font-extrabold hover:underline uppercase tracking-widest"><ExternalLink size={18} strokeWidth={3}/>Spotify</a>
            <button onClick={()=>onReview({...album, entity_type: 'album'})} className="flex items-center gap-1 text-black text-sm font-extrabold hover:text-brand-500 uppercase tracking-widest"><Disc3 size={18} strokeWidth={3}/>Review</button>
          </div>
        </div>
      </div>

      {loading ? <Spinner/> : (
        <div className="space-y-12">
          <div className="p-6 border-[4px] border-dark-700 bg-white shadow-retro">
            <h2 className="text-2xl font-extrabold text-brand-500 mb-6 uppercase tracking-tighter" style={{ textShadow: '1px 1px 0px #000' }}>Album Reviews</h2>
            <ReviewsPanel trackId={album.id} padding="pl-0" />
          </div>
          <div className="bg-white border-[4px] border-dark-700 shadow-retro p-6">
            <h2 className="text-2xl font-extrabold text-brand-500 mb-6 uppercase tracking-tighter" style={{ textShadow: '1px 1px 0px #000' }}>Album Tracks</h2>
            <div className="space-y-2">
          {tracks.map((t, i) => {
            const durMin = Math.floor((t.duration_ms||0)/60000);
            const durSec = Math.floor(((t.duration_ms||0)%60000)/1000).toString().padStart(2,'0');
            return (
              <div key={t.id} className="flex items-center gap-4 p-2 border-b border-dark-400 hover:bg-gray-100 transition-colors group">
                <span className="text-dark-500 font-bold text-sm w-6 text-right shrink-0">{i+1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-black font-bold text-sm truncate">{t.name}</p>
                  <p className="text-dark-600 text-xs truncate">{t.artists?.map(a=>a.name).join(', ')}</p>
                </div>
                <span className="text-dark-600 font-mono text-sm shrink-0">{durMin}:{durSec}</span>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a href={`https://open.spotify.com/track/${t.id}`} target="_blank" rel="noopener noreferrer" className="text-dark-600 hover:text-brand-500 p-1"><ExternalLink size={16}/></a>
                  <button onClick={()=>onReview(t)} className="text-white bg-dark-700 hover:bg-brand-500 p-2 border-2 border-dark-700 shadow-[2px_2px_0_0_#000]"><Disc3 size={16} strokeWidth={3}/></button>
                </div>
              </div>
            );
          })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── LIBRARY ─── */
function LibraryView() {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const uid = getUserId();

  useEffect(() => {
    fetch(`${API}/playlists?user_id=${uid}`).then(r=>r.json()).then(d=>{setPlaylists(d.playlists||[]);setLoading(false);}).catch(()=>setLoading(false));
  }, []);

  const deletePlaylist = async (pid) => {
    await fetch(`${API}/playlists`, {method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({user_id:uid,playlist_id:pid})});
    setPlaylists(playlists.filter(p=>p.PlaylistID!==pid));
  };

  return (
    <div>
      <h1 className="text-5xl font-extrabold text-brand-500 tracking-tighter uppercase mb-10 bg-white inline-block px-4 py-2 border-[4px] border-dark-700 shadow-retro">Your Library</h1>
      {loading ? <Spinner/> :
        playlists.length === 0 ? (
          <div className="text-center py-20 bg-white border-[4px] border-dark-700 shadow-retro">
            <Music size={64} strokeWidth={3} className="text-brand-500 mx-auto mb-6"/>
            <p className="text-black font-extrabold uppercase tracking-widest text-xl mb-2">Your library is empty</p>
            <p className="text-dark-700 font-bold">Search for songs and add them to playlists!</p>
          </div>
        ) :
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          {playlists.map(pl=>(
            <div key={pl.PlaylistID} className="bg-white p-6 border-[4px] border-dark-700 shadow-retro transition-transform hover:shadow-retro-hover">
              <div className="flex items-start justify-between mb-6 border-b-[3px] border-dark-700 pb-4">
                <div><h3 className="text-black font-extrabold text-2xl uppercase tracking-tighter">{pl.Name}</h3><p className="text-brand-500 font-mono font-bold">{(pl.Tracks||[]).length} tracks</p></div>
                <div className="flex gap-2">
                  <button onClick={()=>setExpanded(expanded===pl.PlaylistID?null:pl.PlaylistID)} className="text-black bg-white hover:bg-yellow-200 p-2 border-[3px] border-dark-700 shadow-[2px_2px_0_0_#000] transition-colors">
                    {expanded===pl.PlaylistID ? <ChevronUp size={20} strokeWidth={3}/> : <ChevronDown size={20} strokeWidth={3}/>}
                  </button>
                  <button onClick={()=>deletePlaylist(pl.PlaylistID)} className="text-white bg-brand-500 hover:bg-red-700 p-2 border-[3px] border-dark-700 shadow-[2px_2px_0_0_#000] transition-colors"><Trash2 size={20} strokeWidth={3}/></button>
                </div>
              </div>
              {(pl.Tracks||[]).slice(0, expanded===pl.PlaylistID ? undefined : 3).map((t,i)=>(
                <div key={i} className="flex items-center gap-4 py-2 border-b-2 border-dark-700/20 last:border-0">
                  {t.image && <img src={t.image} className="w-10 h-10 object-cover grayscale opacity-80 border-2 border-dark-700" alt=""/>}
                  <div className="flex-1 min-w-0"><p className="text-black font-bold uppercase tracking-widest text-sm truncate">{t.name}</p><p className="text-dark-500 font-mono font-bold text-xs truncate">{t.artist}</p></div>
                </div>
              ))}
              {(pl.Tracks||[]).length > 3 && expanded!==pl.PlaylistID && (
                <p className="text-brand-500 bg-white border-2 border-dark-700 inline-block px-2 font-mono font-bold text-xs mt-4 cursor-pointer hover:bg-yellow-200 text-black" onClick={()=>setExpanded(pl.PlaylistID)}>+{(pl.Tracks||[]).length - 3} MORE TRACKS</p>
              )}
            </div>
          ))}
        </div>}
    </div>
  );
}
