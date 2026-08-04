/**
 * The printable agenda.
 *
 * These run the real pipeline — `buildPresentationCards()` (the same builder Presentation Mode
 * uses) into `buildAgendaPdfHtml()` — and assert on the HTML that is actually handed to the print
 * engine. Testing the two together is the point: the requirement is about which fields reach the
 * PAPER, and that is decided by the builder's include/omit rules and the renderer's empty-value
 * handling jointly. Testing either alone would prove nothing about the printed sheet.
 *
 * What no test here can tell you: whether it is legible. Look at the PDF.
 */
import { buildPresentationCards } from '../hooks/usePresentationMode';
import { buildAgendaPdfHtml, escapeHtml, type AgendaPdfBranding } from '../lib/agendaPdf';
import { publishedStoreLinks, type StoreLink } from '../lib/storeLinks';
import type { Speech, SundayAgenda, SundayException } from '../types/database';

const t = (key: string, fallback?: string) => fallback ?? key;

/** Hymn ids resolve to "<number>. <title>"; an unset id resolves to ''. */
const hymnLookup = (id: string | null) => (id ? `${id.toUpperCase()} hymn` : '');

function makeAgenda(over: Partial<SundayAgenda> = {}): SundayAgenda {
  return {
    id: 'ag1', ward_id: 'w1', sunday_date: '2026-08-09',
    presiding_name: null, conducting_name: null, recognized_names: null,
    welcome_new_families: null, announcements: null,
    pianist_name: null, conductor_name: null,
    opening_hymn_id: null, opening_prayer_member_id: null, opening_prayer_name: null,
    designations: [], has_baby_blessing: false, baby_blessing_names: null,
    has_baptism_confirmation: false, baptism_confirmation_names: null,
    has_stake_announcements: false, sacrament_hymn_id: null,
    has_special_presentation: false, has_intermediate_hymn: true,
    special_presentation_description: null, intermediate_hymn_id: null,
    speaker_1_override: null, speaker_2_override: null, speaker_3_override: null,
    has_second_speech: true,
    closing_hymn_id: null, closing_prayer_member_id: null, closing_prayer_name: null,
    attendance: null, created_at: '', updated_at: '',
    ...over,
  } as SundayAgenda;
}

function speech(position: number, speaker_name: string | null): Speech {
  return { id: `s${position}`, position, speaker_name } as Speech;
}

const BRANDING: AgendaPdfBranding = {
  appName: 'Sacrament Meeting Planner',
  wardName: 'Ala Modelo',
  dateLabel: '9 de agosto de 2026',
  iconDataUri: 'data:image/png;base64,ICON',
  stores: [{ label: 'App Store', dataUri: 'data:image/png;base64,QRIOS' }],
};

const LABELS = { documentTitle: 'Agenda da Reunião Sacramental', downloadPrompt: 'Baixe o app' };

/** Render the whole pipeline. */
function html(
  agenda: SundayAgenda | null,
  speeches: Speech[] = [],
  exception: SundayException | null = null,
  branding: Partial<AgendaPdfBranding> = {}
): string {
  const cards = buildPresentationCards(agenda, speeches, exception, hymnLookup, t, []);
  return buildAgendaPdfHtml(cards, { ...BRANDING, ...branding }, LABELS);
}

/** Every `label -> rendered value` pair in the document. Empty value = a fill-in line. */
function rows(doc: string): { label: string; value: string; blank: boolean }[] {
  return [...doc.matchAll(/<div class="l">(.*?)<\/div><div class="f">(.*?)<\/div>/gs)].map((m) => ({
    label: m[1],
    value: m[2],
    blank: m[2].includes('class="blank"'),
  }));
}

const labelsOf = (doc: string) => rows(doc).map((r) => r.label);
const rowFor = (doc: string, label: string) => rows(doc).find((r) => r.label === label);

// A speech Sunday with every mandatory field filled in.
const FULL_SPEECHES = {
  agenda: makeAgenda({
    presiding_name: 'Bispo Silva', conducting_name: 'Irmão Souza',
    pianist_name: 'Ana', conductor_name: 'Bruno',
    opening_hymn_id: 'op', sacrament_hymn_id: 'sac',
    intermediate_hymn_id: 'int', closing_hymn_id: 'clo',
  }),
  speeches: [
    speech(0, 'Orador Abertura'), speech(1, 'Primeiro'), speech(2, 'Segundo'),
    speech(3, 'Último'), speech(4, 'Orador Encerramento'),
  ],
};

