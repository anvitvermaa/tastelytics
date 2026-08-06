import json
import boto3
import os
import time
import requests
import uuid
import base64
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from decimal import Decimal
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource('dynamodb')
TABLE_NAME = os.environ.get("DYNAMODB_TABLE", "TastelyticsReviews")
PLAYLISTS_TABLE_NAME = os.environ.get("PLAYLISTS_TABLE", "TastelyticsPlaylists")
USERS_TABLE_NAME = os.environ.get("USERS_TABLE", "TastelyticsUsersTable")
SPOTIFY_CLIENT_ID = os.environ.get("SPOTIFY_CLIENT_ID")
SPOTIFY_CLIENT_SECRET = os.environ.get("SPOTIFY_CLIENT_SECRET")
GMAIL_EMAIL = os.environ.get("GMAIL_EMAIL")
GMAIL_APP_PASSWORD = os.environ.get("GMAIL_APP_PASSWORD")

# Cache token across invocations
_spotify_token_cache = {"token": None, "expires_at": 0}

def send_welcome_email(user_email, user_name):
    if not GMAIL_EMAIL or not GMAIL_APP_PASSWORD:
        print("Missing GMAIL credentials, skipping welcome email.")
        return
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Welcome to Tastelytics!"
        msg["From"] = f"Tastelytics <{GMAIL_EMAIL}>"
        msg["To"] = user_email

        html = f"""
        <html>
          <body style="font-family: sans-serif; background-color: #f4f4f4; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-top: 5px solid #ff0055;">
              <h1 style="color: #333333;">Welcome to Tastelytics, {user_name}! 🎵</h1>
              <p style="color: #666666; font-size: 16px; line-height: 1.5;">
                We are thrilled to have you onboard. Tastelytics uses your Spotify listening history to generate beautiful insights and personalized recommendations.
              </p>
              <p style="color: #666666; font-size: 16px; line-height: 1.5;">
                Start exploring your top tracks, discover new artists, and build your perfect library!
              </p>
              <p style="color: #666666; font-size: 16px; line-height: 1.5; margin-top: 30px;">
                Cheers,<br/>
                <strong>The Tastelytics Team</strong>
              </p>
            </div>
          </body>
        </html>
        """
        part2 = MIMEText(html, "html")
        msg.attach(part2)

        server = smtplib.SMTP_SSL("smtp.gmail.com", 465)
        server.login(GMAIL_EMAIL, GMAIL_APP_PASSWORD)
        server.sendmail(GMAIL_EMAIL, user_email, msg.as_string())
        server.quit()
        print(f"Sent welcome email to {user_email}")
    except Exception as e:
        print(f"Failed to send welcome email: {e}")


def get_spotify_token():
    global _spotify_token_cache
    if _spotify_token_cache["token"] and time.time() < _spotify_token_cache["expires_at"]:
        return _spotify_token_cache["token"]
    if not SPOTIFY_CLIENT_ID or not SPOTIFY_CLIENT_SECRET:
        raise Exception("Missing Spotify Credentials")
    auth_str = f"{SPOTIFY_CLIENT_ID}:{SPOTIFY_CLIENT_SECRET}"
    b64_auth_str = base64.b64encode(auth_str.encode()).decode()
    headers = {"Authorization": f"Basic {b64_auth_str}", "Content-Type": "application/x-www-form-urlencoded"}
    data = {"grant_type": "client_credentials"}
    response = requests.post("https://accounts.spotify.com/api/token", headers=headers, data=data)
    response.raise_for_status()
    resp = response.json()
    _spotify_token_cache["token"] = resp["access_token"]
    _spotify_token_cache["expires_at"] = time.time() + resp.get("expires_in", 3600) - 60
    return resp["access_token"]

def spotify_get(endpoint, params=None):
    token = get_spotify_token()
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"https://api.spotify.com/v1{endpoint}", headers=headers, params=params)
    response.raise_for_status()
    return response.json()

def cors_response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type,Authorization"
        },
        "body": json.dumps(body, default=str)
    }

def get_spotify_artists_by_genre(genres):
    try:
        genre_list = [g.strip().lower() for g in genres.split(',') if g.strip()]
        all_artists = []
        seen_ids = set()
        for genre in genre_list:
            data = spotify_get("/search", {"q": genre, "type": "artist", "limit": 10})
            for artist in data.get("artists", {}).get("items", []):
                if artist["id"] not in seen_ids:
                    seen_ids.add(artist["id"])
                    all_artists.append(artist)
        all_artists.sort(key=lambda a: a.get("popularity", 0), reverse=True)
        return {"artists": {"items": all_artists[:20]}}
    except Exception as e:
        print(f"Spotify Artist Search Error: {e}")
        return {"artists": {"items": []}}

