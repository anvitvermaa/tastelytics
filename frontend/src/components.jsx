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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-none flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white border-[4px] border-dark-700 shadow-retro p-6 max-w-md w-full transform rotate-1" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-6 border-b-[4px] border-dark-700 pb-2">
          <h2 className="text-3xl font-extrabold text-brand-500 uppercase tracking-tighter" style={{ textShadow: '2px 2px 0px #000' }}>Write a Review</h2>
          <button onClick={onClose} className="text-white hover:bg-brand-red bg-dark-700 border-[3px] border-dark-700 shadow-[2px_2px_0_0_#000] p-1 transition-colors"><X size={20} strokeWidth={3}/></button>
        </div>
        <div className="flex gap-4 mb-6 bg-yellow-200 p-3 border-[3px] border-dark-700 shadow-[inset_2px_2px_0_0_rgba(0,0,0,0.1)]">
          <img src={track.images?.[0]?.url || track.album?.images?.[0]?.url} className="w-16 h-16 object-cover border-[2px] border-dark-700" alt="" />
          <div className="min-w-0">
            <p className="text-xs text-dark-700 font-extrabold mb-0.5 uppercase tracking-widest">{track.entity_type || 'Track'}</p>
            <p className="text-black font-extrabold uppercase tracking-tight truncate text-lg leading-tight">{track.name}</p>
            {track.entity_type !== 'artist' && <p className="text-brand-500 font-bold text-xs uppercase tracking-widest">{track.artists?.map(a=>a.name).join(', ')}</p>}
          </div>
        </div>
        {done ? (
          <div className="text-center py-6 bg-yellow-200 border-[3px] border-dark-700 shadow-[inset_2px_2px_0_0_rgba(0,0,0,0.1)]"><p className="text-brand-500 text-xl font-extrabold uppercase tracking-widest">✓ Submitted!</p></div>
        ) : (<>
          <div className="mb-4 bg-white p-3 border-[3px] border-dark-700 flex items-center gap-4"><p className="text-black font-extrabold uppercase tracking-widest text-sm">Rating:</p><Stars rating={rating} onRate={setRating} size={28}/></div>
          <textarea value={text} onChange={e=>setText(e.target.value)} rows={3} placeholder="Share your thoughts..."
            className="w-full bg-white text-black placeholder-dark-500 p-3 border-[3px] border-dark-700 shadow-[inset_4px_4px_0_0_rgba(0,0,0,0.1)] focus:outline-none focus:bg-yellow-200 mb-4 resize-none font-extrabold uppercase tracking-widest text-sm"/>
          <button onClick={submit} disabled={!rating || submitting}
            className="w-full bg-brand-500 disabled:bg-dark-500 disabled:shadow-none text-white font-extrabold uppercase tracking-widest py-3 border-[4px] border-dark-700 shadow-retro hover:shadow-retro-hover hover:bg-brand-600 transition-all">
            {submitting ? 'SUBMITTING...' : 'SUBMIT REVIEW'}
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-none flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white border-[4px] border-dark-700 shadow-retro p-6 max-w-sm w-full transform -rotate-1" onClick={e=>e.stopPropagation()}>
        <div className="flex justify-between items-start mb-6 border-b-[4px] border-dark-700 pb-2">
          <h2 className="text-3xl font-extrabold text-brand-500 uppercase tracking-tighter" style={{ textShadow: '2px 2px 0px #000' }}>Add to Playlist</h2>
          <button onClick={onClose} className="text-white hover:bg-brand-red bg-dark-700 border-[3px] border-dark-700 shadow-[2px_2px_0_0_#000] p-1 transition-colors"><X size={20} strokeWidth={3}/></button>
        </div>
        <div className="flex gap-2 mb-6">
          <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="New playlist..."
            className="flex-1 bg-white text-black placeholder-dark-500 px-3 py-2 border-[3px] border-dark-700 shadow-[inset_2px_2px_0_0_rgba(0,0,0,0.1)] focus:outline-none focus:bg-yellow-200 font-extrabold uppercase tracking-widest text-sm"/>
          <button onClick={createPlaylist} disabled={creating} className="bg-brand-500 text-white font-extrabold px-3 py-2 border-[3px] border-dark-700 shadow-retro-sm hover:shadow-retro-sm-hover hover:bg-brand-600 transition-all"><Plus size={20} strokeWidth={3}/></button>
        </div>
        <div className="space-y-3 max-h-60 overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin' }}>
          {playlists.map(pl => (
            <button key={pl.PlaylistID} onClick={()=>addTrack(pl)}
              className="w-full text-left bg-white hover:bg-yellow-200 text-black p-3 border-[3px] border-dark-700 shadow-[2px_2px_0_0_#000] flex items-center gap-3 transition-colors">
              <Music size={20} strokeWidth={3} className="text-brand-500 shrink-0"/><span className="truncate font-extrabold uppercase tracking-widest text-sm">{pl.Name}</span>
            </button>
          ))}
          {!playlists.length && <p className="text-dark-500 font-bold uppercase tracking-widest text-sm text-center py-4 border-2 border-dashed border-dark-400">No playlists yet.</p>}
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
  if (loading) return <div className={`py-3 ${padding}`}><div className="w-5 h-5 border-4 border-black border-t-brand-500 rounded-full animate-spin"/></div>;
  if (!reviews.length) return <p className={`text-dark-500 font-extrabold uppercase tracking-widest text-xs py-2 ${padding}`}>No reviews yet. Be the first!</p>;
  return (
    <div className={`${padding} pr-4 pb-3 space-y-4`}>
      {reviews.slice(0,5).map((r,i) => (
        <div key={i} className="bg-yellow-100 border-[3px] border-dark-700 shadow-retro-sm p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-brand-500 text-xs font-extrabold uppercase tracking-widest bg-white border-2 border-dark-700 px-1">{r.UserName||'Anonymous'}</span>
            <Stars rating={Number(r.Rating)||0} size={14}/>
          </div>
          {r.ReviewText && <p className="text-black font-bold text-sm leading-relaxed font-mono">{r.ReviewText}</p>}
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
      <div className="flex items-center gap-4 p-3 border-b-2 border-dark-700/20 hover:bg-yellow-100 transition-colors group">
        <img src={img} className="w-12 h-12 shrink-0 object-cover border-[3px] border-dark-700 shadow-retro-sm" alt=""/>
        <div className="flex-1 min-w-0">
          <p className="text-black font-extrabold uppercase tracking-widest truncate text-sm">{track.name}</p>
          <p className="text-dark-600 font-bold uppercase tracking-widest text-xs truncate">{track.artists?.map(a=>a.name).join(', ')}</p>
        </div>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <a href={spotifyUrl} target="_blank" rel="noopener noreferrer" className="text-black bg-white hover:bg-yellow-200 p-1.5 border-[2px] border-dark-700 shadow-[2px_2px_0_0_#000]" title="Open in Spotify"><ExternalLink size={16} strokeWidth={3}/></a>
          <button onClick={()=>setShowReviews(!showReviews)} className="text-black bg-white hover:bg-yellow-200 p-1.5 border-[2px] border-dark-700 shadow-[2px_2px_0_0_#000]" title="Reviews"><MessageCircle size={16} strokeWidth={3}/></button>
          <button onClick={()=>onPlaylist(track)} className="text-black bg-white hover:bg-yellow-200 p-1.5 border-[2px] border-dark-700 shadow-[2px_2px_0_0_#000]" title="Add to playlist"><PlusCircle size={16} strokeWidth={3}/></button>
          <button onClick={()=>onReview(track)} className="text-white bg-brand-500 hover:bg-brand-600 p-1.5 border-[2px] border-dark-700 shadow-[2px_2px_0_0_#000]" title="Write review"><Star size={16} strokeWidth={3}/></button>
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