describe('the mandatory fields are always printed — a speech Sunday', () => {
  const MANDATORY = [
    'agenda.presiding',
    'agenda.conducting',
    'agenda.pianist',
    'agenda.conductor',
    'agenda.openingHymn',
    'agenda.openingPrayer',
    'agenda.sacramentHymn',
    'Intermediate Hymn',
    'agenda.closingHymn',
    'agenda.closingPrayer',
  ];

  it.each(MANDATORY)('prints %s when filled', (label) => {
    const doc = html(FULL_SPEECHES.agenda, FULL_SPEECHES.speeches);
    expect(labelsOf(doc)).toContain(label);
  });

  it.each(MANDATORY)('still prints %s when EMPTY, as a fill-in line', (label) => {
    // The whole point of a printed agenda: blanks are there to be written on.
    const doc = html(makeAgenda(), []);
    const row = rowFor(doc, label);
    expect(row).toBeDefined();
    expect(row!.blank).toBe(true);
  });

  it('prints the first and last speaker', () => {
    const doc = html(FULL_SPEECHES.agenda, FULL_SPEECHES.speeches);
    expect(labelsOf(doc)).toContain('1º speeches.speaker');
    expect(labelsOf(doc)).toContain('speeches.lastSpeech');
  });

  it('prints the speaker rows as fill-in lines when nobody is assigned', () => {
    const doc = html(makeAgenda(), []);
    expect(rowFor(doc, '1º speeches.speaker')!.blank).toBe(true);
    expect(rowFor(doc, 'speeches.lastSpeech')!.blank).toBe(true);
  });

  it('prints exactly 4 hymns on a speech Sunday', () => {
    const doc = html(FULL_SPEECHES.agenda, FULL_SPEECHES.speeches);
    const hymnLabels = labelsOf(doc).filter((l) => /hymn/i.test(l));
    expect(hymnLabels).toEqual([
      'agenda.openingHymn',
      'agenda.sacramentHymn',
      'Intermediate Hymn',
      'agenda.closingHymn',
    ]);
  });
});

describe('the second speech follows its toggle', () => {
  it('is printed when has_second_speech is on', () => {
    const doc = html(makeAgenda({ has_second_speech: true }), []);
    expect(labelsOf(doc)).toContain('2º speeches.speaker');
  });

  it('is absent when has_second_speech is off', () => {
    // Not a blank line — the slot does not exist that week, so a line to fill in would be wrong.
    const doc = html(makeAgenda({ has_second_speech: false }), []);
    expect(labelsOf(doc)).not.toContain('2º speeches.speaker');
  });

  it('is printed with its speaker when one is assigned', () => {
    const doc = html(makeAgenda({ has_second_speech: true }), [speech(2, 'Segundo')]);
    expect(rowFor(doc, '2º speeches.speaker')!.value).toContain('Segundo');
  });
});

describe('a testimony Sunday', () => {
  const testimony = { reason: 'testimony_meeting' } as SundayException;

  it('prints exactly 3 hymns — no intermediate', () => {
    const doc = html(FULL_SPEECHES.agenda, FULL_SPEECHES.speeches, testimony);
    const hymnLabels = labelsOf(doc).filter((l) => /hymn/i.test(l));
    expect(hymnLabels).toEqual([
      'agenda.openingHymn',
      'agenda.sacramentHymn',
      'agenda.closingHymn',
    ]);
  });

  it('prints no speaker rows', () => {
    const doc = html(FULL_SPEECHES.agenda, FULL_SPEECHES.speeches, testimony);
    expect(labelsOf(doc).filter((l) => /speaker|lastSpeech/i.test(l))).toEqual([]);
  });

  it('still prints both prayers and the four people fields', () => {
    const doc = html(makeAgenda(), [], testimony);
    for (const label of [
      'agenda.presiding', 'agenda.conducting', 'agenda.pianist', 'agenda.conductor',
      'agenda.openingPrayer', 'agenda.closingPrayer',
    ]) {
      expect(labelsOf(doc)).toContain(label);
    }
  });
});

describe('a special presentation replaces the intermediate hymn', () => {
  it('prints the musical number instead of the 4th hymn', () => {
    const doc = html(
      makeAgenda({ has_special_presentation: true, special_presentation_description: 'Coro' }),
      []
    );
    expect(labelsOf(doc)).toContain('agenda.musicalNumber');
    expect(labelsOf(doc)).not.toContain('Intermediate Hymn');
    expect(labelsOf(doc).filter((l) => /hymn/i.test(l))).toHaveLength(3);
  });

  it('prints it as a fill-in line when the toggle is on but the description is empty', () => {
    // The event is happening; only the wording is undecided.
    const doc = html(makeAgenda({ has_special_presentation: true }), []);
    expect(rowFor(doc, 'agenda.musicalNumber')!.blank).toBe(true);
  });
});