def get_user_recommendation_seeds(table, playlists_table, user_id):
    """Build recommendation seeds from user's reviews and playlists."""
    seed_tracks = []
    seed_artists = []

    # Get top-rated reviews
    try:
        response = table.query(
            IndexName="UserReviewsIndex",
            KeyConditionExpression=Key('UserID').eq(user_id),
            ScanIndexForward=False,
            Limit=20
        )
        reviews = sorted(response.get('Items', []), key=lambda r: float(r.get('Rating', 0)), reverse=True)
        for review in reviews[:3]:
            if review.get('TrackID'):
                seed_tracks.append(review['TrackID'])
    except Exception as e:
        print(f"Error fetching reviews for seeds: {e}")

    # Get tracks from playlists
    try:
        response = playlists_table.query(
            KeyConditionExpression=Key('UserID').eq(user_id)
        )
        for playlist in response.get('Items', []):
            for track in (playlist.get('Tracks') or []):
                if track.get('id') and len(seed_tracks) < 4:
                    seed_tracks.append(track['id'])
    except Exception as e:
        print(f"Error fetching playlists for seeds: {e}")

    # Deduplicate and limit to 5 total seeds
    seen = set()
    unique_tracks = []
    for t in seed_tracks:
        if t not in seen:
            seen.add(t)
            unique_tracks.append(t)
    seed_tracks = unique_tracks[:5]

    return seed_tracks, seed_artists


