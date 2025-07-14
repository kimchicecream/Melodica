import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import WaveSurfer from 'wavesurfer.js';
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline.esm.js'
import Hover from 'wavesurfer.js/dist/plugins/hover.esm.js'
import Minimap from 'wavesurfer.js/dist/plugins/minimap.esm.js'
import { createNote, editNote, removeNote, clearTrackNotes } from '../../redux/notes';
import { fetchTrackById, editTrack, setTrackNotes } from '../../redux/tracks';
import './TrackEditor.css';

function TrackEditor() {
    const { trackId } = useParams();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const notes = useSelector(state => state.notes.trackNotes);
    const sessionUser = useSelector((state) => state.session.user);
    const [localNotes, setLocalNotes] = useState({});
    const [song, setSong] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [draggedNoteId, setDraggedNoteId] = useState(null);
    const waveformRef = useRef(null);
    const wavesurferRef = useRef(null)
    const timelineRef = useRef(null);
    const lanesRef = useRef(null);
    const minPxPerSec = 300;
    const snapThreshold = 0.08;

    // keep page static
    useEffect(() => {
        document.body.style.overflow = "hidden";

        return () => {
          document.body.style.overflow = "auto";
        };
    }, []);

    // fetch track and song details
    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;

        dispatch(fetchTrackById(trackId)).then((trackData) => {
            if (trackData && trackData.song) {
                setSong(trackData.song);
                const notesMap = Object.values(trackData.notes).reduce((acc, note) => {
                    acc[note.id] = note;
                    return acc;
                }, {});
                setLocalNotes(notesMap);
                dispatch(setTrackNotes(notesMap));
            } else {
                console.error('Failed to get song details from track data');
            }
        });

        return () => {
            controller.abort();
            dispatch(clearTrackNotes());
        };
    }, [trackId, dispatch]);

    // ****** wavesurfer ******
    useEffect(() => {
        if (song && waveformRef.current && !wavesurferRef.current) {
            wavesurferRef.current = WaveSurfer.create({
                container: waveformRef.current,
                waveColor: '#d9dcff',
                progressColor: '#29DFB1',
                height: 230,
                responsive: true,
                normalize: true,
                scrollParent: true,
                minPxPerSec: minPxPerSec,
                cursorWidth: 2,
                barWidth: 2,
                barGap: 1.5,
                plugins: [
                    TimelinePlugin.create({
                        container: timelineRef.current
                    }),
                    Hover.create(),
                    Minimap.create({
                        height: 150,
                        waveColor: '#d9dcff',
                        progressColor: '#4353ff',
                        cursorColor: '#ff6347',
                        cursorWidth: 2,
                        barWidth: 2,
                        barGap: 1.5,
                    })
                ]
            });

            wavesurferRef.current.load(song.song_url);

            wavesurferRef.current.on('ready', () => {
                console.log('WaveSurfer is ready');
                const duration = wavesurferRef.current.getDuration();
                setDuration(duration);
                const newWidth = duration * minPxPerSec;
                waveformRef.current.style.width = `${newWidth}px`;
                lanesRef.current.style.width = `${newWidth}px`;
                document.querySelectorAll('.lane').forEach(lane => {
                    lane.style.width = `${newWidth}px`;
                });
            });

            wavesurferRef.current.on('audioprocess', () => {
                setCurrentTime(wavesurferRef.current.getCurrentTime());
            });

            wavesurferRef.current.on('seek', (progress) => {
                const newTime = wavesurferRef.current.getDuration() * progress;
                setCurrentTime(newTime);
            });

            wavesurferRef.current.on('error', (e) => {
                console.error('WaveSurfer error:', e);
            });

            wavesurferRef.current.on('finish', () => {
                setIsPlaying(false);
            });
        }
    }, [song]);

    useEffect(() => {
        console.log("Notes updated:", notes);
    }, [notes]);

    // play button
    const handlePlay = useCallback(() => {
        if (wavesurferRef.current && !isPlaying) {
            wavesurferRef.current.play();
            setIsPlaying(true);
        }
    }, [isPlaying]);

    // pause button
    const handlePause = useCallback(() => {
        if (wavesurferRef.current && isPlaying) {
            wavesurferRef.current.pause();
            setIsPlaying(false);
        }
    }, [isPlaying]);

    // play from beginning button
    const handleRestart = () => {
        if (wavesurferRef.current) {
            wavesurferRef.current.seekTo(0);
            if (!isPlaying) {
                wavesurferRef.current.pause();
            }
            setIsPlaying(true);
        }
    };

    // use spacebar to pause and play
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.code === 'Space') {
                event.preventDefault();
                if (isPlaying) {
                    handlePause();
                } else {
                    handlePlay();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [handlePlay, isPlaying, handlePause]);

    // format timestamp
    const formatTime = (time) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        const milliseconds = Math.floor((time % 1) * 1000);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}.${milliseconds < 100 ? (milliseconds < 10 ? '00' : '0') : ''}${milliseconds}`;
    };

    // width of lanes
    useEffect(() => {
        if (lanesRef.current) {
            const newWidth = duration * minPxPerSec;
            lanesRef.current.style.width = `${newWidth}px`;
            document.querySelectorAll('.lane').forEach(lane => {
                lane.style.width = `${newWidth}px`;
            });
        }
    }, [duration]);

    const handleDragStart = useCallback((e, noteId) => {
        console.log(`Dragging note with ID: ${noteId}`);
        setDraggedNoteId(noteId);
        e.dataTransfer.setData('note-id', noteId);
    }, []);

    // actions for where the note is dropped
    const handleDrop = useCallback((e, lane) => {
        e.preventDefault();
        const noteId = e.dataTransfer.getData('note-id');
        let timestamp = (e.clientX - e.target.getBoundingClientRect().left) / minPxPerSec;

        for (let i = 1; i <= 5; i++) {
            if (i !== lane) {
                const adjacentNotes = Object.values(notes).filter(note => note.lane === i);
                for (let note of adjacentNotes) {
                    if (Math.abs(note.time - timestamp) < snapThreshold) {
                        timestamp = note.time;
                        break;
                    }
                }
            }
        }

        if (noteId === 'new') {
            const newNote = {
                id: `temp-${Date.now()}`,
                time: timestamp,
                lane: lane,
                note_type: 'tap',
            };
            setLocalNotes(prevNotes => ({ ...prevNotes, [newNote.id]: newNote }));
        } else {
            setLocalNotes(prevNotes => ({
                ...prevNotes,
                [noteId]: {
                    ...prevNotes[noteId],
                    time: timestamp,
                    lane: lane,
                }
            }));
        }

        setDraggedNoteId(null);
    }, [draggedNoteId, minPxPerSec, notes, dispatch]);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
    }, []);

    const handleDragEnd = (e) => {
        const lanesBoundingBox = lanesRef.current.getBoundingClientRect();
        if (e.clientY < lanesBoundingBox.top || e.clientY > lanesBoundingBox.bottom) {
            // if the drag ends outside the lanes container, remove the note
            if (draggedNoteId && draggedNoteId !== 'new') {
                console.log(`Removing note with ID: ${draggedNoteId}`);
                setLocalNotes(prevNotes => {
                    const newNotes = { ...prevNotes };
                    delete newNotes[draggedNoteId];
                    return newNotes;
                });
                setDraggedNoteId(null);
            }
        }
    };

    // format to mm:ss
    const formatDuration = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    };

    // when publish-button is clicked
    const handlePublish = async () => {
        const trackData = {
            song_id: song.id,
            notes: Object.values(localNotes),
            duration: duration,
        };

        const result = await dispatch(editTrack(trackId, trackData));
        if (result.errors) {
            console.error('Errors:', result.errors);
        } else {
            navigate(`/track-overview/${trackId}`);
        }
    };

    const handleHome = async () => {
        dispatch(clearTrackNotes());
        navigate(`/session-overview/${sessionUser.username}`);
    }

    if (!song) {
        return <div>Loading song details...</div>;
    }

    return (
        <div className='track-creator-page'>
            <div className='nav-bar'>
                    <button onClick={handleHome}>Back</button>
                    <button onClick={handlePublish}>Confirm Changes</button>
            </div>
            <div className='track-creator'>
                <div className='song-details-container'>
                    <div className='song-image'>
                        <img src={song.image_url} />
                    </div>
                    <div className='song-details'>
                        <h2>{song.song_name}</h2>
                        <h3>{song.artist_name}</h3>
                        <p>{formatDuration(song.duration)}</p>
                    </div>
                </div>
                <div className='controls'>
                    <div className='note-container'>
                        <div className='note' draggable onDragStart={(e) => handleDragStart(e, 'new')}></div>
                    </div>
                    <div className='play-pause'>
                        <button onClick={handleRestart}>
                            <i className="fa-solid fa-undo"></i>
                        </button>
                        <button onClick={handlePlay} disabled={isPlaying}>
                            <i className="fa-solid fa-play"></i>
                        </button>
                        <button onClick={handlePause} disabled={!isPlaying}>
                            <i className="fa-solid fa-pause"></i>
                        </button>
                    </div>
                    <div className='timestamp'>
                        <p>{formatTime(currentTime)}</p>
                    </div>
                    <p>{Object.keys(localNotes).length} note{Object.keys(localNotes).length !== 1 ? 's' : ''}</p>
                </div>
                <div className='wavesurfer-track'>
                    <div ref={waveformRef} id="waveform"></div>
                    <div className='track-lanes' ref={lanesRef}>
                        {[1, 2, 3, 4, 5].map(lane => (
                            <div
                                key={lane}
                                className='lane'
                                id={`lane-${lane}`}
                                onDrop={(e) => handleDrop(e, lane)}
                                onDragOver={handleDragOver}
                            >
                                {Object.values(localNotes).filter(note => note.lane === lane).map(note => (
                                    <div
                                        key={note.id}
                                        className='note'
                                        style={{ left: `${note.time * minPxPerSec}px` }}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, note.id)}
                                        onDragEnd={handleDragEnd}
                                    ></div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )

}

export default TrackEditor;
