# Blender — interactive landing page

Standalone Vite + React + TypeScript page. Earlier demos remain separate.

```sh
npm install
npm run dev
npm run build
```

Preview: http://127.0.0.1:5178/ . Production output: `dist/`, with relative asset paths for static hosting.

## Interaction

- The original hero character scrubs with horizontal mouse movement.
- The introduction reveals its words as the reader scrolls.
- The introduction and reel share one pinned scene: a left-aligned 16:9 video card expands as a subdivided, flexible WebGL video surface with curved edges and perspective tilt and moves into a large rounded card with margins on all four sides, while copy and the cyan ribbon fade away. Reverse scrolling restores the card. Visible video plays muted; leaving the section or hiding the tab pauses it.
- The cyan ribbon draws as the scene enters, then bends and sweeps with scroll behind the expanding card. Its curve, draw progress, position and rotation reverse when scrolling up. Tune matching cubic control points and morph timing in `ScrollMotion.tsx`; colors live in the SVG gradient in `Showcase.tsx`.
- The transparent play label follows the pointer. Click to open a larger video player with native playback controls. Escape or Close returns to the page.
- Pause and sound controls are available on the inline reel.
- Six selected moments form a two-row, three-column 3D flip gallery. Hover or keyboard focus turns an artwork over to reveal its title, description and artist credit. Only one card opens at a time; neighboring cards yield slightly. Click the flipped card (or press Enter) to open the existing in-page artwork preview. Back or Escape returns; Escape on the gallery closes the flipped card.
- Cards enter with a short stagger as each row comes into view. Each flip includes directional light, a red illuminated edge and a moving soft shadow. Reduced-motion preferences remove these transitions.
- A separate dark WebGL carousel follows the flip gallery, using ten lower artwork views, without repeating the six upper flip-card images. Drag, wheel, arrow keys, previous/next or numbered controls browse the shared curved surface. Cards remain flat rectangles at rest. Pointer drag or wheel travel lifts the center and bends the sides; deformation fades back to zero after movement settles. Arrow/button navigation stays flat. All images, including the center, remain grayscale until the pointer reveals a local patch of original color. Clicking a side image centers it; clicking the centered image opens the existing artwork preview.
- Reduced-motion preferences disable scroll transforms and automatic reel playback. Manual playback remains available.

## Video and images

`public/media/blender-showcase.mp4` is a copy of the user-provided `Blender 5.2 LTS - Showcase Reel [gqfLYIJMv7I].mp4`. The original is unchanged. Its actual resolution is **640×360**, duration about **109.74 seconds**; enlarging the video or its extracted posters cannot add detail.

Replace the MP4 with a higher-resolution version at the same path. `reel-0.jpg` through `reel-3.jpg` are frames extracted at 8%, 32%, 58%, and 80% of the supplied reel. Update the reel poster when changing the video.

Gallery images in `public/images/` include optimized 2048px WebP artwork views derived from user-provided screenshots in the workspace's `images/` folder; all original screenshots and the earlier six PNG copies remain intact. The `WORK` list in `src/workData.ts` defines titles, categories, artist credits and crop bounds. Browser bars and black margins are cropped in CSS and shader UV coordinates. Screenshot source quality remains the limit; these are not new high-resolution renders. Credits not established from the supplied image are labeled as showcase contributors.

