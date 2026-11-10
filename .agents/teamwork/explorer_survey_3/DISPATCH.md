## 2026-11-10T13:20:55Z
You are an Explorer investigating MC area lighting, intro audio looping, and screenshot verification setup in Timeout Quiz (working directory `d:\Timeout Quiz`).
Read `d:\Timeout Quiz\.agents\teamwork\ORIGINAL_REQUEST.md`.
Your working directory is `d:\Timeout Quiz\.agents\teamwork\explorer_survey_3\`.

Investigate:
1. Requirement R3:
   - Where MC desk, figures (Khánh Vy & Ngọc Huy), and lighting in the MC area are defined.
   - Why the MCs appear dark/ghost-like from distance or CAM 10.
   - How lights (SpotLight, PointLight, Directional key light, warm white #fff5e6) or material settings (roughness, metalness, emissive, ambient) are configured, and where to add/adjust dedicated key/fill lighting for the MCs.
2. Requirement R5:
   - How contestant intro audio is handled in the audio engine (Web Audio API, Howler, HTML5 Audio, etc.).
   - What the duration of the intro audio track is, and how total intro time is calculated for 6 contestants (~26.8s) and 8 contestants (~34.8s).
   - Where and how to implement seamless crossfade looping / concatenation if the track length is shorter than the presentation duration.
3. Requirement R6:
   - How the application runs (`npm run dev`, `npm run build`), what port it uses, and how browser screenshots can be captured (Playwright, Puppeteer, headless Chrome, or screenshot utility in the environment).
4. Absolute workspace safety rule: Do NOT modify or create any file outside `d:\Timeout Quiz`. Keep `d:\Olympia 26` completely untouched. Do not edit `d:\Timeout Quiz\AGENTS.md`. You are in exploration mode (read-only for project code, write reports only in your working directory).
5. Document all affected files, line numbers, audio/lighting configurations, and build/dev setup.
6. Propose concrete fix strategies for R3, R5, and R6.
7. Write your comprehensive report to `d:\Timeout Quiz\.agents\teamwork\explorer_survey_3\analysis.md` and deliver `handoff.md`. Send a message when finished.