describe('optional fields are omitted when empty', () => {
  const OPTIONAL = [
    'agenda.recognizing',
    'agenda.welcomeNewFamilies',
    'agenda.announcements',
    'agenda.wardBusiness',
    'Baby Blessing',
    'Baptism Confirmation',
    'agenda.stakeAnnouncements',
  ];

  it.each(OPTIONAL)('%s does not appear at all on an empty agenda', (label) => {
    const doc = html(makeAgenda(), []);
    expect(labelsOf(doc)).not.toContain(label);
  });

  it('appears once it has content', () => {
    const doc = html(makeAgenda({ announcements: 'Noite familiar' }), []);
    expect(rowFor(doc, 'agenda.announcements')!.value).toContain('Noite familiar');
  });

  it('a toggle without its names stays hidden', () => {
    // has_baby_blessing on but no names: nothing to print, and no line to fill in either, because
    // the name is captured in the app rather than by hand.
    const doc = html(makeAgenda({ has_baby_blessing: true }), []);
    expect(labelsOf(doc)).not.toContain('Baby Blessing');
  });
});

describe('rendering', () => {
  it('renders a multi-entry list as bullets, not one run-on line', () => {
    const doc = html(makeAgenda({ announcements: 'Um\nDois\nTrês' }), []);
    const row = rowFor(doc, 'agenda.announcements')!;
    expect(row.value).toContain('<ul');
    expect((row.value.match(/<li>/g) ?? [])).toHaveLength(3);
  });

  it('drops blank lines inside a list', () => {
    const doc = html(makeAgenda({ announcements: 'Um\n\n   \nDois' }), []);
    expect((rowFor(doc, 'agenda.announcements')!.value.match(/<li>/g) ?? [])).toHaveLength(2);
  });

  it('escapes names that would otherwise break the markup', () => {
    const doc = html(makeAgenda({ presiding_name: 'Silva & Souza <b>' }), []);
    expect(rowFor(doc, 'agenda.presiding')!.value).toContain('Silva &amp; Souza &lt;b&gt;');
    expect(doc).not.toContain('<b>');
  });

  it('escapes the ward name and the date in the header', () => {
    const doc = html(makeAgenda(), [], null, { wardName: 'Ala <script>' });
    expect(doc).toContain('Ala &lt;script&gt;');
    expect(doc).not.toContain('<script>');
  });

  it('escapes quotes and apostrophes', () => {
    expect(escapeHtml(`d'Ávila "x"`)).toBe('d&#39;Ávila &quot;x&quot;');
  });
});

describe('branding', () => {
  it('prints the title, ward and date in the header', () => {
    const doc = html(makeAgenda(), []);
    expect(doc).toContain('Agenda da Reunião Sacramental');
    expect(doc).toContain('Ala Modelo');
    expect(doc).toContain('9 de agosto de 2026');
  });

  it('embeds the app icon', () => {
    expect(html(makeAgenda(), [])).toContain('data:image/png;base64,ICON');
  });

  it('prints without an icon rather than failing when it could not be read', () => {
    const doc = html(makeAgenda(), [], null, { iconDataUri: null });
    expect(doc).toContain('Agenda da Reunião Sacramental');
    expect(doc).not.toContain('class="icon"');
  });

  it('omits the ward line when there is no ward name', () => {
    const doc = html(makeAgenda(), [], null, { wardName: '   ' });
    expect(doc).not.toContain('class="ward"');
  });

  it('prints one QR today, with its store label', () => {
    const doc = html(makeAgenda(), []);
    expect((doc.match(/class="qr"/g) ?? [])).toHaveLength(1);
    expect(doc).toContain('App Store');
    expect(doc).toContain('Baixe o app');
  });

  it('prints two QRs side by side once a second store is configured', () => {
    const doc = html(makeAgenda(), [], null, {
      stores: [
        { label: 'App Store', dataUri: 'data:image/png;base64,A' },
        { label: 'Google Play', dataUri: 'data:image/png;base64,B' },
      ],
    });
    expect((doc.match(/class="qr"/g) ?? [])).toHaveLength(2);
    expect(doc).toContain('Google Play');
  });

  it('omits the whole footer when no store is published', () => {
    const doc = html(makeAgenda(), [], null, { stores: [] });
    expect(doc).not.toContain('<footer>');
    expect(doc).not.toContain('Baixe o app');
  });
});

describe('storeLinks', () => {
  it('publishes only the stores that have a URL', () => {
    const links: StoreLink[] = [
      { id: 'ios', label: 'App Store', url: 'https://apps.apple.com/x' },
      { id: 'android', label: 'Google Play', url: null },
    ];
    expect(publishedStoreLinks(links).map((s) => s.id)).toEqual(['ios']);
  });

  it('the shipped config points iOS at the real listing', () => {
    const ios = publishedStoreLinks().find((s) => s.id === 'ios');
    expect(ios?.url).toContain('apps.apple.com');
    expect(ios?.url).toContain('id6759450448');
  });
});
