---
title: Autonomous AI Talk Radio
emoji: 📻
colorFrom: red
colorTo: yellow
sdk: static
pinned: false
license: apache-2.0
short_description: "Ungated talk-radio studio: write, hear, and pack a show."
---

# Autonomous AI Talk Radio — the studio, live

The app from the repository `DeepSeekOracle/-Autonomous-AI-Talk-Radio`, built and published as a
static Space. Give it a topic and it writes an episode: two hosts, a caller on Line One, show notes,
takeaways, a timecoded transcript, voiced in your browser and downloadable as a zip pack.

This deployment runs the **client build**, so episode writing happens in the browser (the studio's own
writer). The managed Gemini path and the server's synthesizer live in the container build:

```bash
docker build -t ai-talk-radio .              # from the repository root
docker run -p 7860:7860 -e GEMINI_API_KEY=... ai-talk-radio
```

- **Repository:** https://github.com/DeepSeekOracle/-Autonomous-AI-Talk-Radio
- **Signal hub (Studio Desk):** https://chatagent.ca/signal/#studio-desk
- **Sibling desk build (renders MP3 packs):** https://deepseekoracle-ai-talk-radio.static.hf.space
