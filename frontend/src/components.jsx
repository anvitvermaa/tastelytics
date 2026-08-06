import { apiFetch } from './api';
import React, { useState, useEffect } from 'react';
import { Star, X, Plus, Music, PlusCircle, MessageCircle, ExternalLink } from 'lucide-react';

const API = "https://ny8zhk2zga.execute-api.us-east-1.amazonaws.com/prod";

export function getUserId() {
  return localStorage.getItem('tastelytics_uid') || 'anonymous';
}

export function Stars({ rating, onRate, size = 16 }) {
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={size} onClick={() => onRate?.(i)}
          className={`${onRate ? 'cursor-pointer hover:scale-125' : ''} transition-transform ${i <= rating ? 'text-yellow-400' : 'text-dark-600'}`}
          fill={i <= rating ? 'currentColor' : 'none'} />
      ))}
    </div>
  );
}

export function ReviewModal({ track, onClose }) {
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const profile = JSON.parse(localStorage.getItem('tastelytics_profile') || '{}');

  const submit = async () => {
    if (!rating) return;
    setSubmitting(true);
    try {
      const isArtist = track.entity_type === 'artist';
      const isAlbum = track.entity_type === 'album';
      const entityLabel = track.entity_type ? track.entity_type.charAt(0).toUpperCase() + track.entity_type.slice(1) : 'Track';
      const imgUrl = isArtist ? track.images?.[0]?.url : (track.album?.images?.[0]?.url || track.images?.[0]?.url);
      const artName = isArtist ? track.name : (track.artists?.map(a=>a.name).join(', '));
      
      await apiFetch(`/reviews`, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          track_id: track.id, rating, review_text: text,
          user_id: getUserId(), user_name: profile.name || 'Anonymous',
          entity_type: track.entity_type || 'track',
          track_name: track.name, artist_name: artName || '',
          album_art: imgUrl || ''
        })
      });
      setDone(true);
      setTimeout(onClose, 1200);
    } catch(e) { console.error(e); }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-none flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="win95-window max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="win95-titlebar">
          <span>REVIEW.EXE</span>
          <button onClick={onClose} className="win95-button w-5 h-5 text-xs font-bold pb-1 text-black">X</button>
        </div>
        <div className="p-6 bg-dark-800 flex flex-col">
        <div className="flex gap-4 mb-6 bg-yellow-200 p-3 border-[3px] border-dark-700 shadow-[inset_2px_2px_0_0_rgba(0,0,0,0.1)]">
          <img src={track.images?.[0]?.url || track.album?.images?.[0]?.url} className="w-16 h-16 object-cover border-[2px] border-dark-700" alt="" />
          <div className="min-w-0">
            <p className="text-xs text-dark-700 font-extrabold mb-0.5 uppercase tracking-widest">{track.entity_type || 'Track'}</p>
            <p className="text-black font-extrabold uppercase tracking-tight truncate text-lg leading-tight">{track.name}</p>
            {track.entity_type !== 'artist' && <p className="text-brand-500 font-bold text-xs uppercase tracking-widest">{track.artists?.map(a=>a.name).join(', ')}</p>}
          </div>
        </div>
        {done ? (
          <div className="text-center py-6 bg-white border-[3px] border-dark-700 shadow-[inset_2px_2px_0_0_rgba(0,0,0,0.1)]"><p className="text-[#0000A0] text-xl font-extrabold uppercase tracking-widest">✓ Submitted!</p></div>
        ) : (<>
          <div className="mb-4 bg-dark-800 p-3 border-2 border-dark-600 shadow-[inset_2px_2px_0_0_rgba(255,255,255,0.5)] flex items-center gap-4"><p className="text-black font-extrabold uppercase tracking-widest text-sm">Rating:</p><Stars rating={rating} onRate={setRating} size={28}/></div>
          <textarea value={text} onChange={e=>setText(e.target.value)} rows={3} placeholder="Share your thoughts..."
            className="w-full win95-inset text-black placeholder-dark-600 p-3 border-[3px] border-dark-700 focus:outline-none focus:bg-yellow-100 mb-4 resize-none font-bold text-sm"/>
          <button onClick={submit} disabled={!rating || submitting}
            className="win95-button w-full py-2 text-sm font-bold uppercase">
            {submitting ? 'SUBMITTING...' : 'SUBMIT REVIEW'}
          </button>
        </>)}
        </div>
      </div>
    </div>
  );
}

