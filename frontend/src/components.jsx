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
      
      await fetch(`${API}/reviews`, {
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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-dark-900 border border-dark-700 p-8 max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-xl font-bold text-white">Write a Review</h2>
          <button onClick={onClose} className="text-dark-400 hover:text-white"><X size={20}/></button>
        </div>
        <div className="flex gap-4 mb-6">
          <img src={track.images?.[0]?.url || track.album?.images?.[0]?.url} className="w-16 h-16 object-cover grayscale opacity-80 border border-dark-700" alt="" />
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-dark-400 font-bold mb-0.5">{track.entity_type || 'Track'}</p>
            <p className="text-white font-bold truncate">{track.name}</p>
            {track.entity_type !== 'artist' && <p className="text-dark-400 text-sm">{track.artists?.map(a=>a.name).join(', ')}</p>}
          </div>
        </div>
        {done ? (
          <div className="text-center py-8"><p className="text-white text-lg font-bold">✓ Review submitted!</p></div>
        ) : (<>
          <div className="mb-4"><p className="text-dark-400 font-mono text-sm mb-2">Rating</p><Stars rating={rating} onRate={setRating} size={28}/></div>
          <textarea value={text} onChange={e=>setText(e.target.value)} rows={3} placeholder="Share your thoughts..."
            className="w-full bg-transparent text-white placeholder-dark-500 p-3 border border-dark-700 focus:outline-none focus:border-white mb-4 resize-none transition-colors"/>
          <button onClick={submit} disabled={!rating || submitting}
            className="w-full bg-white disabled:bg-dark-700 disabled:text-dark-500 text-black font-bold py-3 hover:bg-gray-200 transition-colors">
            {submitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </>)}
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
    fetch(`${API}/playlists?user_id=${uid}`).then(r=>r.json()).then(d=>setPlaylists(d.playlists||[])).catch(()=>{});
  }, []);

  const createPlaylist = async () => {
    if (!newName) return;
    setCreating(true);
    const res = await fetch(`${API}/playlists`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user_id:uid,name:newName})});
    const d = await res.json();
    setPlaylists([...playlists, d.playlist]);
    setNewName('');
    setCreating(false);
  };

  const addTrack = async (pl) => {
    await fetch(`${API}/playlists`, {method:'PUT',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({user_id:uid,playlist_id:pl.PlaylistID,track:{id:track.id,name:track.name,artist:track.artists?.[0]?.name,image:track.album?.images?.[0]?.url}})
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-dark-900 border border-dark-700 p-8 max-w-sm w-full" onClick={e=>e.stopPropagation()}>
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-xl font-bold text-white">Add to Playlist</h2>
          <button onClick={onClose} className="text-dark-400 hover:text-white"><X size={20}/></button>
        </div>
        <div className="flex gap-2 mb-4">
          <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="New playlist name..."
            className="flex-1 bg-transparent text-white placeholder-dark-500 px-3 py-2 border border-dark-700 focus:outline-none focus:border-white text-sm transition-colors"/>
          <button onClick={createPlaylist} disabled={creating} className="bg-white text-black font-bold px-4 py-2 hover:bg-gray-200 transition-colors"><Plus size={16}/></button>
        </div>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {playlists.map(pl => (
            <button key={pl.PlaylistID} onClick={()=>addTrack(pl)}
              className="w-full text-left bg-transparent hover:bg-dark-800 text-white p-3 border border-dark-700 flex items-center gap-3 transition-colors">
              <Music size={16} className="text-white shrink-0"/><span className="truncate text-sm">{pl.Name}</span>
            </button>
          ))}
          {!playlists.length && <p className="text-dark-500 text-sm text-center py-4">No playlists yet. Create one above!</p>}
        </div>
      </div>
    </div>
  );
}

export function ReviewsPanel({ trackId, padding = "pl-16" }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch(`${API}/reviews/item/${trackId}`).then(r=>r.json()).then(d=>{setReviews(d.reviews||[]);setLoading(false);}).catch(()=>setLoading(false));
  }, [trackId]);
  if (loading) return <div className={`py-3 ${padding}`}><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"/></div>;
  if (!reviews.length) return <p className={`text-dark-500 text-xs py-2 ${padding}`}>No reviews yet. Be the first!</p>;
  return (
    <div className={`${padding} pr-4 pb-3 space-y-3`}>
      {reviews.slice(0,5).map((r,i) => (
        <div key={i} className="bg-transparent border border-dark-700 p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white text-xs font-bold">{r.UserName||'Anonymous'}</span>
            <Stars rating={Number(r.Rating)||0} size={12}/>
          </div>
          {r.ReviewText && <p className="text-dark-400 text-xs leading-relaxed">{r.ReviewText}</p>}
        </div>
      ))}
    </div>
  );
}

export function TrackRow({ track, onReview, onPlaylist }) {
  const [showReviews, setShowReviews] = useState(false);
  const img = track.album?.images?.[2]?.url || track.album?.images?.[0]?.url;
  const spotifyUrl = `https://open.spotify.com/track/${track.id}`;
  return (
    <div>
      <div className="flex items-center gap-4 p-3 border border-transparent hover:border-dark-700 transition-colors group">
        <img src={img} className="w-12 h-12 shrink-0 object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all border border-dark-700" alt=""/>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold truncate text-sm">{track.name}</p>
          <p className="text-dark-400 font-mono text-xs truncate">{track.artists?.map(a=>a.name).join(', ')}</p>
        </div>
        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <a href={spotifyUrl} target="_blank" rel="noopener noreferrer" className="text-dark-400 hover:text-white p-1.5 border border-transparent hover:border-dark-600 transition-colors" title="Open in Spotify"><ExternalLink size={16}/></a>
          <button onClick={()=>setShowReviews(!showReviews)} className="text-dark-400 hover:text-white p-1.5 border border-transparent hover:border-dark-600 transition-colors" title="Reviews"><MessageCircle size={16}/></button>
          <button onClick={()=>onPlaylist(track)} className="text-dark-400 hover:text-white p-1.5 border border-transparent hover:border-dark-600 transition-colors" title="Add to playlist"><PlusCircle size={16}/></button>
          <button onClick={()=>onReview(track)} className="text-dark-400 hover:text-white p-1.5 border border-transparent hover:border-dark-600 transition-colors" title="Write review"><Star size={16}/></button>
        </div>
      </div>
      {showReviews && <ReviewsPanel trackId={track.id}/>}
    </div>
  );
}

export function Spinner() {
  return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"/></div>;
}

export { API };
