import React from 'react';
import { Star } from 'lucide-react';

const GoogleIcon = () => (
  <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const CARD_WIDTH = 380;
const CARD_GAP = 24;

const reviews = [
  {
    name: 'Arjun Patel',
    img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    text: 'I was stuck at Band 6 for long time and I didnt know why. This report show me each part of writing like task achievement and grammar with score. Now I know what I need to fix.'
  },
  {
    name: 'Hassan Khan',
    img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
    text: 'The fix cards help me a lot. For every bad sentence they give better one so I can see how to write for Band 7. I practise with that and after two weeks my score go up.'
  },
  {
    name: 'Fatemeh Ahmadi',
    img: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
    text: 'Mock exam is very useful for me. Same timer and same computer screen like real IELTS. When I go to exam I feel more calm because I already do this many times.'
  },
  {
    name: 'Bolormaa Tseren',
    img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    text: 'I take photo of my handwritten essay and upload. It read my writing and give full report very fast. I dont need to type again. Very good for daily practise.'
  },
  {
    name: 'Minh Tran',
    img: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop',
    text: 'I can see my progress from all my essays. My grammar get better but coherence still weak. So I study more on that and finally get Band 7 on test day.'
  }
];

// Duplicate for seamless infinite loop: animate from 0 → -50% of track width
const track = [...reviews, ...reviews];

// Each card occupies CARD_WIDTH + CARD_GAP px. Total track = track.length * (CARD_WIDTH + CARD_GAP)
// translateX(-50%) moves exactly one full set of reviews, creating a seamless reset.
const trackWidth = track.length * (CARD_WIDTH + CARD_GAP);

const Testimonials = () => (
  <>
    <style>{`
      @keyframes testimonials-marquee {
        0%   { transform: translateX(0); }
        100% { transform: translateX(-${trackWidth / 2}px); }
      }
      .testimonials-track {
        animation: testimonials-marquee 28s linear infinite;
      }
      .testimonials-track:hover {
        animation-play-state: paused;
      }
    `}</style>

    <section id="testimonials" className="bg-white py-20 overflow-hidden">
      <div className="text-center mb-12">
        <h2 className="text-[32px] font-bold text-[#1a1f36]">Testimonials</h2>
      </div>

      <div className="overflow-hidden">
        <div
          className="testimonials-track flex"
          style={{ width: `${trackWidth}px` }}
        >
          {track.map((t, i) => (
            <div
              key={i}
              className="bg-white p-5 rounded-xl border border-[#E5E7EB] flex flex-col shrink-0"
              style={{ width: `${CARD_WIDTH}px`, marginRight: `${CARD_GAP}px` }}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <img src={t.img} alt={t.name} className="w-11 h-11 rounded-full object-cover" />
                  <h4 className="text-[15px] font-bold text-[#1a1f36]">{t.name}</h4>
                </div>
                <GoogleIcon />
              </div>
              <div className="flex gap-[2px] mb-3">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} className="w-[16px] h-[16px] text-[#F59E0B]" fill="#F59E0B" />
                ))}
              </div>
              <p className="text-[14px] text-[#6B7280] leading-[1.6]">{t.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  </>
);

export default Testimonials;
