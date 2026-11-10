## 2026-11-10T13:20:44Z
You are an Explorer investigating the 3D stage layout and camera framing in Timeout Quiz (working directory `d:\Timeout Quiz`).
Read `d:\Timeout Quiz\.agents\teamwork\ORIGINAL_REQUEST.md`.
Your working directory is `d:\Timeout Quiz\.agents\teamwork\explorer_survey_1\`.

Investigate:
1. Requirement R1:
   - Where and how `seatCount` (specifically 6, 7, 8) is defined and handled in `Podiums.tsx`, stage layout, and related components.
   - How podium positions, arc radius, angular span, or spacing are calculated. What causes podiums to crowd or collide when seatCount is 6, 7, 8?
   - Where CAM 10 (wide shot of all contestant podiums) and individual contestant cameras (CAM 5..8, CAM 25..28) are configured in `CameraController.tsx`, `useOlympiaCamera.ts`, or elsewhere.
   - How camera targets, FOV, position, lookAt, and bounding boxes are computed for different seatCount values.
   - Any aspect ratio / viewport clipping issues.
2. Absolute workspace safety rule: Do NOT modify or create any file outside `d:\Timeout Quiz`. Keep `d:\Olympia 26` completely untouched. Do not edit `d:\Timeout Quiz\AGENTS.md`. You are in exploration mode (read-only for project code, write reports only in your working directory).
3. Document all affected files, line numbers, data structures, and exact mathematical/geometric formulas currently used.
4. Propose a concrete fix strategy for R1.
5. Write your comprehensive report to `d:\Timeout Quiz\.agents\teamwork\explorer_survey_1\analysis.md` and deliver `handoff.md`. Send a message when finished.
