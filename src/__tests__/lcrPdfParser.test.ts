/**
 * S1 — LCR PDF parser tests (AC2, AC3, AC13 parse layer). Fixtures are ANONYMIZED text shaped like
 * the real pdf.js extraction of the LCR "Member List" PDF (never the real PII PDFs). They exercise:
 * pt/en/es labels+months, the es V/M gender flip, multi-line names, page-split rows, missing
 * phone/email, garbage phone, emails split across lines, and the Count/Contagem/Recuento line.
 */
import { parseLcrText, lcrNameToFirstLast } from '../lib/lcrPdfParser';

// --- pt fixture: title + wrapped header + footer + count; a multi-line name; a page-split row ---
const PT = [
  'Lista de Membros',
  'Ala Teste (999999)',
  'Nome Sexo Idade Data de',
  'Nascimento',
  'Número de',
  'Telefone E-mail',
  'Sobrenome, Alfa',           // multi-line name
  'Beta Gama',
  'M 8 26 jul 2018 alfa@example.com',
  'Curto, Bruno M 26 4 out 1999 90000-0010 bruno@example.com',
  'Semtel, Carla F 41 1 dez 1984',            // no phone, no email
  'Fulano, Dez M 12 3 fev 2016 (11) 90000-0011 dez@example.com', // (11) split into 2 tokens
  '30 jul. 2026 Somente para Uso da Igreja © Intellectual Reserve, Inc. Todos os direitos reservados. 1',
  // page 2: header repeats, then a row whose NAME was on page 1 boundary (simulated: name then data)
  'Nome Sexo Idade Data de',
  'Nascimento',
  'Número de',
  'Telefone E-mail',
  'Pagina, Dois M 33 25 nov 1992 (11) 90000-0012 dois@example.com',
  '30 jul. 2026 Somente para Uso da Igreja © Intellectual Reserve, Inc. Todos os direitos reservados. 2',
  'Contagem: 5',
].join('\n');

describe('parseLcrText — pt', () => {
  const r = parseLcrText(PT);
  it('reads the count line', () => expect(r.expectedCount).toBe(5));
  it('extracts all records across pages', () => expect(r.records).toHaveLength(5));
  it('joins a multi-line name', () => {
    expect(r.records[0].name).toBe('Sobrenome, Alfa Beta Gama');
    expect(r.records[0].age).toBe(8);
    expect(r.records[0].rawPhone).toBeNull(); // only an email
  });
  it('parses a single-line row with phone', () => {
    expect(r.records[1]).toMatchObject({ name: 'Curto, Bruno', age: 26, rawPhone: '90000-0010' });
  });
  it('handles a row with no phone and no email', () => {
    expect(r.records[2]).toMatchObject({ name: 'Semtel, Carla', age: 41, rawPhone: null });
  });
  it('joins a "(11) 90000-0011" phone split across tokens', () => {
    expect(r.records[3]).toMatchObject({ name: 'Fulano, Dez', age: 12, rawPhone: '(11) 90000-0011' });
  });
  it('does not leak the next name / footer / header into a record', () => {
    expect(r.records[4]).toMatchObject({ name: 'Pagina, Dois', age: 33 });
    expect(r.records.every((x) => !/Intellectual|Nascimento|Telefone|Contagem/.test(x.name))).toBe(true);
  });
});

// --- en fixture: English labels, English months, M/F ---
const EN = [
  'Member List',
  'Ward Test (999999)',
  'Name Gender Age Birth Date Phone Number Email',
  'Last, Ann M 30 8 May 1990 (11) 90000-0013 ann@example.com',
  'Solo, Bob F 12 28 Feb 2014',
  '30 Jul 2026 For Church Use Only © 2026 by Intellectual Reserve, Inc. All rights reserved. 1',
  'Count: 2',
].join('\n');

describe('parseLcrText — en', () => {
  const r = parseLcrText(EN);
  it('reads the Count line', () => expect(r.expectedCount).toBe(2));
  it('parses English months and M/F', () => {
    expect(r.records).toHaveLength(2);
    expect(r.records[0]).toMatchObject({ name: 'Last, Ann', age: 30, rawPhone: '(11) 90000-0013' });
    expect(r.records[1]).toMatchObject({ name: 'Solo, Bob', age: 12, rawPhone: null });
  });
});

// --- es fixture: Spanish labels, "mayo" (4 letters), V=male / M=female, Recuento ---
const ES = [
  'Lista de miembros',
  'Ala Test (999999)',
  'Nombre Sexo Edad Fecha de',
  'nacimiento',
  'Número de',
  'teléfono Correo electrónico',
  'Apellido, Carlos V 45 11 mayo 1980 (11) 90000-0014 carlos@example.com', // V = male
  'Apellida, Diana M 47 13 feb 1979 (11) 90000-0015 diana@example.com',    // M = female
  '30 jul 2026 Para uso exclusivo de la Iglesia © 2026 por Intellectual Reserve, Inc. Todos los derechos reservados. 1',
  'Recuento: 2',
].join('\n');

