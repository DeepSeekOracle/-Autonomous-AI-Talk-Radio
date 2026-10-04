/**
 * First-play catalog: long spoken hours with the four station slates.
 * Writer lives in localShow so the stubs stay in the same 8–12 minute shape.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */
import { SPEAKERS } from '../data';
import { RadioShow } from '../types';
import { havenWelcomeShow } from './havenBooks';
import { synthesizeShow } from './localShow';

export function seedCatalog(): RadioShow[] {
  const specs: Array<{
    id: string;
    stationId: string;
    title: string;
    episodeNumber: number;
    createdAt: string;
    topic: string;
    host1: string;
    host2: string;
    ungated: boolean;
  }> = [
    {
      id: 'show-software-rewrite',
      stationId: 'station-algorithmic-wire',
      title: 'The Algorithmic Wire — On Air',
      episodeNumber: 142,
      createdAt: '2026-09-29T14:00:00Z',
      topic: 'agent-written pull requests versus production fire',
      host1: SPEAKERS.devon.name,
      host2: SPEAKERS.maya.name,
      ungated: false,
    },
    {
      id: 'show-ungated-systems',
      stationId: 'station-kernel-panic',
      title: 'Kernel Panic Radio — On Air',
      episodeNumber: 89,
      createdAt: '2026-09-29T15:10:00Z',
      topic: 'local inference versus the cloud GPU tax',
      host1: SPEAKERS.zack.name,
      host2: SPEAKERS.aris.name,
      ungated: true,
    },
    {
      id: 'show-hn-breakdown',
      stationId: 'station-hn-live',
      title: 'Hacker News Live — On Air',
      episodeNumber: 64,
      createdAt: '2026-09-29T12:30:00Z',
      topic: 'front page shipping claims versus what actually ran',
      host1: SPEAKERS.casey.name,
      host2: SPEAKERS.devon.name,
      ungated: false,
    },
    {
      id: 'show-compute-wars',
      stationId: 'station-sv-confidential',
      title: 'Silicon Valley Confidential — On Air',
      episodeNumber: 31,
      createdAt: '2026-09-29T10:00:00Z',
      topic: 'who pays for the silicon this quarter',
      host1: SPEAKERS.victoria.name,
      host2: SPEAKERS.devon.name,
      ungated: false,
    },
  ];

  const seeded = specs.map((s) => {
    const show = synthesizeShow({
      topic: s.topic,
      tone: s.ungated ? 'ungated' : 'unfiltered-debate',
      stationId: s.stationId,
      ungated: s.ungated,
      host1: s.host1,
      host2: s.host2,
    });
    return {
      ...show,
      id: s.id,
      title: s.title,
      episodeNumber: s.episodeNumber,
      createdAt: s.createdAt,
    };
  });
  return [...seeded, havenWelcomeShow()];
}
