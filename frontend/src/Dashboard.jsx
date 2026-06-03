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
    <div className="min-h-screen flex bg-dark-900 text-dark-100 font-sans">
      {reviewTrack && <ReviewModal track={reviewTrack} onClose={()=>setReviewTrack(null)}/>}
      {playlistTrack && <PlaylistModal track={playlistTrack} onClose={()=>setPlaylistTrack(null)}/>}

      {/* Sidebar */}
      <aside className="w-64 bg-dark-900 border-r border-dark-700/50 p-6 flex flex-col h-screen sticky top-0 shrink-0">
        <div className="flex items-center gap-3 mb-10 text-white">
          <div className="w-8 h-8 bg-white text-black flex items-center justify-center rounded-sm"><PlayCircle size={18}/></div>
          <h2 className="text-xl font-bold tracking-tight">Tastelytics</h2>
        </div>
        <nav className="flex flex-col gap-2 text-sm font-semibold">
          {[['home','Home',PlayCircle],['search','Search',Search],['library','Library',Library]].map(([key,label,Icon])=>(
            <button key={key} onClick={()=>nav(key)}
              className={`flex items-center gap-4 px-3 py-2.5 rounded-lg transition-colors text-left ${view===key||(!['home','search','library'].includes(view)&&key==='home')?'text-white bg-dark-700/50':'text-dark-400 hover:text-white'}`}>
              <Icon size={20}/>{label}
            </button>
          ))}
        </nav>
        <div className="mt-8 pt-6 border-t border-dark-700/50 flex-1 overflow-hidden">
          <p className="text-xs font-bold uppercase tracking-widest text-dark-400 mb-3">Your Profile</p>
          <p className="text-white font-semibold text-sm truncate">{profile.name || 'User'}</p>
          <p className="text-dark-500 text-xs">{profile.favorite_genres?.split(',').slice(0,2).join(', ')}</p>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 h-screen overflow-y-auto bg-dark-900">
        <header className="sticky top-0 z-20 bg-dark-900/90 backdrop-blur-md border-b border-dark-700/50 px-8 py-4">
          <div className="relative w-full max-w-lg">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500"/>
            <input type="text" value={searchQ} onChange={e=>{doSearch(e.target.value);setView('search');}} onFocus={()=>setView('search')}
              placeholder="Search artists, songs, albums..." className="w-full bg-dark-800 text-white placeholder-dark-500 pl-10 pr-4 py-2 rounded-md border border-dark-700 focus:outline-none focus:border-white transition-all text-sm font-medium"/>
          </div>
        </header>

        <div className="p-8 max-w-5xl mx-auto">
          {view === 'home' && <HomeView feedArtists={feedArtists} recTracks={recTracks} newReleases={newReleases} feedLoading={feedLoading} onArtist={a=>{setSelectedArtist(a);setView('artist');}} onAlbum={a=>{setSelectedAlbum(a);setView('album');}} onReview={setReviewTrack} onPlaylist={setPlaylistTrack}/>}
          {view === 'search' && <SearchView searchQ={searchQ} searchResults={searchResults} searching={searching} searchTab={searchTab} setSearchTab={setSearchTab} onArtist={a=>{setSelectedArtist(a);setView('artist');}} onAlbum={a=>{setSelectedAlbum(a);setView('album');}} onReview={setReviewTrack} onPlaylist={setPlaylistTrack}/>}
          {view === 'artist' && selectedArtist && <ArtistPage artist={selectedArtist} onBack={()=>nav('home')} onArtist={a=>{setSelectedArtist(a);}} onAlbum={a=>{setSelectedAlbum(a);setView('album');}} onReview={setReviewTrack} onPlaylist={setPlaylistTrack}/>}
          {view === 'album' && selectedAlbum && <AlbumPage album={selectedAlbum} onBack={()=>selectedArtist?setView('artist'):nav('home')} onArtist={a=>{setSelectedArtist(a);setView('artist');}} onReview={setReviewTrack} onPlaylist={setPlaylistTrack}/>}
          {view === 'library' && <LibraryView/>}
        </div>
      </main>
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
      <div>
        <h1 className="text-4xl font-extrabold text-white mb-1 tracking-tight">{greeting}{profile.name?`, ${profile.name}`:''}</h1>
        <p className="text-dark-400">Discover and review music you love.</p>
      </div>

      {recTracks.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-white mb-4">Recommended for You</h2>
          <div className="space-y-1">{recTracks.slice(0,8).map(t=><TrackRow key={t.id} track={t} onReview={onReview} onPlaylist={onPlaylist}/>)}</div>
        </section>
      )}

      {newReleases.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-white mb-4">New Releases</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {newReleases.map(a=>(
              <div key={a.id} onClick={()=>onAlbum(a)} className="bg-transparent p-3 border border-dark-700 hover:border-dark-400 transition-colors cursor-pointer group">
                <img src={a.images?.[0]?.url} className="w-full aspect-square mb-3 object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all" alt=""/>
                <h3 className="font-bold text-white truncate text-sm transition-colors">{a.name}</h3>
                <p className="text-xs text-dark-400 truncate">{a.artists?.map(x=>x.name).join(', ')}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {feedArtists.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-white mb-4">Explore Artists</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
            {feedArtists.slice(0,10).map(a=>(
              <div key={a.id} onClick={()=>onArtist(a)} className="bg-transparent p-3 border border-dark-700 hover:border-dark-400 transition-colors cursor-pointer group">
                <img src={a.images?.[0]?.url} className="w-full aspect-square mb-3 object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all" alt=""/>
                <h3 className="font-bold text-white truncate text-sm transition-colors">{a.name}</h3>
                <p className="text-xs text-dark-400 truncate">{a.genres?.slice(0,2).join(', ')||'Artist'}</p>
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
      <div className="flex gap-3 mb-6">
        {tabs.map(t=>(
          <button key={t} onClick={()=>setSearchTab(t)} className={`px-4 py-1.5 rounded-sm text-sm font-bold capitalize transition-all border ${searchTab===t?'bg-white text-black border-white':'bg-transparent text-dark-400 border-dark-700 hover:text-white hover:border-dark-400'}`}>{t}</button>
        ))}
      </div>

      {searching && <Spinner/>}
      {!searching && !searchResults && !searchQ && <p className="text-dark-500 text-center py-12">Type something above to search Spotify</p>}

      {searchResults && <>
        {(searchTab==='all'||searchTab==='artists') && searchResults.artists?.items?.length > 0 && <>
          <h2 className="text-lg font-bold text-white mb-4">Artists</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
            {searchResults.artists.items.slice(0,searchTab==='artists'?12:6).map(a=>(
              <div key={a.id} onClick={()=>onArtist(a)} className="flex flex-col items-center gap-2 cursor-pointer group">
                <img src={a.images?.[0]?.url||'https://via.placeholder.com/150'} className="w-24 h-24 object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all border border-dark-700" alt=""/>
                <span className="text-sm font-bold text-white transition-colors truncate w-full text-center">{a.name}</span>
              </div>
            ))}
          </div>
        </>}

        {(searchTab==='all'||searchTab==='tracks') && searchResults.tracks?.items?.length > 0 && <>
          <h2 className="text-lg font-bold text-white mb-4">Tracks</h2>
          <div className="space-y-1 mb-8">{searchResults.tracks.items.slice(0,searchTab==='tracks'?20:8).map(t=><TrackRow key={t.id} track={t} onReview={onReview} onPlaylist={onPlaylist}/>)}</div>
        </>}

        {(searchTab==='all'||searchTab==='albums') && searchResults.albums?.items?.length > 0 && <>
          <h2 className="text-lg font-bold text-white mb-4">Albums</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {searchResults.albums.items.slice(0,searchTab==='albums'?15:5).map(a=>(
              <div key={a.id} onClick={()=>onAlbum(a)} className="bg-transparent p-3 border border-dark-700 hover:border-dark-400 transition-colors cursor-pointer group">
                <img src={a.images?.[0]?.url} className="w-full aspect-square mb-3 object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all" alt=""/>
                <h3 className="font-bold text-white truncate text-sm transition-colors">{a.name}</h3>
                <p className="text-xs text-dark-400 truncate">{a.artists?.map(x=>x.name).join(', ')}</p>
                <p className="text-xs font-mono text-dark-500">{a.release_date?.slice(0,4)}</p>
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
      <button onClick={onBack} className="flex items-center gap-2 text-dark-400 hover:text-white mb-6 transition-colors"><ArrowLeft size={18}/>Back</button>

      <div className="flex gap-6 mb-8">
        <img src={img} className="w-44 h-44 object-cover border border-dark-700 grayscale" alt=""/>
        <div className="flex flex-col justify-end">
          <p className="text-xs uppercase tracking-widest font-mono text-dark-400 font-bold mb-1">Artist</p>
          <h1 className="text-5xl font-extrabold text-white tracking-tight mb-2">{artist.name}</h1>
          <p className="text-dark-400 text-sm mb-3">{artist.genres?.slice(0,3).join(' · ') || 'Music'}</p>
          <div className="flex items-center gap-4">
            {followers && <span className="text-dark-500 font-mono text-xs">{followers.toLocaleString()} followers</span>}
            <a href={spotifyUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-white text-xs font-bold hover:underline"><ExternalLink size={14}/>Open in Spotify</a>
            <button onClick={()=>onReview({...artist, entity_type: 'artist'})} className="flex items-center gap-1 text-dark-100 hover:text-white text-xs font-bold"><Disc3 size={14}/>Review Artist</button>
          </div>
        </div>
      </div>

      {loading ? <Spinner/> : (
        <div className="space-y-10">
          <div className="p-6 border border-dark-700">
            <h2 className="text-xl font-bold text-white mb-4">Artist Reviews</h2>
            <ReviewsPanel trackId={artist.id} padding="pl-0" />
          </div>
          {tracks.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-white mb-4">Popular Tracks</h2>
              <div className="space-y-1">{tracks.map(t=><TrackRow key={t.id} track={t} onReview={onReview} onPlaylist={onPlaylist}/>)}</div>
            </section>
          )}

          {albums.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-white mb-4">Discography</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {albums.map(a=>(
                  <div key={a.id} onClick={()=>onAlbum(a)} className="bg-transparent p-3 border border-dark-700 hover:border-dark-400 transition-colors cursor-pointer group">
                    <img src={a.images?.[0]?.url} className="w-full aspect-square mb-3 object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all" alt=""/>
                    <h3 className="font-bold text-white truncate text-sm transition-colors">{a.name}</h3>
                    <p className="text-xs font-mono text-dark-500">{a.release_date?.slice(0,4)} · {a.album_type}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {related.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-white mb-4">Related Artists</h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                {related.slice(0,12).map(a=>(
                  <div key={a.id} onClick={()=>onArtist(a)} className="flex flex-col items-center gap-2 cursor-pointer group">
                    <img src={a.images?.[0]?.url||'https://via.placeholder.com/150'} className="w-24 h-24 object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all border border-dark-700" alt=""/>
                    <span className="text-xs font-bold text-white text-center truncate w-full transition-colors">{a.name}</span>
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
      <button onClick={onBack} className="flex items-center gap-2 text-dark-400 hover:text-white mb-6 transition-colors"><ArrowLeft size={18}/>Back</button>

      <div className="flex gap-6 mb-8">
        <img src={img} className="w-48 h-48 object-cover border border-dark-700 grayscale" alt=""/>
        <div className="flex flex-col justify-end">
          <p className="text-xs uppercase tracking-widest font-mono text-dark-400 font-bold mb-1">{album.album_type || 'Album'}</p>
          <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">{album.name}</h1>
          <div className="flex items-center gap-2 font-mono text-dark-400 text-sm mb-3">
            {album.artists?.map((a,i) => (
              <span key={a.id}>
                <button onClick={()=>onArtist(a)} className="hover:text-white hover:underline transition-colors font-semibold">{a.name}</button>
                {i < album.artists.length - 1 && ', '}
              </span>
            ))}
            <span>· {album.release_date?.slice(0,4)}</span>
            {tracks.length > 0 && <span>· {tracks.length} tracks, {mins} min</span>}
          </div>
          <div className="flex items-center gap-4">
            <a href={spotifyUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-white text-sm font-bold hover:underline"><ExternalLink size={14}/>Open in Spotify</a>
            <button onClick={()=>onReview({...album, entity_type: 'album'})} className="flex items-center gap-1 text-dark-100 hover:text-white text-sm font-bold"><Disc3 size={14}/>Review Album</button>
          </div>
        </div>
      </div>

      {loading ? <Spinner/> : (
        <div className="space-y-6">
          <div className="p-6 border border-dark-700">
            <h2 className="text-xl font-bold text-white mb-4">Album Reviews</h2>
            <ReviewsPanel trackId={album.id} padding="pl-0" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white mb-4">Album Tracks</h2>
            <div className="space-y-1">
          {tracks.map((t, i) => {
            const durMin = Math.floor((t.duration_ms||0)/60000);
            const durSec = Math.floor(((t.duration_ms||0)%60000)/1000).toString().padStart(2,'0');
            return (
              <div key={t.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-dark-700/40 transition-colors group">
                <span className="text-dark-500 text-sm w-6 text-right shrink-0">{i+1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold truncate text-sm">{t.name}</p>
                  <p className="text-dark-400 text-xs truncate">{t.artists?.map(a=>a.name).join(', ')}</p>
                </div>
                <span className="text-dark-500 text-xs shrink-0">{durMin}:{durSec}</span>
                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a href={`https://open.spotify.com/track/${t.id}`} target="_blank" rel="noopener noreferrer" className="text-dark-400 hover:text-brand-500 p-1.5 rounded-lg hover:bg-dark-600/50"><ExternalLink size={14}/></a>
                  <button onClick={()=>onReview(t)} className="text-dark-400 hover:text-yellow-400 p-1.5 rounded-lg hover:bg-dark-600/50"><Disc3 size={14}/></button>
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
      <h1 className="text-2xl font-bold text-white mb-6">Your Library</h1>
      {loading ? <Spinner/> :
        playlists.length === 0 ? (
          <div className="text-center py-16">
            <Music size={48} className="text-dark-600 mx-auto mb-4"/>
            <p className="text-dark-400 font-semibold mb-1">Your library is empty</p>
            <p className="text-dark-500 text-sm">Search for songs and add them to playlists!</p>
          </div>
        ) :
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {playlists.map(pl=>(
            <div key={pl.PlaylistID} className="bg-transparent p-5 border border-dark-700 hover:border-dark-400 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div><h3 className="text-white font-bold">{pl.Name}</h3><p className="text-dark-400 font-mono text-sm">{(pl.Tracks||[]).length} tracks</p></div>
                <div className="flex gap-1">
                  <button onClick={()=>setExpanded(expanded===pl.PlaylistID?null:pl.PlaylistID)} className="text-dark-400 hover:text-white p-1.5 border border-transparent hover:border-dark-600 transition-colors">
                    {expanded===pl.PlaylistID ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                  </button>
                  <button onClick={()=>deletePlaylist(pl.PlaylistID)} className="text-dark-400 hover:text-white p-1.5 border border-transparent hover:border-dark-600 transition-colors"><Trash2 size={16}/></button>
                </div>
              </div>
              {(pl.Tracks||[]).slice(0, expanded===pl.PlaylistID ? undefined : 3).map((t,i)=>(
                <div key={i} className="flex items-center gap-3 py-1.5">
                  {t.image && <img src={t.image} className="w-8 h-8 object-cover grayscale opacity-80 border border-dark-700" alt=""/>}
                  <div className="flex-1 min-w-0"><p className="text-white text-sm truncate">{t.name}</p><p className="text-dark-500 font-mono text-xs truncate">{t.artist}</p></div>
                </div>
              ))}
              {(pl.Tracks||[]).length > 3 && expanded!==pl.PlaylistID && (
                <p className="text-dark-500 font-mono text-xs mt-2 cursor-pointer hover:text-dark-400" onClick={()=>setExpanded(pl.PlaylistID)}>+{(pl.Tracks||[]).length - 3} more</p>
              )}
            </div>
          ))}
        </div>}
    </div>
  );
}
