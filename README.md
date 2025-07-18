![melodica github](https://github.com/user-attachments/assets/d5d437d8-f499-4835-8dee-abcc8b2f3596)

**Melodica** is an interactive rhythm game inspired by Guitar Hero, where players hit falling notes in sync with music tracks. Built with a modern full-stack setup, the game allows users to play, create, and share custom beat maps using their own music.

---

<img width="1920" height="1080" alt="featured" src="https://github.com/user-attachments/assets/ca149bd5-823a-44eb-b98e-af3722a8a57c" />

## Gameplay Overview
Players press the D, F, J, K, and L keys to match falling notes in hitzones across 5 different lanes.
- Real-time visual feedback on note hits/misses
- Score tracking and high-score leaderboards
- Support for user-curated tracks

## Features
- Custom Track Editor: Upload your own .mp3 music file, drag notes on different lanes in the editor, and publish tracks.
- Session Overview: View your songs and scores.
- Global & Friends Leaderboards: Compete with yourself or others.
- Responsive UI/UX: Desktop-first layout with animated transitions.

## Tech Stack
Frontend 
- React (Vite)
- WaveSurfer.js for audio playback & waveform visualization  
- Redux Toolkit for state management  

Backend
- Flask (Python)  
- SQLAlchemy (ORM)  
- PostgreSQL  
- RESTful API design

---

## Frontend Setup
First, start the frontend development by doing the following:

```bash
cd react-vite
npm install
npm run dev
```

## Backend Setup
Then ``cd ..`` back into the root and install the requirements:

```bash
pip install -r requirements.txt
pipenv shell
flask run
```