export function PlaylistModal({ track, onClose }) {
  const [playlists, setPlaylists] = useState([]);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const uid = getUserId();

  useEffect(() => {
    apiFetch(`/playlists?user_id=${uid}`).then(r=>r.json()).then(d=>setPlaylists(d.playlists||[])).catch(()=>{});
  }, []);

  const createPlaylist = async () => {
    if (!newName) return;
    setCreating(true);
    const res = await apiFetch(`/playlists`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user_id:uid,name:newName})});
    const d = await res.json();
    setPlaylists([...playlists, d.playlist]);
    setNewName('');
    setCreating(false);
  };

  const addTrack = async (pl) => {
    await apiFetch(`/playlists`, {method:'PUT',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({user_id:uid,playlist_id:pl.PlaylistID,track:{id:track.id,name:track.name,artist:track.artists?.[0]?.name,image:track.album?.images?.[0]?.url}})
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-none flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="win95-window max-w-sm w-full" onClick={e=>e.stopPropagation()}>
        <div className="win95-titlebar">
          <span>ADD_TO_PLAYLIST.EXE</span>
          <button onClick={onClose} className="win95-button w-5 h-5 text-xs font-bold pb-1 text-black">X</button>
        </div>
        <div className="p-6 bg-dark-800 flex flex-col">
        <div className="flex gap-2 mb-6">
          <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="New playlist..."
            className="flex-1 win95-inset text-black placeholder-dark-600 px-3 py-2 border-[3px] border-dark-700 focus:outline-none focus:bg-yellow-100 font-bold text-sm"/>
          <button onClick={createPlaylist} disabled={creating} className="win95-button px-3 py-2"><Plus size={20} strokeWidth={3}/></button>
        </div>
        <div className="space-y-3 max-h-60 overflow-y-auto pr-2 win95-inset p-2 border-[3px] border-dark-700 bg-white" style={{ scrollbarWidth: 'thin' }}>
          {playlists.map(pl => (
            <button key={pl.PlaylistID} onClick={()=>addTrack(pl)}
              className="w-full text-left bg-white hover:bg-brand-500 hover:text-white text-black p-2 flex items-center gap-3 transition-colors group">
              <Music size={20} strokeWidth={3} className="text-[#0000A0] group-hover:text-white shrink-0"/><span className="truncate font-extrabold uppercase tracking-widest text-sm">{pl.Name}</span>
            </button>
          ))}
          {!playlists.length && <p className="text-dark-600 font-bold uppercase tracking-widest text-sm text-center py-4">No playlists yet.</p>}
        </div>
        </div>
      </div>
    </div>
  );
}

export function ReviewsPanel({ trackId, padding = "pl-16" }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    apiFetch(`/reviews/item/${trackId}`).then(r=>r.json()).then(d=>{setReviews(d.reviews||[]);setLoading(false);}).catch(()=>setLoading(false));
  }, [trackId]);
  if (loading) return <div className={`py-3 ${padding}`}><div className="w-5 h-5 border-4 border-black border-t-brand-500 rounded-full animate-spin"/></div>;
  if (!reviews.length) return <p className={`text-dark-500 font-extrabold uppercase tracking-widest text-xs py-2 ${padding}`}>No reviews yet. Be the first!</p>;
  return (
    <div className={`${padding} pr-4 pb-3 space-y-4`}>
      {reviews.slice(0,5).map((r,i) => (
        <div key={i} className="bg-white border-2 border-dark-400 shadow-[inset_2px_2px_0_0_rgba(0,0,0,0.1)] p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-white text-xs font-bold uppercase tracking-widest bg-[#0000A0] px-1">{r.UserName||'Anonymous'}</span>
            <Stars rating={Number(r.Rating)||0} size={14}/>
          </div>
          {r.ReviewText && <p className="text-black font-bold text-sm leading-relaxed">{r.ReviewText}</p>}
        </div>
      ))}
    </div>
  );
}

export function TrackRow({ track, onReview, onPlaylist, onBurn, onArtist }) {
  const [showReviews, setShowReviews] = useState(false);
  const img = track.album?.images?.[2]?.url || track.album?.images?.[0]?.url;
  const spotifyUrl = `https://open.spotify.com/track/${track.id}`;
  return (
    <div>
      <div className="flex items-center gap-4 p-3 border-b-2 border-dark-700/20 hover:bg-yellow-100 transition-colors group">
        <img src={img} className="w-12 h-12 shrink-0 object-cover border-[3px] border-dark-700 shadow-retro-sm" alt=""/>
        <div className="flex-1 min-w-0">
          <p className="text-black font-extrabold uppercase tracking-widest truncate text-sm">{track.name}</p>
          <p className="text-dark-600 font-bold uppercase tracking-widest text-xs truncate">
            {track.artists?.map((a, i) => (
              <span key={a.id}>
                <span 
                  className={`transition-colors ${onArtist ? 'cursor-pointer hover:text-[#0000A0] hover:underline' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onArtist) onArtist(a);
                  }}
                >
                  {a.name}
                </span>
                {i < track.artists.length - 1 && ', '}
              </span>
            ))}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
          <a href={spotifyUrl} target="_blank" rel="noopener noreferrer" className="win95-button p-1.5" title="Open in Spotify"><ExternalLink size={16} strokeWidth={3}/></a>
          {onBurn && <button onClick={()=>onBurn(track)} className="win95-button px-2 py-1 font-bold text-xs uppercase tracking-widest bg-[#f9f586]" title="Add to CD Burner">[+ BURN]</button>}
          <button onClick={()=>setShowReviews(!showReviews)} className="win95-button p-1.5" title="Reviews"><MessageCircle size={16} strokeWidth={3}/></button>
          <button onClick={()=>onPlaylist(track)} className="win95-button p-1.5" title="Add to playlist"><PlusCircle size={16} strokeWidth={3}/></button>
          <button onClick={()=>onReview(track)} className="win95-button p-1.5" title="Write review"><Star size={16} strokeWidth={3}/></button>
        </div>
      </div>
      {showReviews && <ReviewsPanel trackId={track.id}/>}
    </div>
  );
}

export function Spinner() {
  return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"/></div>;
}

export { API };