describe('parseLcrText — es (V/M flip, "mayo", Recuento)', () => {
  const r = parseLcrText(ES);
  it('reads the Recuento line', () => expect(r.expectedCount).toBe(2));
  it('treats V and M both as valid gender anchors (no sex interpretation)', () => {
    expect(r.records).toHaveLength(2);
    expect(r.records[0]).toMatchObject({ name: 'Apellido, Carlos', age: 45 });
    expect(r.records[1]).toMatchObject({ name: 'Apellida, Diana', age: 47 });
  });
  it('parses the 4-letter "mayo" month', () => {
    expect(r.records[0].rawPhone).toBe('(11) 90000-0014');
  });
});

// --- edge cases: garbage phone, email split across lines, count mismatch ---
describe('parseLcrText — edge cases', () => {
  it('keeps a garbage/over-long phone as rawPhone (repair happens later)', () => {
    const r = parseLcrText('Nome Sexo Idade\nRui, Bar M 88 12 nov 1937 8600000000000000 rui@example.com\n');
    expect(r.records[0].rawPhone).toBe('8600000000000000');
  });
  it('consumes an email split across two lines without leaking into the next name', () => {
    const txt = [
      'Name Gender Age',
      'One, Uno M 23 13 Jan 2003 (11) 90000-0016 fulana.exemplo@gmail',
      '.com',
      'Two, Dos M 26 7 Oct 1999 (11) 90000-0017 dos@example.com',
    ].join('\n');
    const r = parseLcrText(txt);
    expect(r.records).toHaveLength(2);
    expect(r.records[0].name).toBe('One, Uno');
    expect(r.records[1].name).toBe('Two, Dos'); // ".com" continuation not leaked
  });
  it('consumes an uppercase-TLD email continuation ("@HOTMAIL." + "COM")', () => {
    const txt = [
      'Name Gender Age',
      'Alfa, Um M 26 18 Jul 2000 (11) 90000-0018 FULANO@HOTMAIL.',
      'COM',
      'Beta, Dois M 55 25 Dec 1970',
    ].join('\n');
    const r = parseLcrText(txt);
    expect(r.records.map((x) => x.name)).toEqual(['Alfa, Um', 'Beta, Dois']);
  });
  it('surfaces a count mismatch by exposing expectedCount vs records.length', () => {
    const r = parseLcrText('Name Gender Age\nX, Y M 40 1 Jan 1985\nCount: 9\n');
    expect(r.records).toHaveLength(1);
    expect(r.expectedCount).toBe(9); // caller compares → mismatch warning (AC3)
  });

  it('attaches a name that wraps BELOW its anchor row to the right record (post-wrap)', () => {
    // The anchor (M 43 …) sits on the first visual line; the name overflows to the next line.
    const txt = [
      'Nome Sexo Idade',
      'Sobrenome Junior, Alfa M 43 8 jun 1982 (11) 99999-0000 aloisio@example.com',
      'José de', // wrapped tail of the record above — no anchor of its own
      'Seguinte, Maria F 30 1 jan 1990 (11) 98888-0000',
    ].join('\n');
    const r = parseLcrText(txt);
    expect(r.records).toHaveLength(2);
    expect(r.records[0].name).toBe('Sobrenome Junior, Alfa José de');
    expect(r.records[1].name).toBe('Seguinte, Maria');
    // Rule: "Sobrenome, ComeçoDoNome" + "RestoDoNome" → "ComeçoDoNome RestoDoNome Sobrenome".
    expect(lcrNameToFirstLast(r.records[0].name)).toBe('Alfa José de Sobrenome Junior');
  });

  it('handles a no-comma name that wraps below its anchor row', () => {
    // Names are not always "Last, First" — the comma cannot be used to detect a wrapped tail.
    const txt = [
      'Nome Sexo Idade',
      'Ciclana Beltrana M 57 17 jun 1969 (11) 90000-0019 c@example.com',
      'Delta', // wrapped tail, no comma anywhere
      'Outro, Joao M 40 2 fev 1984',
    ].join('\n');
    const r = parseLcrText(txt);
    expect(r.records.map((x) => x.name)).toEqual(['Ciclana Beltrana Delta', 'Outro, Joao']);
  });

  it('reads a wrapped name from a single merged-row line (name + anchor + tail)', () => {
    // The extractor merges a table row's wrapped lines into ONE line in reading order:
    // "<name1> <anchor+data> <name2-tail>". The tail after the contact data joins the name.
    const txt = [
      'Nome Sexo Idade',
      'Sobrenome Junior, Alfa M 43 13 abr 1983 (11) 90000-0020 alfa@example.com José de',
      'Ciclana Beltrana Delta F 35 10 set 1990 (11) 90000-0021 c@example.com de Almeida',
    ].join('\n');
    const r = parseLcrText(txt);
    expect(r.records[0].name).toBe('Sobrenome Junior, Alfa José de');
    expect(lcrNameToFirstLast(r.records[0].name)).toBe('Alfa José de Sobrenome Junior');
    // No comma anywhere — the tail still joins.
    expect(r.records[1].name).toBe('Ciclana Beltrana Delta de Almeida');
    expect(lcrNameToFirstLast(r.records[1].name)).toBe('Ciclana Beltrana Delta de Almeida');
  });

  // Row-grouping joins a record's lines by Y, so an address printed on a line ABOVE the anchor puts
  // its head before the gender token and its wrapped tail after the phone — where name overflow
  // lives. Read as a surname, the tail reached the review screen glued to the name. Every wrap
  // point seen in the reference PDFs is covered; the data below is invented, the SHAPES are real.
  describe.each([
    ['before the dot', 'a.pessoa@gmai', 'l.com'],
    ['after the dot', 'a.pessoa@gmail.', 'com'],
    ['after the dot, uppercase', 'a.pessoa@HOTMAIL.', 'COM'],
    // The nastiest: the head ends in ".co", a real TLD, so it does not look truncated at all.
    ['inside a TLD that is itself valid', 'a.pessoa@gmail.co', 'm'],
    ['mid-TLD', 'a.pessoa@gmail.c', 'om'],
    ['before a country suffix', 'a.pessoa@empresa.com.', 'br'],
  ])('a wrapped email tail (%s)', (_desc, head, tail) => {
    const txt = [
      'Nome Sexo Idade',
      `Exemplo, Fulana ${head} F 26 3 mar 2000 (11) 90000-0001 ${tail}`,
    ].join('\n');

    it('does not become part of the name', () => {
      expect(parseLcrText(txt).records[0].name).toBe('Exemplo, Fulana');
    });

    it('does not cost the record its phone', () => {
      expect(parseLcrText(txt).records[0].rawPhone).toBe('(11) 90000-0001');
    });
  });

  it('keeps name overflow that only LOOKS like an email tail', () => {
    // Two tokens cannot be one wrapped address, and a Capitalized word is not a TLD fragment —
    // both must survive, or the fix would silently truncate long names.
    const txt = [
      'Nome Sexo Idade',
      'Exemplo, Fulana f@exemplo.com F 43 13 abr 1983 (11) 90000-0002 Sobrenome de',
      'Outro, Beltrano b@exemplo.com M 35 10 set 1990 (11) 90000-0003 Sobrenome',
    ].join('\n');
    const r = parseLcrText(txt);

    expect(r.records.map((x) => x.name)).toEqual([
      'Exemplo, Fulana Sobrenome de',
      'Outro, Beltrano Sobrenome',
    ]);
  });

  it('strips email/phone residue that interleaves into a name', () => {
    const txt = [
      'Nome Sexo Idade',
      'Santos, Brenda M 20 1 jan 2005 fulana.exemplo@gmail Almeida .com',
      'Leal, Rui M 88 12 nov 1937 860590019568983',
    ].join('\n');
    const r = parseLcrText(txt);
    expect(r.records[0].name).toBe('Santos, Brenda Almeida'); // email token + ".com" dropped
    expect(r.records[1].name).toBe('Leal, Rui'); // 15-digit garbage phone dropped from the name
  });

  it('still joins a pre-wrap name (name lines BEFORE an anchor with no name of its own)', () => {
    const txt = [
      'Nome Sexo Idade',
      'Curto, Bruno M 26 4 out 1999 (11) 90000-0000', // record 0 names itself
      'Sobrenome, Alfa', // pre-wrap name for record 1 …
      'Beta Gama', // … continued …
      'M 8 26 jul 2018 alfa@example.com', // … resolved by an anchor line with no name
    ].join('\n');
    const r = parseLcrText(txt);
    expect(r.records.map((x) => x.name)).toEqual(['Curto, Bruno', 'Sobrenome, Alfa Beta Gama']);
  });
});

describe('lcrNameToFirstLast — Rule 1 (AC4)', () => {
  it('reorders "Last, First" to "First Last"', () => {
    expect(lcrNameToFirstLast('Sobrenome, Alfa Beta')).toBe('Alfa Beta Sobrenome');
  });
  it('preserves lowercase particles in the surname', () => {
    expect(lcrNameToFirstLast('de Oliveira, Fernando')).toBe('Fernando de Oliveira');
  });
  it('preserves accents and capitalization', () => {
    expect(lcrNameToFirstLast('Apellido, Félix José')).toBe('Félix José Apellido');
  });
  it('leaves a no-comma name as-is (already First Last)', () => {
    expect(lcrNameToFirstLast('Greg Exemplo')).toBe('Greg Exemplo');
  });
  it('collapses extra whitespace and splits on the first comma only', () => {
    expect(lcrNameToFirstLast('  Sobrenome  Beta  dos ,  Renata  ')).toBe('Renata Sobrenome Beta dos');
  });
  it('handles a missing first or last gracefully', () => {
    expect(lcrNameToFirstLast('Solo,')).toBe('Solo');
    expect(lcrNameToFirstLast(', OnlyFirst')).toBe('OnlyFirst');
  });
});
