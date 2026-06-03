import sys
import json
import urllib.request
import urllib.parse

# Replace this with your actual API Gateway URL once deployed
API_URL = "https://ny8zhk2zga.execute-api.us-east-1.amazonaws.com/prod"

def print_help():
    print("Tastelytics CLI")
    print("Usage:")
    print("  python3 cli.py search <query>")
    print("  python3 cli.py feed <genres>")
    print("  python3 cli.py new-releases")
    sys.exit(1)

def fetch_data(endpoint):
    url = f"{API_URL}{endpoint}"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode())
    except Exception as e:
        print(f"Error fetching data: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print_help()

    command = sys.argv[1]

    if command == "search":
        if len(sys.argv) < 3:
            print("Please provide a search query.")
            sys.exit(1)
        query = urllib.parse.quote(" ".join(sys.argv[2:]))
        print(f"Searching for: {' '.join(sys.argv[2:])}...\n")
        data = fetch_data(f"/search?q={query}&type=artist,track,album&limit=5")
        
        if "artists" in data and data["artists"]["items"]:
            print("--- Top Artists ---")
            for a in data["artists"]["items"]:
                print(f"🎤 {a['name']}")
            print()
            
        if "tracks" in data and data["tracks"]["items"]:
            print("--- Top Tracks ---")
            for t in data["tracks"]["items"]:
                artists = ", ".join([art["name"] for art in t.get("artists", [])])
                print(f"🎵 {t['name']} by {artists}")
            print()

        if "albums" in data and data["albums"]["items"]:
            print("--- Top Albums ---")
            for a in data["albums"]["items"]:
                artists = ", ".join([art["name"] for art in a.get("artists", [])])
                print(f"💿 {a['name']} by {artists}")

    elif command == "feed":
        genres = "pop"
        if len(sys.argv) >= 3:
            genres = urllib.parse.quote(",".join(sys.argv[2:]))
        print(f"Fetching feed for genres: {urllib.parse.unquote(genres)}...\n")
        data = fetch_data(f"/feed?genres={genres}")
        if "artists" in data and data["artists"]["items"]:
            for a in data["artists"]["items"]:
                print(f"⭐ {a['name']} - {', '.join(a.get('genres', [])[:2])}")
        else:
            print("No feed results.")

    elif command == "new-releases":
        print("Fetching new releases...\n")
        data = fetch_data("/new-releases?limit=10")
        if "albums" in data and "items" in data["albums"]:
            for a in data["albums"]["items"]:
                artists = ", ".join([art["name"] for art in a.get("artists", [])])
                print(f"🔥 {a['name']} by {artists}")
        else:
            print("No new releases found.")

    elif command == "review":
        print("What would you like to review?")
        print("1. Artist\n2. Album\n3. Track")
        choice = input("Enter 1, 2, or 3: ").strip()
        types = {"1": "artist", "2": "album", "3": "track"}
        entity_type = types.get(choice)
        if not entity_type:
            print("Invalid choice."); sys.exit(1)
            
        q = input(f"Enter the name of the {entity_type}: ").strip()
        if not q: sys.exit(1)
            
        print(f"\nSearching for {entity_type} '{q}'...")
        data = fetch_data(f"/search?q={urllib.parse.quote(q)}&type={entity_type}&limit=5")
        
        items = data.get(f"{entity_type}s", {}).get("items", [])
        if not items:
            print("No results found."); sys.exit(1)
            
        for i, item in enumerate(items):
            artists = ", ".join([a["name"] for a in item.get("artists", [])]) if entity_type != "artist" else ""
            desc = f"{item['name']} by {artists}" if artists else item['name']
            print(f"[{i+1}] {desc}")
            
        sel = input(f"\nSelect the {entity_type} (1-{len(items)}): ").strip()
        try:
            selected = items[int(sel) - 1]
        except:
            print("Invalid selection."); sys.exit(1)
            
        print(f"\nYou selected: {selected['name']}")
        rating = input("Enter your rating (1-5): ").strip()
        try:
            r = float(rating)
            if r < 1 or r > 5: raise ValueError()
        except:
            print("Rating must be a number between 1 and 5."); sys.exit(1)
            
        review_text = input("Enter your review: ").strip()
        user_name = input("Enter your name (optional): ").strip() or "Anonymous"
        
        payload = {
            "track_id": selected["id"],
            "user_id": f"cli_user_{urllib.parse.quote(user_name.lower())}",
            "user_name": user_name,
            "rating": r,
            "review_text": review_text,
            "entity_type": entity_type,
            "track_name": selected["name"],
            "artist_name": ", ".join([a["name"] for a in selected.get("artists", [])]) if entity_type != "artist" else selected["name"],
            "album_art": selected.get("images", [{"url":""}])[0]["url"] if "images" in selected and selected["images"] else (selected.get("album", {}).get("images", [{"url":""}])[0]["url"] if "album" in selected and selected["album"].get("images") else "")
        }
        
        try:
            req = urllib.request.Request(f"{API_URL}/reviews", data=json.dumps(payload).encode(), headers={'Content-Type': 'application/json'})
            with urllib.request.urlopen(req) as response:
                print("\n✅ Review submitted successfully!")
        except Exception as e:
            print(f"Error submitting review: {e}")

    else:
        print("Unknown command.")
        print_help()