def handler(event, context):
    http_method = event.get('httpMethod', 'GET')
    path = event.get('path', '')
    query_params = event.get('queryStringParameters') or {}

    # Handle CORS preflight
    if http_method == 'OPTIONS':
        return cors_response(200, {})

    table = dynamodb.Table(TABLE_NAME)
    playlists_table = dynamodb.Table(PLAYLISTS_TABLE_NAME)

    try:
        # ─── REVIEWS ───
        if http_method == 'POST' and path == '/reviews':
            body = json.loads(event.get('body', '{}'))
            track_id = body.get('track_id')
            rating = body.get('rating')
            review_text = body.get('review_text', '')
            user_id = body.get('user_id', 'anonymous')
            user_name = body.get('user_name', 'Anonymous')

            if not track_id or not rating:
                return cors_response(400, {"error": "Missing track_id or rating"})

            timestamp = str(int(time.time()))
            item = {
                'TrackID': track_id,
                'UserID_Timestamp': f"{user_id}#{timestamp}",
                'UserID': user_id,
                'UserName': user_name,
                'Timestamp': timestamp,
                'Rating': Decimal(str(rating)),
                'ReviewText': review_text,
                'EntityType': body.get('entity_type', 'track'),
                'TrackName': body.get('track_name', ''),
                'ArtistName': body.get('artist_name', ''),
                'AlbumArt': body.get('album_art', '')
            }
            table.put_item(Item=item)
            return cors_response(201, {"message": "Review submitted", "review": item})

        elif http_method == 'GET' and ('/reviews/track/' in path or '/reviews/item/' in path):
            item_id = path.split('/')[-1]
            response = table.query(
                KeyConditionExpression=Key('TrackID').eq(item_id)
            )
            return cors_response(200, {"reviews": response.get('Items', [])})

        elif http_method == 'GET' and '/reviews/user/' in path:
            user_id = path.split('/reviews/user/')[-1]
            response = table.query(
                IndexName="UserReviewsIndex",
                KeyConditionExpression=Key('UserID').eq(user_id),
                ScanIndexForward=False
            )
            return cors_response(200, {"reviews": response.get('Items', [])})

        # ─── SEARCH ───
        elif http_method == 'GET' and path == '/search':
            q = query_params.get('q', '')
            search_type = query_params.get('type', 'artist,track,album')
            limit = int(query_params.get('limit', '10'))
            if limit > 10: limit = 10
            if not q:
                return cors_response(400, {"error": "Missing query"})

            result = {}
            types = [t.strip() for t in search_type.split(',')]
            for t in types:
                try:
                    r = spotify_get("/search", {"q": q, "type": t, "limit": limit, "market": "US"})
                    key = t + "s"  # artist -> artists, track -> tracks, album -> albums
                    if key in r:
                        result[key] = r[key]
                except Exception as e:
                    print(f"Search error for type {t}: {e}")

            return cors_response(200, result)

        # ─── RECOMMENDATIONS ───
        elif http_method == 'GET' and path == '/recommendations':
            user_id = query_params.get('user_id', '')
            genres = query_params.get('genres', '')
            limit = int(query_params.get('limit', '20'))

            params = {"limit": limit, "market": "US"}

            if user_id:
                seed_tracks, seed_artists = get_user_recommendation_seeds(table, playlists_table, user_id)
                if seed_tracks:
                    params["seed_tracks"] = ",".join(seed_tracks[:5])
                elif seed_artists:
                    params["seed_artists"] = ",".join(seed_artists[:5])
                elif genres:
                    params["seed_genres"] = ",".join([g.strip().lower() for g in genres.split(',')][:5])
                else:
                    params["seed_genres"] = "pop,hip-hop,electronic"
            elif genres:
                params["seed_genres"] = ",".join([g.strip().lower() for g in genres.split(',')][:5])
            else:
                params["seed_genres"] = "pop,hip-hop,electronic"

            try:
                data = spotify_get("/recommendations", params)
                return cors_response(200, {"tracks": data.get("tracks", []), "seeds": data.get("seeds", [])})
            except Exception as e:
                print(f"Recommendations error: {e}")
                # Fallback: use search-based recommendations
                fallback_genre = genres.split(',')[0] if genres else 'pop'
                data = spotify_get("/search", {"q": fallback_genre, "type": "track", "limit": limit, "market": "US"})
                return cors_response(200, {"tracks": data.get("tracks", {}).get("items", []), "seeds": [], "fallback": True})

        # ─── ARTIST DETAILS ───
        elif http_method == 'GET' and '/artist/' in path and '/top-tracks' in path:
            artist_id = path.split('/artist/')[-1].split('/top-tracks')[0]
            try:
                data = spotify_get(f"/artists/{artist_id}/top-tracks", {"market": "US"})
            except:
                data = {"tracks": []}
            return cors_response(200, data)

        elif http_method == 'GET' and '/artist/' in path and '/albums' in path:
            artist_id = path.split('/artist/')[-1].split('/albums')[0]
            try:
                data = spotify_get(f"/artists/{artist_id}/albums", {"limit": 20, "include_groups": "album,single", "market": "US"})
            except:
                data = {"items": []}
            return cors_response(200, data)

        elif http_method == 'GET' and '/artist/' in path and '/related' in path:
            artist_id = path.split('/artist/')[-1].split('/related')[0]
            try:
                data = spotify_get(f"/artists/{artist_id}/related-artists")
                return cors_response(200, {"artists": data.get("artists", [])[:12]})
            except Exception as e:
                print(f"Related artists error: {e}")
                return cors_response(200, {"artists": []})

        elif http_method == 'GET' and '/artist/' in path:
            artist_id = path.split('/artist/')[-1]
            artist = spotify_get(f"/artists/{artist_id}")
            try:
                top_data = spotify_get(f"/artists/{artist_id}/top-tracks", {"market": "US"})
                tracks = top_data.get("tracks", [])
            except:
                tracks = []
            return cors_response(200, {"artist": artist, "top_tracks": tracks})

        # ─── ALBUM DETAILS ───
        elif http_method == 'GET' and '/album/' in path:
            album_id = path.split('/album/')[-1]
            try:
                album = spotify_get(f"/albums/{album_id}", {"market": "US"})
                return cors_response(200, {"album": album})
            except Exception as e:
                print(f"Album error: {e}")
                return cors_response(404, {"error": "Album not found"})

        # ─── NEW RELEASES ───
        elif http_method == 'GET' and path == '/new-releases':
            limit = int(query_params.get('limit', '20'))
            try:
                data = spotify_get("/browse/new-releases", {"limit": limit, "country": "US"})
                return cors_response(200, {"albums": data.get("albums", {})})
            except Exception as e:
                print(f"New releases error: {e}")
                # Fallback: search for recent popular tracks
                data = spotify_get("/search", {"q": "tag:new", "type": "album", "limit": limit, "market": "US"})
                return cors_response(200, {"albums": data.get("albums", {}), "fallback": True})

        # ─── ONBOARDING ───
        elif http_method == 'GET' and path == '/onboarding/recommendations':
            genres = query_params.get('genres', '')
            if not genres:
                return cors_response(400, {"error": "Missing genres"})
            results = get_spotify_artists_by_genre(genres)
            return cors_response(200, results)

        # ─── PLAYLISTS ───
        elif http_method == 'GET' and path == '/playlists':
            user_id = query_params.get('user_id', '')
            if not user_id:
                return cors_response(400, {"error": "Missing user_id"})
            response = playlists_table.query(
                KeyConditionExpression=Key('UserID').eq(user_id)
            )
            return cors_response(200, {"playlists": response.get('Items', [])})

        elif http_method == 'POST' and path == '/playlists':
            body = json.loads(event.get('body', '{}'))
            user_id = body.get('user_id')
            playlist_name = body.get('name')
            if not user_id or not playlist_name:
                return cors_response(400, {"error": "Missing user_id or name"})
            playlist_id = str(uuid.uuid4())
            item = {
                'UserID': user_id,
                'PlaylistID': playlist_id,
                'Name': playlist_name,
                'CreatedAt': str(int(time.time())),
                'Tracks': []
            }
            playlists_table.put_item(Item=item)
            return cors_response(201, {"message": "Playlist created", "playlist": item})

        elif http_method == 'PUT' and path == '/playlists':
            body = json.loads(event.get('body', '{}'))
            user_id = body.get('user_id')
            playlist_id = body.get('playlist_id')
            track = body.get('track')
            if not user_id or not playlist_id or not track:
                return cors_response(400, {"error": "Missing fields"})
            playlists_table.update_item(
                Key={'UserID': user_id, 'PlaylistID': playlist_id},
                UpdateExpression='SET Tracks = list_append(if_not_exists(Tracks, :empty), :track)',
                ExpressionAttributeValues={':track': [track], ':empty': []}
            )
            return cors_response(200, {"message": "Track added"})

        elif http_method == 'DELETE' and path == '/playlists':
            body = json.loads(event.get('body', '{}'))
            user_id = body.get('user_id')
            playlist_id = body.get('playlist_id')
            if not user_id or not playlist_id:
                return cors_response(400, {"error": "Missing user_id or playlist_id"})
            playlists_table.delete_item(
                Key={'UserID': user_id, 'PlaylistID': playlist_id}
            )
            return cors_response(200, {"message": "Playlist deleted"})

        # ─── PROFILE ───
        elif http_method == 'GET' and path == '/profile':
            user_id = query_params.get('user_id', '')
            if not user_id:
                return cors_response(400, {"error": "Missing user_id"})
            users_table = dynamodb.Table(USERS_TABLE_NAME)
            response = users_table.get_item(Key={"UserID": user_id})
            if 'Item' in response and response['Item'].get('ProfileData'):
                return cors_response(200, {"profile": response['Item']['ProfileData']})
            return cors_response(404, {"error": "Profile not found"})

        elif http_method == 'POST' and path == '/profile':
            body = json.loads(event.get('body', '{}'))
            user_id = body.get('user_id')
            profile_data = body.get('profile_data')
            if not user_id or not profile_data:
                return cors_response(400, {"error": "Missing user_id or profile_data"})
            users_table = dynamodb.Table(USERS_TABLE_NAME)
            users_table.update_item(
                Key={'UserID': user_id},
                UpdateExpression='SET ProfileData = :pd, UpdatedAt = :ua',
                ExpressionAttributeValues={
                    ':pd': profile_data,
                    ':ua': str(int(time.time()))
                }
            )
            return cors_response(200, {"message": "Profile updated"})

        # ─── USERS ───
        elif http_method == 'GET' and path == '/users/count':
            users_table = dynamodb.Table(USERS_TABLE_NAME)
            try:
                # Scan to count total users
                response = users_table.scan(Select='COUNT')
                count = response.get('Count', 0)
                return cors_response(200, {"count": count})
            except Exception as e:
                return cors_response(500, {"error": str(e)})

        # ─── SPOTIFY OAUTH & TASTE ANALYSIS ───
        elif http_method == 'POST' and path == '/auth/spotify':
            body = json.loads(event.get('body', '{}'))
            code = body.get('code')
            redirect_uri = body.get('redirect_uri')
            if not code or not redirect_uri:
                return cors_response(400, {"error": "Missing code or redirect_uri"})
            
            auth_str = f"{SPOTIFY_CLIENT_ID}:{SPOTIFY_CLIENT_SECRET}"
            b64_auth_str = base64.b64encode(auth_str.encode()).decode()
            headers = {"Authorization": f"Basic {b64_auth_str}", "Content-Type": "application/x-www-form-urlencoded"}
            data = {"grant_type": "authorization_code", "code": code, "redirect_uri": redirect_uri}
            response = requests.post("https://accounts.spotify.com/api/token", headers=headers, data=data)
            if response.status_code != 200:
                print("Spotify Auth Error:", response.text)
                return cors_response(response.status_code, {"error": "Failed to exchange token"})
                
            resp_data = response.json()
            access_token = resp_data.get("access_token")
            
            if access_token:
                try:
                    # Fetch user profile to get email
                    headers_api = {"Authorization": f"Bearer {access_token}"}
                    profile_resp = requests.get("https://api.spotify.com/v1/me", headers=headers_api)
                    if profile_resp.status_code == 200:
                        profile = profile_resp.json()
                        spotify_id = profile.get("id")
                        email = profile.get("email")
                        display_name = profile.get("display_name") or "Music Lover"
                        
                        if spotify_id and email:
                            users_table = dynamodb.Table(USERS_TABLE_NAME)
                            user_record = users_table.get_item(Key={"UserID": spotify_id}).get("Item")
                            if not user_record:
                                # New user, send email
                                send_welcome_email(email, display_name)
                                users_table.put_item(Item={
                                    "UserID": spotify_id,
                                    "Email": email,
                                    "DisplayName": display_name,
                                    "JoinedAt": str(int(time.time()))
                                })
                except Exception as e:
                    print(f"Error processing new user: {e}")

            return cors_response(200, resp_data)

        elif http_method == 'GET' and path == '/spotify/analysis':
            token = query_params.get('token')
            time_range = query_params.get('time_range', 'medium_term')
            if not token:
                return cors_response(400, {"error": "Missing Spotify token"})
            headers = {"Authorization": f"Bearer {token}"}
            
            # Fetch Top Artists
            artists_resp = requests.get(f"https://api.spotify.com/v1/me/top/artists?time_range={time_range}&limit=20", headers=headers)
            if artists_resp.status_code != 200:
                print("ARTIST FETCH ERROR:", artists_resp.text)
                return cors_response(artists_resp.status_code, {"error": "Failed to fetch artists"})
            top_artists = artists_resp.json().get("items", [])
            print(f"FETCHED {len(top_artists)} ARTISTS FOR TIME RANGE {time_range}")
            
            # Fetch Top Tracks
            tracks_resp = requests.get(f"https://api.spotify.com/v1/me/top/tracks?time_range={time_range}&limit=20", headers=headers)
            top_tracks = tracks_resp.json().get("items", []) if tracks_resp.status_code == 200 else []
            
            # Aggregate Genres
            genre_counts = {}
            for artist in top_artists:
                for genre in artist.get("genres", []):
                    genre_counts[genre] = genre_counts.get(genre, 0) + 1
            
            # Fallback: if no genres found, try to extract them from the artists of top_tracks
            if not genre_counts and top_tracks:
                track_artist_ids = set()
                for track in top_tracks:
                    for a in track.get("artists", []):
                        if a.get("id"):
                            track_artist_ids.add(a.get("id"))
                
                track_artist_ids = list(track_artist_ids)[:50] # Spotify API limit is 50 for /artists
                if track_artist_ids:
                    artists_url = f"https://api.spotify.com/v1/artists?ids={','.join(track_artist_ids)}"
                    artists_info_resp = requests.get(artists_url, headers=headers)
                    if artists_info_resp.status_code == 200:
                        for artist in artists_info_resp.json().get("artists", []):
                            for genre in artist.get("genres", []):
                                genre_counts[genre] = genre_counts.get(genre, 0) + 1

            sorted_genres = sorted(genre_counts.items(), key=lambda x: x[1], reverse=True)
            top_genres = [g[0] for g in sorted_genres[:10]]
            print(f"CALCULATED {len(top_genres)} GENRES:", top_genres)
            
            return cors_response(200, {
                "top_artists": top_artists,
                "top_tracks": top_tracks,
                "top_genres": top_genres
            })

        # ─── HOME FEED ───
        elif http_method == 'GET' and path == '/feed':
            genres = query_params.get('genres', 'pop')
            results = get_spotify_artists_by_genre(genres)
            return cors_response(200, results)

        return cors_response(404, {"error": "Route not found"})

    except Exception as e:
        print(f"Handler error: {e}")
        import traceback
        traceback.print_exc()
        return cors_response(500, {"error": str(e)})
