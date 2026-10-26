// Looks are ffmpeg filter chains applied after the frames are painted, so the
// scene code stays clean and the same film can be rendered with or without one.

export const LOOKS = {
  // 1980s studio videotape: soft luma, colour that smears sideways and lags the
  // picture, edge enhancement from the camera, lifted blacks, tape noise.
  "pal-tape": [
    "format=yuv444p",
    "gblur=sigma=1.1:sigmaV=0.5:planes=1", // luma: about 5 MHz of detail
    "gblur=sigma=5:sigmaV=0.9:planes=6", // chroma: far less bandwidth than luma
    "chromashift=cbh=3:crh=3", // chroma arrives late
    "unsharp=lx=7:ly=3:la=0.9", // tube-camera edge enhancement: halos on outlines
    "eq=saturation=1.22:contrast=0.93:brightness=0.025",
    "noise=all_seed=7:alls=6:allf=t",
  ].join(","),
  // Widescreen film: highlights bloom, corners fall off, grain, 2.39:1 bars.
  cine: [
    "format=gbrp",
    "split[sharp][soft];[soft]gblur=sigma=18[glow];[sharp][glow]blend=all_mode=screen:all_opacity=0.24", // bloom
    "eq=contrast=1.08:saturation=1.08",
    "vignette=PI/5",
    "noise=all_seed=11:alls=7:allf=t",
    "drawbox=x=0:y=0:w=iw:h=ih*0.128:color=black:t=fill",
    "drawbox=x=0:y=ih*0.872:w=iw:h=ih*0.128:color=black:t=fill",
  ].join(","),
  // Stage light for explainers: highlights bloom, corners fall off, fine grain. No bars,
  // so it works in portrait as well as wide.
  glow: [
    "format=gbrp",
    "split[sharp][soft];[soft]gblur=sigma=14[halo];[sharp][halo]blend=all_mode=screen:all_opacity=0.2",
    "eq=contrast=1.06:saturation=1.1",
    "vignette=PI/6",
    "noise=all_seed=11:alls=4:allf=t",
  ].join(","),
} as const;

export type LookName = keyof typeof LOOKS;
