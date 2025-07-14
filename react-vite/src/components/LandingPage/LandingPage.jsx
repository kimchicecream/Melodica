import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import Particles from '../Particles/Particles';
import OpenModalButton from "../OpenModalButton";
import SignupFormModal from "../SignupFormModal";
import LoginFormModal from "../LoginFormModal";
import './LandingPage.css';

function LandingPage() {
  const laneRefs = useRef([]);
  const fadeRef = useRef(null);

  useEffect(() => {
    laneRefs.current.forEach((lane) => {
      lane.innerHTML = '';
      const note = document.createElement('div');
      note.className = 'mock-note';
      lane.appendChild(note);

      const stopPercent = 20 + Math.random() * 75; // 20% to 75%

      gsap.fromTo(note, { top: '-30px' }, {
        top: `${stopPercent}%`,
        duration: 1.8 + Math.random(),
        ease: 'power2.out'
      });

      gsap.to('.hero-text .line', {
        opacity: 1,
        y: 0,
        duration: 1.5,
        ease: 'power2.out',
        stagger: 0.5, // Animate one after another
        delay: 1,   // Wait a bit after load
      });

      gsap.to('.hero-cta-button', {
        opacity: 1,
        y: 0,
        duration: 1.5,
        ease: 'power2.out',
        stagger: 0.5, // Animate one after another
        delay: 1.6,   // Wait a bit after load
      });

      gsap.to('.hero-text-glow', {
        opacity: 1,
        scale: 1.4,
        duration: 1.5,
        delay: 0.4,
        ease: 'power2.out',
        onComplete: () => {
          gsap.to('.hero-text-glow', {
            scale: 1,
            opacity: 0.3,
            duration: 1.5,
            ease: 'sine.inOut',
            repeat: -1,
            yoyo: true,
          });
        }
      });

      gsap.to('.particles-layer', {
        opacity: 1,
        scale: 1.2,
        duration: 1.5,
        delay: 0.4,
        ease: 'power2.out',
      });
    });

    if (fadeRef.current) {
      gsap.to(fadeRef.current, {
        opacity: 1,
        duration: 1.5,
        delay: 0.1,
        ease: 'power1.out'
      });
    }
  }, []);

  return (
    <div className="landing-page-container">
      <div className="hero-container">
        <div className='particles-layer'>
          <Particles
            particleColors={['#ffffff', '#ffffff']}
            particleCount={400}
            particleSpread={20}
            speed={0.2}
            particleBaseSize={10}
            moveParticlesOnHover={true}
            alphaParticles={false}
            disableRotation={false}
          />
        </div>
        <div className="hero-text-glow" />
        <div className="hero-text">
          <h1><span className="line" id='one'>Play through music,</span></h1>
          <h2><span className="line" id='two'>one note at a time.</span></h2>
          <OpenModalButton
            buttonText="Play Now"
            modalComponent={<SignupFormModal />}
            className="hero-cta-button"
          />
        </div>
        <div className="mock-lanes-container">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="mock-lane"
              ref={(el) => (laneRefs.current[i] = el)}
            ></div>
          ))}
        </div>
        <div className="fade-overlay" ref={fadeRef} />
      </div>
      <div className='second-block'>

      </div>
    </div>
  );
}

export default LandingPage;
