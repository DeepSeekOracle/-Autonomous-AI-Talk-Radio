/**
 * LYGO brand constants — every link the studio shows, in one place.
 *
 * Naming: the network is LYGO Signal, its descriptor is AI Radio · Always On, the music stream and
 * its player are LYGO RADIO, and LYGO TV is the live-channel room (chatagent.ca/sources/).
 *
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const LYGO = {
  house: 'https://chatagent.ca/',
  signal: 'https://chatagent.ca/signal/',
  radioPage: 'https://chatagent.ca/signal/radio/',
  brandPage: 'https://chatagent.ca/signal/brand/',
  /** LYGO TV — live channels, Excavationpro rooms. */
  tv: 'https://chatagent.ca/sources/',
  games: 'https://chatagent.ca/games/',
  skillHub: 'https://chatagent.ca/lygoskillhub.html',
  support: {
    paypal: 'https://www.paypal.com/paypalme/ExcavationPro',
    patreon: 'https://www.patreon.com/Excavationpro',
    patreonPost: 'https://www.patreon.com/Excavationpro/posts/lygo-supporter-170485961',
  },
  music: {
    hub: 'https://asiancoastline.com/listen.html',
    streaming: 'https://ffm.to/eovnvo9',
    spotify: 'https://open.spotify.com/artist/6CkZ4bN2xu3WRKbjEL3u2S',
    apple: 'https://music.apple.com/us/artist/excavationpro/1586588545',
    youtube: 'https://music.youtube.com/channel/UCnCf9gjhMEfUFPvGkdlUabQ',
  },
  /** Same catalogue the arcade rooms and the Signal pages stream from. */
  playlists: [
    'https://chatagent.ca/witness/radio.json',
    'https://asiancoastline.com/data/public_stream_playlist.json',
    'https://deepseekoracle.github.io/Excavationpro/data/public_stream_playlist.json',
  ],
  network: 'LYGO Signal',
  descriptor: 'AI RADIO · ALWAYS ON',
  show: 'AI Talk Radio (Ungated)',
} as const;

/** True while the studio's own broadcast voice is on air (speech synthesis). */
export const studioVoiceOnAir = (): boolean =>
  typeof window !== 'undefined' && !!window.speechSynthesis && window.speechSynthesis.speaking;