`src/WorkCarousel.tsx` owns the gallery exclusively. Its interaction direction references [GSAP Vault's 3D Card Flip Gallery](https://gsapvault.com/effects/3d-card-flip), implemented independently with React state, CSS 3D transforms and IntersectionObserver; no new runtime dependency is required. All sixteen local artwork views and their credits remain in `src/workData.ts`; the gallery displays the first six. Change the order there to choose the six visible works. Cards use a portrait crop for the front; the large-image preview retains the wider original crop.

Tune the scoped `.art-flip-*` styles in `src/index.css`: `.flip-gallery-grid` spans the same full content width as the section heading, with three columns and 30px/38px gaps; the card aspect ratio is 0.76, perspective is 1400px, flip duration is 820ms, active scale is 1.025 and neighboring scale is 0.965. Entrance stagger is 100ms per column. Front/back lights and shadows use separate elements, and entrance transforms use a separate wrapper to avoid interfering with the flip. Offscreen rows are observed once; no continuous WebGL rendering is needed for this gallery. `WorkPreview.tsx` retains the existing 850ms opening / 650ms returning large-image preview.

The previous liquid-glass shader is retained, unused, in `src/carousel/glassShader.ts`. Its MIT notice remains in `licenses/liquid-glass-carousel-MIT.txt` and `public/licenses/liquid-glass-carousel-MIT.txt`.

Scroll motion lives in `src/ScrollMotion.tsx`; layout and transition settings live in `src/index.css`. The stage height (`280vh`) is adjustable in CSS. Starting card width (`45%` of content width), top position (`48%` of the viewport height), and expansion duration (`80%` of pinned travel) are annotated in ScrollMotion. Wheel input uses 95ms damping to keep expansion visibly continuous. The card tilts during the transition and finishes flat at 91.2% viewport width and 78% viewport height, with 16% top / 6% bottom margins and a 20px corner radius. The remaining scroll distance holds this framed reel. Bounds are recalculated on resize, and scrolling is fully reversible. Animation uses native scroll events, requestAnimationFrame, and IntersectionObserver; no paid plugin or new runtime dependency.

The structure and interaction direction reference https://lusion.co/ . This is an independent Blender concept with user-provided media, not a copy of Lusion's assets or code.

The flexible surface is implemented in `src/WarpedVideo.tsx` using a local video texture and an 80×40 mesh. Vertex deformation bends the video itself and its border; rounded corners are computed on the deformed surface. Native video playback, mute/pause and the dialog remain available. Offscreen/hidden surfaces stop rendering. Unsupported WebGL falls back to the HTML video. No new runtime package is required.

The six-card flip gallery remains unchanged. A separate curved gallery is appended beneath it, before the existing toolkit. The hero, introduction, reel, toolkit and finale retain their layout.

## Additional curved gallery

`src/CurvedCarousel.tsx` implements the appended module, with visual direction from [Zeyna — WebGL Showcase Carousel](https://dribbble.com/shots/27439617-Zeyna-WebGL-Showcase-Carousel). This is an independent implementation using user-provided artwork, with no imported reference code, assets or new runtime dependencies.

The lower collection is `WORK.slice(6)`, while the upper grid uses the first six entries. The circular track displays ten artwork views, with its counter matching that collection. All subdivided image meshes sample one viewport-space depth and waist field, so the crest remains at the center while different cards travel through it. Vertex deformation changes both the artwork and its outer shape. Matching projected edge samples position the native click targets. `CURVE` controls resting depth (0), motion depth (190), central spread (21% of width), lateral bending and speed attack/release (90/380ms). Card height is limited to 420px or 70% of the stage, with a 3:4 aspect and 32px gap. Scoped `.zeyna-*` CSS controls the dark panel and stage dimensions.

The lower collection has ten views selected from `../images/`. Extra views include Playful expressions, Crafted characters, Crimson resolve, Electric avenues, Street stories and Color woven. The latter four replace the pixel art, face rig, wireframe portrait and painted viewport with finished works selected for stronger red/gold, blue/yellow, orange/blue and multicolor contrast. Some screenshots contain several artwork/process panels, which are cropped into separate views. None use the six source images displayed by the upper flip gallery.

All cards remain grayscale at rest, including the selected center. A soft circular mask reveals the original image colors only near the pointer, with no additive glow or whole-card recoloring. Screen-space sampling keeps this patch aligned with the pointer on the deformed mesh. `COLOR.revealAreaFraction` defaults to `1/2`: the half-color contour covers roughly half of the card area, with the radius adapting to card size (about 176px on desktop). The inner 65% of the radius shows full color and the outer band fades softly to grayscale. `COLOR.enter` / `COLOR.leave` set its 100/180ms fade response independently of deformation. Native image fallback overlays the same cropped color image through a radial mask. Keyboard focus retains the focus outline without recoloring the whole card. Rendering stops when reveal opacity and motion settle.

Motion has inertia and snap-to-artwork. Horizontal movement loops through the collection; vertical wheel movement releases the page at either end. Rendering stops when the stage is offscreen, the tab is hidden or motion settles. The canvas pixel ratio is capped at 1.5. Unsupported WebGL or context loss exposes native images and controls. Reduced-motion mode removes inertia and deformation while keeping direct browsing. Screenshot quality and portrait cropping remain limitations of the supplied media.

## Character experience chapter

`src/CharacterExperience.tsx` adds a separate chapter after the curved gallery and before the toolkit. A cyan SVG ribbon draws and morphs continuously with scroll; the tablet rises, scales and turns toward a frontal view, with limited pointer tilt. All styles are scoped to `.experience-*`, `.tablet-*` and `.character-*`; existing page sections and gallery interactions are retained.

The tablet uses `src/CharacterStage.tsx`, dynamically imported when the chapter approaches the viewport. Three.js loads the local `public/models/character.glb`, copied from the earlier runway demo's prepared character. It contains the original colored materials and Walk / Idle animations. No external model or environment URL is used. Walk loops in place; head tracking is added after animation evaluation, without accumulating bone rotations.

Adjust `START` / `END` in `CharacterExperience.tsx` for ribbon curves, and its scroll mapping for tablet rotation/scale. `CHARACTER` in `CharacterStage.tsx` controls height, walk speed, camera distance and head limits. Pixel ratio is capped at 1.5 (1 on mobile); mobile shadows are disabled. Rendering pauses offscreen or in a hidden tab, and reduced-motion mode uses a static pose and tablet. The model retains its source texture resolution; this chapter does not add 4K detail. The live model adds a lazy Three.js bundle and a 7MB local GLB.


## Film motion → interactive Blender ending

This extends the existing landing page, rather than creating a separate demo. Only the ending inside `#films-in-motion` changes; the hero, flip cards, curved gallery, and character chapter remain intact. The former toolkit and blue community sections after the film ending have been removed, along with their menu anchors. The black ending’s toolkit link opens Blender’s official features page. The heading and 12-cover ribbon retain their existing motion, and only six covers settle in the final wall. Covers are local files in `public/blender-films-covers/`.

The full chapter uses the existing CSS sticky stage (500svh on desktop), with normalized scroll progress. The ending is a reversible GSAP / ScrollTrigger scrub, with scoped Lenis smoothing only when the ending is interactive:

- **0–79%:** Existing Blender heading → 12-cover helix → six-cover wall, unchanged.
- **79–92%:** Existing horizontal shutters grow; a black backing completes the wipe. No footer headline overlaps the exposed film wall.
- **92–98%:** Blender headline words sharpen and rise, links/underlines appear, then the wire wordmark and upward-drifting smoke become visible.
- **98–100%:** Stable black ending. Hover/tap individual strokes to pluck them. Scrolling upward reverses the sequence.

`src/components/FilmFooter.tsx` owns the ending timeline; `filmFooter.css` scopes its layout. The existing sticky stage provides the pin without adding a second pin spacer. `FooterCTA.tsx` contains Blender download/studio/community links and Blender-related copy.

`FooterWireLogo.tsx` renders **650 independent SVG strokes** generated from BLENDER glyph scanlines in `wireGeometry.ts`. It does not display a solid word or a solid text mask. Transparent thick hit paths support pointer/touch interaction. A 26-segment sine with a zero-at-both-ends envelope moves only plucked strokes; GSAP decays amplitude/speed over 0.9s. Press Enter/Space on the focused logo to pluck successive strokes. The redraw ticker stops once all strings settle.

Sound is **on by default**. The first real pointer click/tap or key press on the page creates/resumes the Web Audio context; scrolling or hovering alone cannot bypass browser autoplay restrictions. Either SOUND toggle can mute or re-enable it. Three detuned sine oscillators, a short envelope, low-pass filter and quiet feedback delay create a soft flute-like pluck, with notes selected by stroke index. Polyphony is limited to eight voices and rapid notes are throttled. No audio file is loaded. Toggle again to mute. If Web Audio is unavailable, visual interaction remains usable.

`FooterFog.tsx` is lazy-loaded near the wipe. A vanilla Three.js fullscreen plane renders domain-warped FBM smoke, rising slowly behind the wordmark and pulsing on plucks. Its backing buffer is 65% of CSS dimensions. IntersectionObserver and page visibility stop its ticker offscreen/in hidden tabs; WebGL context loss retains a CSS atmospheric fallback. Renderer, geometry, material, observers and audio nodes are cleaned up on unmount.

With `prefers-reduced-motion: reduce`, the movie heading/grid and ending appear in normal document flow, complex scrub and string wobble are disabled, and fog renders a static frame. The default-on sound still waits for a real pointer/key gesture to unlock. Desktop is the design target; a compact narrow-screen layout and touch pluck are provided without reproducing a mobile helix.

Interaction direction: [Trionn](https://trionn.com/) and its [public architecture case study](https://tympanus.net/codrops/2026/07/15/the-architecture-behind-trionn-coordinating-gsap-three-js-lenis-and-web-audio/). The Blender copy, procedural wordmark, fog shader and implementation are local; no Trionn brand assets, fonts or audio files are copied.


The header description stays on one line. `public/blender-official-icon.svg` replaces the header’s star symbol with the unchanged official Blender icon downloaded from https://www.blender.org/wp-content/themes/bthree/assets/icons/favicon.svg . Official branding reference: https://www.blender.org/about/logo/ .

## GitHub Pages

This repository contains only the final landing page. Local review screenshots, logs, dependencies, environment files, and build output are excluded from Git. The original red hero background, cyan ribbons, and BLENDER MOVIES title are preserved.

The `.github/workflows/pages.yml` workflow installs the locked pnpm dependencies, checks TypeScript, builds for the repository subpath, and deploys `dist/` on every push to `main`. In the repository Settings → Pages, select **GitHub Actions** as the source. The workflow gets the correct base path from GitHub Pages, while local development retains relative asset URLs.

The hero currently uses its original external CloudFront video. All gallery images, film covers, the character model, and the showcase reel are included in `public/`.
