import React from 'react';
import { Star } from 'lucide-react';

const CARD_WIDTH = 380;
const CARD_GAP = 24;

const reviews = [
  {
    name: 'Arjun Patel',
    img: '/images/avatars/avatar-2.jpg',
    text: 'I was stuck at Band 6 for a long time and I didnt know why. This report shows me each part of writing like task achievement and grammar with a score. Now I know what I need to fix.'
  },
  {
    name: 'Hassan Khan',
    img: '/images/avatars/avatar-4.jpg',
    text: 'The fix cards help me a lot. For every weak sentence they give a better one so I can see how to write for Band 7. I practice with that and after two weeks my practice score went up.'
  },
  {
    name: 'Fatemeh Ahmadi',
    img: '/images/avatars/avatar-1.jpg',
    text: 'Mock exam is very useful for me. Same timer and same computer screen like real IELTS. When I practice under time I feel more calm because I already know the format.'
  },
  {
    name: 'Bolormaa Tseren',
    img: '/images/avatars/avatar-3.jpg',
    text: 'I take a photo of my handwritten essay and upload it. It reads my writing and gives a full report very fast. I dont need to type again. Very good for daily practice.'
  },
  {
    name: 'Minh Tran',
    img: '/images/avatars/avatar-5.jpg',
    text: 'I can see my progress from all my essays. My grammar got better but coherence was still weak. So I studied more on that and my practice band moved up.'
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
      <div className="text-center mb-12 px-4">
        <h2 className="text-[32px] font-bold text-[#1a1f36]">What learners say</h2>
        <p className="mt-2 text-[14px] text-[#9CA3AF]">Feedback from people practising with IELTS AI Tutor</p>
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
                  <img src={t.img} alt="" className="w-11 h-11 rounded-full object-cover" loading="lazy" decoding="async" width={44} height={44} />
                  <h4 className="text-[15px] font-bold text-[#1a1f36]">{t.name}</h4>
                </div>
              </div>
              <div className="flex gap-[2px] mb-3" aria-hidden="true">
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
