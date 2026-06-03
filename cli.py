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

    else:
        print("Unknown command.")
        print_help()
