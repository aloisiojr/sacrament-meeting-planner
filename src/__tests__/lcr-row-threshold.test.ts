/**
 * Grouping visual lines into member records (specs/pdf-import-three-line-names.md).
 *
 * The fixtures are COMPLETE gap histograms measured from the ward PDFs with the same pdfjs the app
 * uses — every gap, including the ones seen once. They are plain numbers on purpose: the PDFs carry
 * members' names, phones and e-mails and are not in the repository.
 *
 * Completeness matters here. An earlier version of this fix passed its tests and still merged
 * records on the real files, because the fixture was a hand-picked subset of the histogram.
 */
import { rowGapThreshold, groupIntoRows, ROW_GAP_THRESHOLD_JS } from '../lib/lcrPdfLayout';

type Pdf = { file: string; separator: number; largestInside: number; gaps: [number, number][] };

/** Every LCR PDF shared so far: three wards, pt-BR / en-US / es-LA. */
const ALL_PDFS: Pdf[] = [
  { file: 'LCR-sample-en', separator: 19, largestInside: 13,
    gaps: [[6,481],[7,69],[12,15],[13,2],[19,505],[20,1],[22,13],[25,2],[26,3],[28,2],[29,2],[30,4],[31,2],[33,2],[34,1],[36,1],[41,1]] },
  { file: 'LCR-sample-es', separator: 19, largestInside: 13,
    gaps: [[6,528],[7,64],[12,13],[13,3],[19,494],[20,9],[22,14],[25,4],[28,1],[30,3],[31,1],[32,1],[33,1],[34,2],[36,2],[37,1],[41,3],[42,2],[436,1]] },
  { file: 'LCR-sample', separator: 19, largestInside: 13,
    gaps: [[6,528],[7,64],[12,13],[13,3],[19,494],[20,9],[22,14],[25,4],[28,1],[30,3],[31,1],[32,1],[33,1],[34,2],[36,2],[37,1],[41,3],[42,2],[436,1]] },
  // One single gap of 13 — filtering it out as noise put the threshold one step from splitting it.
  { file: 'Membros Ala Panamby', separator: 19, largestInside: 13,
    gaps: [[6,367],[7,47],[12,3],[13,1],[19,349],[20,5],[22,12],[25,1],[29,2],[30,4],[31,2],[33,1],[36,1],[41,2],[42,2],[292,1]] },
  { file: 'giovanni-membros', separator: 19, largestInside: 13,
    gaps: [[6,398],[7,58],[12,11],[13,2],[19,358],[20,3],[22,9],[24,2],[25,1],[27,1],[28,3],[30,1],[31,2],[33,2],[34,1],[35,1],[36,1],[608,1]] },
  { file: 'pdf-sample', separator: 19, largestInside: 13,
    gaps: [[6,374],[7,54],[12,10],[13,3],[19,359],[20,2],[22,9],[24,1],[25,1],[27,1],[30,2],[31,3],[34,1],[35,3],[40,1],[41,1],[42,1],[736,1]] },
  { file: 'print (1) copy', separator: 19, largestInside: 13,
    gaps: [[6,398],[7,58],[12,11],[13,2],[19,358],[20,3],[22,9],[24,2],[25,1],[27,1],[28,3],[30,1],[31,2],[33,2],[34,1],[35,1],[36,1],[608,1]] },
  { file: 'print (1)', separator: 19, largestInside: 12,
    gaps: [[6,322],[7,40],[12,4],[19,311],[20,7],[22,10],[25,1],[28,1],[29,1],[30,1],[31,1],[34,2],[36,1],[37,2],[40,2],[42,2],[611,1]] },
];

const histogram = (pdf: Pdf) => new Map(pdf.gaps);

describe('every LCR PDF shared so far', () => {
  it.each(ALL_PDFS)('$file: the threshold separates the two clusters', (pdf) => {
    const thr = rowGapThreshold(histogram(pdf));

    // Below the largest inside gap it cuts a person in half; at or above the separator it merges
    // neighbours into one. Both failures were produced by earlier versions of this very function.
    expect(thr).toBeGreaterThan(pdf.largestInside);
    expect(thr).toBeLessThan(pdf.separator);
  });

  it.each(ALL_PDFS)('$file: the copy injected into the WebView agrees', (pdf) => {
    const injected = new Function(
      `${ROW_GAP_THRESHOLD_JS}; return rowGapThreshold;`
    )() as typeof rowGapThreshold;

    expect(injected(histogram(pdf))).toBe(rowGapThreshold(histogram(pdf)));
  });
});

describe('rowGapThreshold', () => {
  it('keeps working on the simple two-spacing PDF', () => {
    const thr = rowGapThreshold(new Map([[6, 300], [19, 300]]));

    expect(thr).toBeGreaterThan(6);
    expect(thr).toBeLessThan(19);
  });

  it('ignores one-off gaps when picking the separator', () => {
    // A single huge gap (a page seam) must not be mistaken for the record pitch.
    expect(rowGapThreshold(new Map([[6, 300], [19, 300], [612, 1]]))).toBeLessThan(19);
  });

  it('still respects a one-off gap INSIDE a record', () => {
    // Panamby's shape: the only 13 in that file appears once, and it is inside a record.
    expect(rowGapThreshold(new Map([[6, 300], [12, 3], [13, 1], [19, 300]]))).toBeGreaterThan(13);
  });

  it('does not guess when there is nothing to infer from', () => {
    expect(rowGapThreshold(new Map())).toBe(Infinity);
    expect(rowGapThreshold(new Map([[19, 40]]))).toBe(Infinity);
  });
});

describe('groupIntoRows', () => {
  /** Page 8 of pdf-sample, around the three-line record. Top → bottom. */
  const PAGE_8 = [353, 334, 322, 310, 291, 278, 266, 247];

  it('keeps a three-line record together', () => {
    const rows = groupIntoRows(PAGE_8, rowGapThreshold(histogram(ALL_PDFS[5])));

    // 291 starts the name, 278 carries the data, 266 is the rest of the name.
    expect(rows).toContainEqual([291, 278, 266]);
    expect(rows).toContainEqual([334, 322, 310]);
    expect(rows).toContainEqual([247]);
  });

  it('the old threshold is what split that record in two', () => {
    const rows = groupIntoRows(PAGE_8, 12.5);

    expect(rows).toContainEqual([291]); // name with no data
    expect(rows).toContainEqual([278, 266]); // data under the wrong name
  });

  it('breaks at a gap EXACTLY on the threshold, like the extractor does', () => {
    // The extractor splits on `>=`. While this helper used `>`, the check script could call a file
    // clean when the app would split a record inside it.
    expect(groupIntoRows([100, 84], 16)).toEqual([[100], [84]]);
    expect(groupIntoRows([100, 85], 16)).toEqual([[100, 85]]);
  });
});
