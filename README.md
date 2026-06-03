# Tastelytics

A serverless music discovery and review platform powered by AWS and Spotify. Tastelytics provides personalized track recommendations, artist discographies, album details, and a community review system.

## 🚀 Architecture
- **Frontend:** React 19, Vite, TailwindCSS
- **Backend:** AWS Lambda, Amazon API Gateway
- **Database:** Amazon DynamoDB (Reviews and Playlists tables)
- **Infrastructure:** AWS CDK (Python)
- **External API:** Spotify Web API

## 🛠️ Setup & Deployment

### 1. Prerequisites
- AWS CLI configured
- Node.js (for CDK and Frontend)
- Python 3.9+
- Spotify Developer Account (for API keys)

### 2. Environment Variables
Create a `.env` file in the project root containing your Spotify credentials:
```env
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
```

### 3. Deploy Backend (AWS)
Run the deployment script from the project root to provision the AWS infrastructure using CDK:
```bash
./deploy.sh
```
This will output your new API Gateway URL in `infra/cdk-outputs.json`.

### 4. Run Frontend Locally
Open a new terminal and navigate to the frontend directory:
```bash
cd frontend
npm install
npm run dev
```
Navigate to `http://localhost:5173` in your browser.

---

## 💻 Terminal CLI Option

We've provided a simple command-line interface so you can search for artists and tracks directly from your terminal!

### Usage
Run the script from the project root:
```bash
python3 cli.py search "Taylor Swift"
python3 cli.py feed "pop,rock"
```

*Note: Ensure your backend is deployed, as the CLI will ping your API Gateway URL.*
