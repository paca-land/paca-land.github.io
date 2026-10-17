// Generated ambience: no audio files, only Web Audio noise and oscillators,
// shaped to follow the weather, the time of day and what's on the land.
export function createSoundscape() {
  let ctx = null, master = null, noise = null;
  const layers = {};
  let birdWait = 2, cricketWait = 0, crackleWait = 0, lastFlash = -9;

  function noiseBuffer() {
    const length = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let brown = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      brown = 0.97 * brown + 0.03 * white;
      data[i] = white * 0.4 + brown * 2;
    }
    return buffer;
  }

  // A continuous, filtered noise bed whose level and tone we steer.
  function bed(type, frequency, Q) {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = Q;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    src.connect(filter).connect(gain).connect(master);
    src.start();
    return { gain, filter };
  }

  function envelope(gain, at, level, duration) {
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(level, at + Math.min(0.02, duration * 0.2));
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  }

  function burst({ type = 'bandpass', frequency = 1000, Q = 1, duration = 0.3, level = 0.2, sweepTo, delay = 0, pan = 0 }) {
    const at = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.Q.value = Q;
    filter.frequency.setValueAtTime(frequency, at);
    if (sweepTo) filter.frequency.exponentialRampToValueAtTime(sweepTo, at + duration);
    const gain = ctx.createGain();
    envelope(gain, at, level, duration);
    const panner = ctx.createStereoPanner();
    panner.pan.value = pan;
    src.connect(filter).connect(gain).connect(panner).connect(master);
    src.start(at, Math.random() * 1.5);
    src.stop(at + duration + 0.05);
  }

  function tone({ frequency, to, duration = 0.15, level = 0.05, type = 'sine', delay = 0, pan = 0 }) {
    const at = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, at);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, at + duration);
    const gain = ctx.createGain();
    envelope(gain, at, level, duration);
    const panner = ctx.createStereoPanner();
    panner.pan.value = pan;
    osc.connect(gain).connect(panner).connect(master);
    osc.start(at);
    osc.stop(at + duration + 0.05);
  }

  function birdsong() {
    const base = 2400 + Math.random() * 1800, pan = Math.random() * 1.6 - 0.8;
    const notes = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < notes; i++) {
      tone({ frequency: base * (1 + Math.random() * 0.15), to: base * (1.3 + Math.random() * 0.4), duration: 0.06 + Math.random() * 0.05, level: 0.025, delay: i * (0.09 + Math.random() * 0.05), pan });
    }
  }

  function cricket() {
    const f = 4200 + Math.random() * 600, pan = Math.random() * 1.6 - 0.8;
    for (let i = 0; i < 3; i++) tone({ frequency: f, duration: 0.035, level: 0.012, delay: i * 0.06, pan });
  }

  return {
    get on() {
      return Boolean(ctx) && ctx.state === 'running';
    },

    async enable() {
      if (!ctx) {
        ctx = new AudioContext();
        master = ctx.createGain();
        master.gain.value = 0.7;
        master.connect(ctx.destination);
        noise = noiseBuffer();
        layers.wind = bed('lowpass', 500, 0.5);
        layers.rain = bed('highpass', 1400, 0.4);
        layers.water = bed('bandpass', 700, 0.6);
        layers.storm = bed('lowpass', 140, 0.7);
      }
      await ctx.resume();
    },

    disable() {
      ctx?.suspend();
    },

    // `land` says what's there: { waterfall, lake, fire, grassy }.
    update(env, land, dt) {
      if (!this.on) return;
      const now = ctx.currentTime;
      const gust = 0.6 + 0.4 * Math.sin(now * 0.37) * Math.sin(now * 0.13 + 1);
      layers.wind.gain.gain.setTargetAtTime((0.03 + 0.05 * env.wind) * gust, now, 0.6);
      layers.wind.filter.frequency.setTargetAtTime(300 + 500 * gust * Math.min(env.wind, 2.5), now, 0.6);
      layers.rain.gain.gain.setTargetAtTime(env.rain * 0.16, now, 0.6);
      layers.water.gain.gain.setTargetAtTime(land.waterfall ? 0.05 : land.lake ? 0.012 : 0, now, 0.8);
      layers.storm.gain.gain.setTargetAtTime(env.rain * env.overcast * 0.12, now, 1);

      // Thunder follows the flash, a second or two later.
      if (env.flash > 0.8 && now - lastFlash > 1.5) {
        lastFlash = now;
        const delay = 0.6 + Math.random() * 2.2;
        burst({ type: 'lowpass', frequency: 900, sweepTo: 200, duration: 0.6, level: 0.25, delay });
        burst({ type: 'lowpass', frequency: 220, sweepTo: 50, duration: 3.5, level: 0.55, delay: delay + 0.05 });
      }
      const fair = (1 - env.night) * (1 - Math.max(env.rain, env.snow)) * (1 - env.mist * 0.5);
      if (fair > 0.4 && land.grassy && (birdWait -= dt) <= 0) {
        birdWait = 1.5 + Math.random() * 4.5;
        birdsong();
      }
      if (env.night > 0.6 && env.rain < 0.2 && env.snowCover < 0.3 && land.grassy && (cricketWait -= dt) <= 0) {
        cricketWait = 0.5 + Math.random() * 0.9;
        cricket();
      }
      if (land.fire && (crackleWait -= dt) <= 0) {
        crackleWait = 0.05 + Math.random() * 0.25;
        burst({ type: 'highpass', frequency: 2500 + Math.random() * 2000, duration: 0.02 + Math.random() * 0.03, level: 0.04 + Math.random() * 0.05 });
      }
    },

    play(kind) {
      if (!this.on) return;
      if (kind === 'splash') burst({ frequency: 1200, sweepTo: 300, duration: 0.45, level: 0.25, Q: 0.8 });
      if (kind === 'rustle') burst({ frequency: 3500, Q: 0.6, duration: 0.6, level: 0.15 });
      if (kind === 'pop') tone({ frequency: 520, to: 880, duration: 0.12, level: 0.08 });
      if (kind === 'chips') burst({ type: 'highpass', frequency: 3000, duration: 0.15, level: 0.12 });
      if (kind === 'whoosh') burst({ type: 'lowpass', frequency: 700, duration: 1.1, level: 0.25 });
      if (kind === 'chime') [1320, 1980, 2640].forEach((f, i) => tone({ frequency: f, duration: 1.4 - i * 0.3, level: 0.05 / (i + 1) }));
      if (kind === 'quack') [0, 0.17].forEach((delay) => tone({ frequency: 430, to: 300, duration: 0.12, level: 0.05, type: 'sawtooth', delay }));
      if (kind === 'thud') tone({ frequency: 160, to: 70, duration: 0.25, level: 0.12, type: 'triangle' });
      if (kind === 'baa') [0, 0.09, 0.18].forEach((delay) => tone({ frequency: 360, to: 330, duration: 0.1, level: 0.04, type: 'sawtooth', delay }));
      if (kind === 'ribbit') [0, 0.11].forEach((delay) => tone({ frequency: 170, to: 260, duration: 0.07, level: 0.06, type: 'square', delay }));
    },
  };
}
