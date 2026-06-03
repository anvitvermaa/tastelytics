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

      {/* Top Banner Navigation */}
      <header className="bg-dark-800 border-b-2 border-dark-700 px-6 py-4 shadow-sm mb-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-500 border-3d-inset text-white flex items-center justify-center"><PlayCircle size={24} /></div>
              <h2 className="text-3xl font-bold text-brand-500" style={{ fontFamily: 'Georgia, serif' }}>Tastelytics</h2>
            </div>
            <nav className="flex gap-2">
              {[['home','Home'],['search','Search'],['library','Library']].map(([key,label])=>(
                <button key={key} onClick={()=>nav(key)}
                  className={`px-3 py-1 font-bold text-sm border-3d hover:bg-gray-200 active:border-3d-inset ${view===key||(!['home','search','library'].includes(view)&&key==='home')?'bg-brand-500 text-white':'bg-dark-800 text-black'}`}>
                  {label}
                </button>
              ))}
            </nav>
          </div>
          
          <div className="relative w-full max-w-sm">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-600"/>
            <input type="text" value={searchQ} onChange={e=>{doSearch(e.target.value);setView('search');}} onFocus={()=>setView('search')}
              placeholder="Search music..." className="w-full bg-white text-black placeholder-dark-500 pl-10 pr-3 py-1.5 border-3d-inset focus:outline-none focus:bg-yellow-50 font-sans text-sm"/>
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
        <aside className="md:col-span-3 flex flex-col gap-6">
          {/* User Profile Widget */}
          <div className="bg-dark-800 border-3d p-4">
            <h3 className="font-bold text-brand-500 border-b border-dark-400 pb-1 mb-2 text-sm uppercase">User Profile</h3>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-white border-3d-inset"></div>
              <div>
                <p className="text-black font-bold text-sm truncate">{profile.name || 'Anonymous User'}</p>
                <p className="text-dark-500 text-xs">Member since '26</p>
              </div>
            </div>
            <p className="text-dark-600 text-xs mt-2"><strong>Likes:</strong> {profile.favorite_genres?.split(',').slice(0,3).join(', ')}</p>
          </div>

          {/* Sticky Note Widget */}
          <div className="relative bg-yellow-200 border border-yellow-400 p-4 shadow-retro rotate-2 mt-4 ml-2">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-2xl drop-shadow-md">📌</span>
            <p className="font-comic text-red-700 text-sm leading-relaxed mt-2 text-center" style={{fontFamily: '"Comic Sans MS", cursive'}}>
              <strong>Update:</strong><br/>
              Welcome to my page! Don't forget to review your favorite albums today. ~Anvit
            </p>
          </div>

          {/* Ad / Banner placeholder */}
          <div className="border border-dashed border-dark-500 p-4 text-center mt-4">
            <p className="text-dark-500 text-xs">Your Ad Here<br/>468x60</p>
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
      <div className="bg-brand-500 border-3d p-6 inline-block mb-4 text-white">
        <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: 'Georgia, serif' }}>{greeting}{profile.name?`, ${profile.name}`:''}</h1>
        <p className="text-sm font-bold bg-dark-800 text-black inline-block px-2 border-3d-inset">Discover and review music you love.</p>
      </div>

      {recTracks.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-brand-500 mb-4 border-b-2 border-brand-500 pb-1">Recommended for You</h2>
          <div className="space-y-1">{recTracks.slice(0,8).map(t=><TrackRow key={t.id} track={t} onReview={onReview} onPlaylist={onPlaylist}/>)}</div>
        </section>
      )}

      {newReleases.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-brand-500 mb-4 border-b-2 border-brand-500 pb-1">New Releases</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {newReleases.map(a=>(
              <div key={a.id} onClick={()=>onAlbum(a)} className="bg-dark-800 p-3 border-3d hover:bg-gray-100 cursor-pointer group">
                <img src={a.images?.[0]?.url} className="w-full aspect-square mb-2 object-cover border border-dark-400" alt=""/>
                <h3 className="font-bold text-brand-500 group-hover:underline truncate text-sm">{a.name}</h3>
                <p className="text-xs text-dark-600 truncate">{a.artists?.map(x=>x.name).join(', ')}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {feedArtists.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-brand-500 mb-4 border-b-2 border-brand-500 pb-1">Explore Artists</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {feedArtists.slice(0,10).map(a=>(
              <div key={a.id} onClick={()=>onArtist(a)} className="bg-dark-800 p-3 border-3d hover:bg-gray-100 cursor-pointer group">
                <img src={a.images?.[0]?.url} className="w-full aspect-square mb-2 object-cover border border-dark-400" alt=""/>
                <h3 className="font-bold text-brand-500 group-hover:underline truncate text-sm">{a.name}</h3>
                <p className="text-xs text-dark-600 truncate">{a.genres?.slice(0,2).join(', ')||'Artist'}</p>
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
      <div className="flex gap-2 mb-8">
        {tabs.map(t=>(
          <button key={t} onClick={()=>setSearchTab(t)} className={`px-4 py-1.5 font-bold text-sm border-3d hover:bg-gray-200 active:border-3d-inset capitalize ${searchTab===t?'bg-brand-500 text-white':'bg-dark-800 text-black'}`}>{t}</button>
        ))}
      </div>

      {searching && <Spinner/>}
      {!searching && !searchResults && !searchQ && <p className="text-dark-500 text-center py-12">Type something above to search Spotify</p>}

      {searchResults && <>
        {(searchTab==='all'||searchTab==='artists') && searchResults.artists?.items?.length > 0 && <>
          <h2 className="text-xl font-bold text-brand-500 mb-4 border-b-2 border-brand-500 pb-1">Artists</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
            {searchResults.artists.items.slice(0,searchTab==='artists'?12:6).map(a=>(
              <div key={a.id} onClick={()=>onArtist(a)} className="bg-dark-800 p-3 border-3d hover:bg-gray-100 cursor-pointer flex flex-col items-center gap-2 group">
                <img src={a.images?.[0]?.url||'https://via.placeholder.com/150'} className="w-24 h-24 object-cover border border-dark-400" alt=""/>
                <span className="text-sm font-bold text-brand-500 group-hover:underline truncate w-full text-center">{a.name}</span>
              </div>
            ))}
          </div>
        </>}

        {(searchTab==='all'||searchTab==='tracks') && searchResults.tracks?.items?.length > 0 && <>
          <h2 className="text-xl font-bold text-brand-500 mb-4 border-b-2 border-brand-500 pb-1">Tracks</h2>
          <div className="space-y-1 mb-8">{searchResults.tracks.items.slice(0,searchTab==='tracks'?20:8).map(t=><TrackRow key={t.id} track={t} onReview={onReview} onPlaylist={onPlaylist}/>)}</div>
        </>}

        {(searchTab==='all'||searchTab==='albums') && searchResults.albums?.items?.length > 0 && <>
          <h2 className="text-xl font-bold text-brand-500 mb-4 border-b-2 border-brand-500 pb-1">Albums</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {searchResults.albums.items.slice(0,searchTab==='albums'?15:5).map(a=>(
              <div key={a.id} onClick={()=>onAlbum(a)} className="bg-dark-800 p-3 border-3d hover:bg-gray-100 cursor-pointer group">
                <img src={a.images?.[0]?.url} className="w-full aspect-square mb-2 object-cover border border-dark-400" alt=""/>
                <h3 className="font-bold text-brand-500 group-hover:underline truncate text-sm">{a.name}</h3>
                <p className="text-xs text-dark-600 truncate">{a.artists?.map(x=>x.name).join(', ')}</p>
                <p className="text-xs text-dark-500 font-bold">{a.release_date?.slice(0,4)}</p>
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
      <button onClick={onBack} className="flex items-center gap-2 text-black bg-dark-800 border-3d hover:bg-gray-200 active:border-3d-inset px-4 py-1 font-bold text-sm mb-6"><ArrowLeft size={16}/>Back</button>

      <div className="flex flex-col md:flex-row gap-6 mb-10">
        <img src={img} className="w-48 h-48 object-cover border border-dark-400" alt=""/>
        <div className="flex flex-col justify-end bg-dark-800 border-3d p-6 flex-1">
          <p className="text-xs text-dark-500 font-bold mb-1">Artist Profile</p>
          <h1 className="text-4xl font-bold text-brand-500 mb-2" style={{ fontFamily: 'Georgia, serif' }}>{artist.name}</h1>
          <p className="text-dark-600 font-bold text-sm mb-4">{artist.genres?.slice(0,3).join(' · ') || 'Music'}</p>
          <div className="flex items-center gap-6">
            {followers && <span className="text-dark-600 text-sm"><strong>{followers.toLocaleString()}</strong> followers</span>}
            <a href={spotifyUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-brand-500 text-sm font-bold hover:underline"><ExternalLink size={16}/>Spotify</a>
            <button onClick={()=>onReview({...artist, entity_type: 'artist'})} className="flex items-center gap-1 text-black text-sm font-bold hover:underline"><Disc3 size={16}/>Write Review</button>
          </div>
        </div>
      </div>

      {loading ? <Spinner/> : (
        <div className="space-y-8">
          <div className="p-6 border-3d bg-dark-800">
            <h2 className="text-xl font-bold text-brand-500 mb-4 border-b border-dark-400 pb-1">Artist Reviews</h2>
            <ReviewsPanel trackId={artist.id} padding="pl-0" />
          </div>
          {tracks.length > 0 && (
            <section className="bg-dark-800 border-3d p-6">
              <h2 className="text-xl font-bold text-brand-500 mb-4 border-b border-dark-400 pb-1">Popular Tracks</h2>
              <div className="space-y-1">{tracks.map(t=><TrackRow key={t.id} track={t} onReview={onReview} onPlaylist={onPlaylist}/>)}</div>
            </section>
          )}

          {albums.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-brand-500 mb-4 border-b-2 border-brand-500 pb-1">Discography</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {albums.map(a=>(
                  <div key={a.id} onClick={()=>onAlbum(a)} className="bg-dark-800 p-3 border-3d hover:bg-gray-100 cursor-pointer group">
                    <img src={a.images?.[0]?.url} className="w-full aspect-square mb-2 object-cover border border-dark-400" alt=""/>
                    <h3 className="font-bold text-brand-500 group-hover:underline truncate text-sm">{a.name}</h3>
                    <p className="text-xs text-dark-600">{a.release_date?.slice(0,4)}</p>
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
      <button onClick={onBack} className="flex items-center gap-2 text-black bg-dark-800 border-3d hover:bg-gray-200 active:border-3d-inset px-4 py-1 font-bold text-sm mb-6"><ArrowLeft size={16}/>Back</button>

      <div className="flex flex-col md:flex-row gap-6 mb-10">
        <img src={img} className="w-48 h-48 object-cover border border-dark-400" alt=""/>
        <div className="flex flex-col justify-end bg-dark-800 border-3d p-6 flex-1">
          <p className="text-xs text-dark-500 font-bold mb-1 capitalize">{album.album_type || 'Album'}</p>
          <h1 className="text-4xl font-bold text-brand-500 mb-2" style={{ fontFamily: 'Georgia, serif' }}>{album.name}</h1>
          <div className="flex items-center gap-2 text-dark-600 font-bold text-sm mb-4">
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
            <a href={spotifyUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-brand-500 text-sm font-bold hover:underline"><ExternalLink size={16}/>Spotify</a>
            <button onClick={()=>onReview({...album, entity_type: 'album'})} className="flex items-center gap-1 text-black text-sm font-bold hover:underline"><Disc3 size={16}/>Write Review</button>
          </div>
        </div>
      </div>

      {loading ? <Spinner/> : (
        <div className="space-y-8">
          <div className="p-6 border-3d bg-dark-800">
            <h2 className="text-xl font-bold text-brand-500 mb-4 border-b border-dark-400 pb-1">Album Reviews</h2>
            <ReviewsPanel trackId={album.id} padding="pl-0" />
          </div>
          <div className="bg-dark-800 border-3d p-6">
            <h2 className="text-xl font-bold text-brand-500 mb-4 border-b border-dark-400 pb-1">Album Tracks</h2>
            <div className="space-y-1">
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
      <h1 className="text-3xl font-bold text-brand-500 mb-8 border-b border-dark-400 pb-2" style={{ fontFamily: 'Georgia, serif' }}>Your Library</h1>
      {loading ? <Spinner/> :
        playlists.length === 0 ? (
          <div className="text-center py-20 bg-dark-800 border-3d">
            <Music size={48} className="text-brand-500 mx-auto mb-4"/>
            <p className="text-black font-bold text-lg mb-2">Your library is empty</p>
            <p className="text-dark-600 text-sm">Search for songs and add them to playlists!</p>
          </div>
        ) :
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {playlists.map(pl=>(
            <div key={pl.PlaylistID} className="bg-dark-800 p-6 border-3d">
              <div className="flex items-start justify-between mb-4 border-b border-dark-400 pb-3">
                <div><h3 className="text-black font-bold text-xl">{pl.Name}</h3><p className="text-dark-600 font-sans text-xs">{(pl.Tracks||[]).length} tracks</p></div>
                <div className="flex gap-2">
                  <button onClick={()=>setExpanded(expanded===pl.PlaylistID?null:pl.PlaylistID)} className="text-black bg-dark-800 hover:bg-gray-200 p-1.5 border-3d active:border-3d-inset transition-colors">
                    {expanded===pl.PlaylistID ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                  </button>
                  <button onClick={()=>deletePlaylist(pl.PlaylistID)} className="text-white bg-brand-500 hover:bg-red-700 p-1.5 border-3d active:border-3d-inset transition-colors"><Trash2 size={16}/></button>
                </div>
              </div>
              <div className="space-y-1">
              {(pl.Tracks||[]).slice(0, expanded===pl.PlaylistID ? undefined : 3).map((t,i)=>(
                <div key={i} className="flex items-center gap-3 py-1">
                  {t.image && <img src={t.image} className="w-8 h-8 object-cover border border-dark-400" alt=""/>}
                  <div className="flex-1 min-w-0"><p className="text-black font-bold text-sm truncate">{t.name}</p><p className="text-dark-600 font-sans text-xs truncate">{t.artist}</p></div>
                </div>
              ))}
              </div>
              {(pl.Tracks||[]).length > 3 && expanded!==pl.PlaylistID && (
                <button className="text-brand-500 text-xs hover:underline mt-4" onClick={()=>setExpanded(pl.PlaylistID)}>+{(pl.Tracks||[]).length - 3} MORE TRACKS</button>
              )}
            </div>
          ))}
        </div>}
    </div>
  );
}
