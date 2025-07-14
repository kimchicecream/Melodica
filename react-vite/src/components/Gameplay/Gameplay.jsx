import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { fetchTrackById } from '../../redux/tracks';
import { thunkAuthenticate } from '../../redux/session';
import './Gameplay.css';
import { createScore } from '../../redux/scores';
import ParticleBackground from './ParticleBackground';
import HitEffect from './HitEffect';

function Gameplay() {
    const { trackId } = useParams();

    const dispatch = useDispatch();
    const navigate = useNavigate();
    const track = useSelector(state => state.tracks.allTracks[trackId]);
    const sessionUser = useSelector((state) => state.session.user);

    const [totalNotes, setTotalNotes] = useState(0);
    const [fallingNotes, setFallingNotes] = useState([]);
    const [activeZones, setActiveZones] = useState([false, false, false, false, false]);
    const [gameStarted, setGameStarted] = useState(false);
    const [gameEnded, setGameEnded] = useState(false);
    const [gameEnding, setGameEnding] = useState(false);
    const [hitNotes, setHitNotes] = useState(new Set());
    const [score, setScore] = useState(0);
    const [multiplier, setMultiplier] = useState(1);
    const [missedNotes, setMissedNotes] = useState(new Set());
    const [displayedScore, setDisplayedScore] = useState(0);
    const [currentStreak, setCurrentStreak] = useState(0);
    const [longestStreak, setLongestStreak] = useState(0);
    const [highestMultiplier, setHighestMultiplier] = useState(1);
    const [multiplierReset, setMultiplierReset] = useState(false);
    const [backgroundPulse, setBackgroundPulse] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [laneEffects, setLaneEffects] = useState(new Array(5).fill(false));

    const fallingNotesRef = useRef(fallingNotes);
    const hitNotesRef = useRef(hitNotes);
    const multiplierRef = useRef(multiplier);

    // const [hitParticleFlash, setHitParticleFlash] = useState(false);
    const [hue, setHue] = useState(0);

    const waveSurferRef = useRef(null);
    const startTimeRef = useRef(null);
    const lastNoteRef = useRef(false);
    const cursorTimer = useRef(null);
    const gameplayRef = useRef(null);
    const gameEndingRef = useRef(false);
    const scoreRef = useRef(0);

    const HIT_ZONE_POSITION = 90; // 90% from the top
    const HIT_ZONE_HEIGHT = 30; // height of the hit zone
    const NOTE_HEIGHT = 30; // height of a note
    const HIT_OFFSET = 25; // amount of note that must be above the hit zone to count as a hit

    const KEY_LABELS = ['D', 'F', 'J', 'K', 'L'];

    useEffect(() => {
        fallingNotesRef.current = fallingNotes;
      }, [fallingNotes]);

      useEffect(() => {
        hitNotesRef.current = hitNotes;
      }, [hitNotes]);

      useEffect(() => {
        multiplierRef.current = multiplier;
      }, [multiplier]);

    // Inside Gameplay component
    useEffect(() => {
        const onFullscreenChange = () => {
          if (!document.fullscreenElement) {
            // We are no longer in fullscreen
            setIsFullscreen(false);
          } else {
            // We have entered fullscreen
            setIsFullscreen(true);
          }
        };

        document.addEventListener("fullscreenchange", onFullscreenChange);

        return () => {
          document.removeEventListener("fullscreenchange", onFullscreenChange);
        };
      }, []);

      const handleToggleFullscreen = () => {
        // If there's no element in fullscreen, go fullscreen. Otherwise, exit fullscreen.
        if (!document.fullscreenElement) {
          // request fullscreen on the gameplay container
          if (gameplayRef.current.requestFullscreen) {
            gameplayRef.current.requestFullscreen();
          }
          // you could also do else if for webkitRequestFullscreen, etc. for older browsers if desired
        } else {
          // We are currently in fullscreen, so exit
          if (document.exitFullscreen) {
            document.exitFullscreen();
          }
        }
      };

    // keep page static
    useEffect(() => {
        document.body.style.overflow = "hidden";

        return () => {
          document.body.style.overflow = "auto";
        };
    }, []);

    // handle cursor visibility
    useEffect(() => {
        const handleMouseMove = () => {
            clearTimeout(cursorTimer.current);
            if (gameplayRef.current) {
                gameplayRef.current.classList.remove('hidden-cursor');
            }
            cursorTimer.current = setTimeout(() => {
                if (gameplayRef.current) {
                    gameplayRef.current.classList.add('hidden-cursor');
                }
            }, 300); // Hide cursor after 300ms of inactivity
        };

        document.addEventListener('mousemove', handleMouseMove);

        return () => {
            clearTimeout(cursorTimer.current);
            document.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);

    // get all track info
    useEffect(() => {
        if (trackId) {
            dispatch(fetchTrackById(trackId));
        }
    }, [dispatch, trackId]);

    useEffect(() => {
        if (!sessionUser) {
            dispatch(thunkAuthenticate());
        }
    }, [dispatch, sessionUser]);

    // the song
    useEffect(() => {
        if (track && track.song && track.song.song_url && !waveSurferRef.current) {
            waveSurferRef.current = WaveSurfer.create({
                container: document.createElement('div'), // dummy element
                height: 0,
                normalize: true,
            });

            waveSurferRef.current.load(track.song.song_url);

            // error handling for loading audio
            waveSurferRef.current.on('error', (e) => {
                console.error('WaveSurfer error:', e);
            });
        }

        return () => {
            if (waveSurferRef.current) {
                waveSurferRef.current.stop();
                waveSurferRef.current.destroy();
                waveSurferRef.current = null;
            }
        };
    }, [track]);

    // the notes & when they start falling
    useEffect(() => {
        if (gameStarted && track && track.notes) {
            const startTime = Date.now();
            startTimeRef.current = startTime + 1070;
            const notes = Object.values(track.notes).map(note => ({
                ...note,
                uniqueId: `${note.id}-${Date.now()}-${Math.random()}`,
                missed: false // Add missed property
            }));
            setFallingNotes(notes);
            setTotalNotes(notes.length);
            console.log("Falling notes initialized:", notes);

            // identify the last note
            const lastNote = notes.reduce((prev, current) => (prev.time > current.time) ? prev : current);
            lastNoteRef.current = lastNote;
            console.log("Last note identified:", lastNote);

            requestAnimationFrame(updateNotesPosition);
        }
    }, [gameStarted, track]);

    const updateNotesPosition = () => {
        if (gameEndingRef.current || gameEnded) return;

        const currentTime = Date.now();
        const elapsedTime = (currentTime - startTimeRef.current) / 1000; // in seconds

        setFallingNotes(prevNotes => {
            if (!Array.isArray(prevNotes)) {
                console.error("prevNotes is not an array:", prevNotes);
                return prevNotes; // return early if prevNotes is not an array
            }

            const updatedNotes = prevNotes.map(note => ({
                ...note,
                position: (elapsedTime - note.time) * 100
            }));

            const hitZoneBottom = HIT_ZONE_POSITION + HIT_ZONE_HEIGHT;

            updatedNotes.forEach(note => {
                if (note.position > hitZoneBottom && !hitNotes.has(note.uniqueId) && !note.missed) {
                    // console.log(`Note went off screen without being hit: ${note.uniqueId}`);
                    note.missed = true;

                    setMissedNotes(prevMissedNotes => {
                        const newMissedNotes = new Set(prevMissedNotes);
                        newMissedNotes.add(note.uniqueId);
                        return newMissedNotes;
                    });
                    setMultiplier(1); // reset multiplier on miss
                    setCurrentStreak(0); // reset current streak on miss
                    console.log(`Note missed: ${note.uniqueId}`);
                }
            });

            updatedNotes.forEach(note => {
                if (note.position > 100 && !hitNotes.has(note.uniqueId) && !note.missed) {
                    console.log(`Note went off screen without being hit: ${note.uniqueId}`);
                    note.missed = true;
                    setMissedNotes(prevMissedNotes => {
                        const newMissedNotes = new Set(prevMissedNotes);
                        newMissedNotes.add(note.uniqueId);
                        return newMissedNotes;
                    });
                    setMultiplier(1);
                    setCurrentStreak(0);
                }
            });

            const filteredNotes = updatedNotes.filter(note => note.position <= 100);

            if (!gameEndingRef.current && filteredNotes.length === 0) {
                console.log('Last note processed. Ending game.');
                endGame();
            }

            return filteredNotes;
        });

        if (gameStarted && !gameEnding) {
            requestAnimationFrame(updateNotesPosition);
        }
    };

    const animateScore = () => {
        let start = 0;
        const duration = 1000;
        const startTime = performance.now();

        const step = (currentTime) => {
            const progress = Math.min((currentTime - startTime) / duration, 1);
            const newDisplayedScore = Math.floor(progress * score);
            setDisplayedScore(newDisplayedScore);

            if (progress < 1) {
                requestAnimationFrame(step);
            }
        };

        requestAnimationFrame(step);
    };

    const endGame = () => {
        if (gameEndingRef.current || gameEnded) return;
        console.log('Triggering endGame');
        gameEndingRef.current = true;
        setGameEnding(true);

        const finalScore = scoreRef.current;
        const finalAccuracy = totalNotes > 0 ? (hitNotes.size / totalNotes) * 100 : 0;

        setTimeout(() => {
            if (waveSurferRef.current) {
                fadeOutAudio(waveSurferRef.current, 2000); // 2 seconds fade out
            }

            setTimeout(() => {
                setGameEnded(true);

                if (sessionUser) {
                    console.log('Dispatching createScore with:', {
                        track_id: trackId,
                        score: finalScore,
                        accuracy: finalAccuracy,
                        difficulty: track.difficulty || 'Unknown',
                    });
                    dispatch(createScore({
                        track_id: trackId,
                        score: finalScore,
                        accuracy: finalAccuracy,
                        difficulty: track.difficulty || 'Unknown',
                    }));
                }
            }, 2000); // show game over overlay after the fade-out
        }, 2000); // delay before starting the fade-out
    };

    useEffect(() => {
        if (gameEnded) {
            animateScore();
        }
    }, [gameEnded, score]);

    const handleStartGame = async () => {
        setGameStarted(true);
        startTimeRef.current = Date.now();
        setTimeout(() => {
            waveSurferRef.current.play();
        }, 2000); // 2 second buffer
    };

    const handleKeyPress = (laneIndex) => {
        // Use the ref values for the latest state
        const notes = fallingNotesRef.current;
        const currentHitNotes = hitNotesRef.current;
        const currentMultiplier = multiplierRef.current;

        console.log(`Key pressed: Lane ${laneIndex + 1}`);

        const hitZoneTop = HIT_ZONE_POSITION;
        const hitZoneBottom = HIT_ZONE_POSITION + HIT_ZONE_HEIGHT;
        const hitNote = notes.find(note =>
            note.lane === laneIndex + 1 &&
            note.position + NOTE_HEIGHT >= hitZoneTop + HIT_OFFSET &&
            note.position <= hitZoneBottom &&
            !currentHitNotes.has(note.uniqueId)
        );

        if (hitNote) {
          setHitNotes(prevHitNotes => {
            const newHitNotes = new Set(prevHitNotes);
            newHitNotes.add(hitNote.uniqueId);
            return newHitNotes;
          });

          setLaneEffects(prev => {
            const newEffects = [...prev];
            if (newEffects[laneIndex] === true) return prev;
            newEffects[laneIndex] = true;
            return newEffects;
          });

          setTimeout(() => {
            setLaneEffects(prev => {
              const newEffects = [...prev];
              newEffects[laneIndex] = false; // reset after animation
              return newEffects;
            });
          }, 600);

          // 1) Update scoreRef first
          scoreRef.current += 150 * currentMultiplier;
          // 2) Then update state so the UI reflects the change
          setScore(scoreRef.current);

          // Update multiplier
          setMultiplier(prevMultiplier => {
            const newMultiplier = prevMultiplier + 1;
            if (newMultiplier > highestMultiplier) {
              setHighestMultiplier(newMultiplier);
            }
            return newMultiplier;
          });

          // Update streak
          setCurrentStreak(prevStreak => {
            const newStreak = prevStreak + 1;
            if (newStreak > longestStreak) {
              setLongestStreak(newStreak);
            }
            return newStreak;
          });

          setBackgroundPulse(true);
          setTimeout(() => {
            setBackgroundPulse(false);
          }, 300);

          setHue((prevHue) => (prevHue + 30) % 360);

          console.log(`Hit note in lane ${laneIndex + 1}`);

          setFallingNotes(prevNotes => {
            const updatedNotes = prevNotes.filter(note => note.uniqueId !== hitNote.uniqueId);
            console.log('Updated falling notes after hit:', updatedNotes);
            return updatedNotes;
          });
        } else {
          console.log(`Lane key pressed at ${laneIndex + 1}`);
          if (currentMultiplier > 1) {
            setMultiplierReset(true);
            setTimeout(() => setMultiplierReset(false), 300);
          }
          setMultiplier(1);
          setCurrentStreak(0);
        }

        // Activate hit zone
        setActiveZones(zones => {
          const newZones = [...zones];
          newZones[laneIndex] = true;
          return newZones;
        });

        // Deactivate hit zone after a short delay
        setTimeout(() => {
          setActiveZones(zones => {
            const newZones = [...zones];
            newZones[laneIndex] = false;
            return newZones;
          });
        }, 100);
      };


      useEffect(() => {
        if (!gameStarted) return;

        const keyHandler = (e) => {
          switch (e.key) {
            case 'd': handleKeyPress(0); break;
            case 'f': handleKeyPress(1); break;
            case 'j': handleKeyPress(2); break;
            case 'k': handleKeyPress(3); break;
            case 'l': handleKeyPress(4); break;
            default: break;
          }
        };

        window.addEventListener('keydown', keyHandler);
        return () => window.removeEventListener('keydown', keyHandler);
      }, [gameStarted]);

    const fadeOutAudio = (waveSurfer, duration = 2000) => {
        const fadeOutInterval = 50;
        const steps = duration / fadeOutInterval;
        const volumeStep = waveSurfer.getVolume() / steps;

        const fadeAudio = setInterval(() => {
            const currentVolume = waveSurfer.getVolume();
            if (currentVolume <= volumeStep) {
                clearInterval(fadeAudio);
                waveSurfer.setVolume(0);
            } else {
                waveSurfer.setVolume(currentVolume - volumeStep);
            }
        }, fadeOutInterval);
    };

    const handleBack = async () => {
        if (!sessionUser) {
            console.error('Session user is not defined.');
            return;
        }
        navigate(`/session-overview/${sessionUser.username}`);
    }

    const handleEnd = async () => {
        navigate(`/session-overview/${sessionUser.username}`);
    }

    const handlePlayAgain = () => { window.location.reload() };

    return (
        <div
            className={`gameplay ${backgroundPulse ? 'pulse' : ''}`}
            ref={gameplayRef}
            style={{
                backgroundImage: track?.song?.image_url
                    ? `linear-gradient(
                        rgba(0,0,0,0.5),
                        rgba(0,0,0,0.5)
                    ), url(${track.song.image_url})`
                    : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }}
        >
            <ParticleBackground hue={hue}/>
                {!gameStarted && !gameEnded && (
                    <div className='start-game-modal'>
                        <button className="fullscreen-button" onClick={handleToggleFullscreen}>
                            {isFullscreen
                                ? <i className="fa-solid fa-compress"></i>
                                : <i className="fa-solid fa-expand"></i>
                            }
                        </button>
                        <button className="start-track" onClick={handleStartGame}>Start Track</button>
                        <button className="back" onClick={handleBack}><i className="fa-solid fa-angle-left"></i>Back to Overview</button>
                    </div>
                )}
                {gameEnded && (
                    <div className='end-game-modal'>
                        <div className='container'>
                            <h1>Game Over</h1>
                            <div className='score'>
                                <h2>{displayedScore}</h2>
                            </div>
                            {hitNotes.size === totalNotes && totalNotes > 0 && (
                                <div className='perfect-score'>
                                    <p>PERFECT SCORE</p>
                                </div>
                            )}
                            <div className='new-highscore'></div>
                            <div className='statistics'>
                                <div className='hit stat'>
                                    <p>Notes Hit</p> <p>{hitNotes.size}/{totalNotes}</p>
                                </div>
                                <div className='missed stat'>
                                    <p>Notes Missed</p> <p>{totalNotes - hitNotes.size}</p>
                                </div>
                                <div className='streak stat'>
                                    <p>Longest Streak</p> <p>{longestStreak}</p>
                                </div>
                                <div className='highest-multi stat'>
                                    <p>Highest Multiplier</p> <p>x{highestMultiplier}</p>
                                </div>
                            </div>
                            <button className="play-again" onClick={handlePlayAgain}>Play Again</button>
                            <button className="back" onClick={handleBack}><i className="fa-solid fa-angle-left"></i>Back to Overview</button>
                        </div>
                        <button className="fullscreen-button" onClick={handleToggleFullscreen}>
                            {isFullscreen
                                ? <i className="fa-solid fa-compress"></i>
                                : <i className="fa-solid fa-expand"></i>
                            }
                        </button>
                    </div>
                )}
            {/* <audio ref={audioRef} src={track?.song?.audio_url} preload="auto" /> */}
            <div className='left'>
                <i onClick={handleEnd} className="fa-solid fa-chevron-left"></i>
                <div className={`multiplier ${multiplierReset ? 'multiplier-reset' : ''}`}>
                    <p className='multiplier-word'>Multiplier</p><p>x{multiplier}</p>
                </div>
            </div>
            <div className='center'>
                <div className='track-lanes'>
                    {/* <div className={`falling-line ${gameStarted && !gameEnded ? 'active' : ''}`}></div> */}
                    {[...Array(5)].map((_, laneIndex) => (
                        <div className='lanes' key={laneIndex}>
                            {fallingNotes.filter(note => note.lane === laneIndex + 1).map(note => (
                                <div
                                    className={`note ${hitNotes.has(note.uniqueId) ? 'hit' : missedNotes.has(note.uniqueId) ? 'missed' : ''}`}
                                    key={note.uniqueId}
                                    style={{ top: `${note.position}%` }}
                                ></div>
                            ))}
                            <div className={`hit-zone ${activeZones[laneIndex] ? 'active' : ''}`}>
                                {laneEffects[laneIndex] && <HitEffect isActive={laneEffects[laneIndex]} />}
                            </div>
                            <div className="key-label">{KEY_LABELS[laneIndex]}</div>
                        </div>
                    ))}
                </div>
            </div>
            <div className='right'>
                <div className='score'>
                    <p className='word-score'>Score</p><p className='number-score'>{score}</p>
                </div>
            </div>
        </div>
    )
}

export default Gameplay;
