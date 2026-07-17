'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import type { FieldVerdict, Verdict } from '@/lib/verdict/types';
import type { Extraction } from '@/lib/extraction/schema';
import styles from './page.module.css';

interface VerifyResponse {
  overall: Verdict;
  verdicts: FieldVerdict[];
  extraction: Extraction | null;
  meta: { latencyMs: number; source: string; cached: boolean; error: string | null };
}

/** Verdict presentation — colour AND icon AND text, never colour alone (WCAG 1.4.1). */
const VERDICT: Record<Verdict, { icon: string; word: string; cls: string }> = {
  PASS: { icon: '✓', word: 'Pass', cls: styles.pass },
  FLAG: { icon: '⚑', word: 'Review', cls: styles.flag },
  FAIL: { icon: '✗', word: 'Fail', cls: styles.fail },
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [brand, setBrand] = useState('');
  const [classType, setClassType] = useState('');
  const [abv, setAbv] = useState('');
  const [netContents, setNetContents] = useState('');
  const [bottler, setBottler] = useState('');
  const [country, setCountry] = useState('');
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  function chooseFile(f: File | null) {
    setFile(f);
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return f ? URL.createObjectURL(f) : null;
    });
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f && f.type.startsWith('image/')) chooseFile(f);
    else if (f) setError('That file is not an image. Use PNG, JPEG, WebP, or GIF.');
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError('Please choose a label image first.');
      return;
    }
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const body = new FormData();
      body.set('image', file);
      body.set('brand_name', brand);
      body.set('class_type', classType);
      body.set('alcohol_content', abv);
      body.set('net_contents', netContents);
      body.set('producer_bottler', bottler);
      body.set('country_of_origin', country);
      const res = await fetch('/api/verify', { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? 'Something went wrong checking the label.');
      else {
        setResult(data as VerifyResponse);
        requestAnimationFrame(() => resultsRef.current?.focus());
      }
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.sheet}>
      <header className={styles.docHead}>
        <p className={styles.kicker}>Official prototype · TTB Compliance Division</p>
        <h1 className={styles.docTitle}>Label Verification Worksheet</h1>
        <p className={styles.docMeta}>
          27 CFR Parts 5 &amp; 16 · Distilled spirits · <Link href="/batch">batch review →</Link>
        </p>
        <hr className={styles.ruleDouble} />
      </header>

      <form onSubmit={onSubmit} className={styles.section}>
        <h2 className={styles.secHead}>
          <span className={styles.secNo}>§ 1</span> Label &amp; application
        </h2>

        <div
          className={`${styles.dropzone} ${dragging ? styles.dragging : ''} ${preview ? styles.hasPreview : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- local object URL, not a remote asset
            <img src={preview} alt="Selected label preview" className={styles.preview} />
          ) : (
            <div className={styles.dropPrompt}>
              <span className={styles.dropIcon} aria-hidden="true">
                ▸
              </span>
              Drag label image here, or
            </div>
          )}
          <input
            id="image"
            name="image"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={(e) => chooseFile(e.target.files?.[0] ?? null)}
            className={styles.srOnly}
            aria-describedby="image-hint"
          />
          <label htmlFor="image" className={styles.bracketBtn}>
            {file ? '[ Change file ]' : '[ Select file ]'}
          </label>
          <p id="image-hint" className={styles.hint}>
            {file ? file.name : 'PNG · JPEG · WebP · GIF'}
          </p>
        </div>

        <div className={styles.declared}>
          <div className={styles.row}>
            <label htmlFor="brand" className={styles.rowLabel}>Brand name</label>
            <input id="brand" className={styles.blank} value={brand}
              onChange={(e) => setBrand(e.target.value)} placeholder="Stone's Throw" />
          </div>
          <div className={styles.row}>
            <label htmlFor="classType" className={styles.rowLabel}>Class / type</label>
            <input id="classType" className={styles.blank} value={classType}
              onChange={(e) => setClassType(e.target.value)} placeholder="Kentucky Straight Bourbon Whiskey" />
          </div>
          <div className={styles.row}>
            <label htmlFor="abv" className={styles.rowLabel}>Alcohol content</label>
            <input id="abv" className={styles.blank} value={abv}
              onChange={(e) => setAbv(e.target.value)} placeholder="45%" inputMode="decimal" />
          </div>
          <div className={styles.row}>
            <label htmlFor="netContents" className={styles.rowLabel}>Net contents</label>
            <input id="netContents" className={styles.blank} value={netContents}
              onChange={(e) => setNetContents(e.target.value)} placeholder="750 mL" />
          </div>
          <div className={styles.row}>
            <label htmlFor="bottler" className={styles.rowLabel}>Producer / bottler</label>
            <input id="bottler" className={styles.blank} value={bottler}
              onChange={(e) => setBottler(e.target.value)} placeholder="Stone's Throw Distillery, Louisville, KY" />
          </div>
          <div className={styles.row}>
            <label htmlFor="country" className={styles.rowLabel}>Country of origin</label>
            <input id="country" className={styles.blank} value={country}
              onChange={(e) => setCountry(e.target.value)} placeholder="(imports only)" />
          </div>
        </div>

        <div className={styles.submitRow}>
          <button type="submit" className={styles.submit} disabled={loading} aria-busy={loading}>
            {loading ? 'Checking…' : 'Verify label'}
          </button>
        </div>
        {error && <p role="alert" className={styles.error}>{error}</p>}
      </form>

      <section className={styles.section} aria-labelledby="findings-head" aria-live="polite" aria-busy={loading}>
        <h2 id="findings-head" className={styles.secHead}>
          <span className={styles.secNo}>§ 2</span> Findings
        </h2>
        <div ref={resultsRef} tabIndex={-1}>
          {!result && !loading && (
            <p className={styles.empty}>— Awaiting a label. Attach one above and select “Verify label”.</p>
          )}
          {loading && <p className={styles.empty}>Reading the label…</p>}
          {result && <Results data={result} />}
        </div>
      </section>
    </div>
  );
}

function Results({ data }: { data: VerifyResponse }) {
  const v = VERDICT[data.overall];
  const attention = data.verdicts.filter((x) => x.verdict !== 'PASS').length;
  const summary =
    data.overall === 'PASS'
      ? 'All checks passed'
      : `${attention} of ${data.verdicts.length} checks need attention`;
  return (
    <>
      <div className={styles.overall} role="status">
        <span className={`${styles.overallSym} ${v.cls}`} aria-hidden="true">{v.icon}</span>
        <span className={styles.overallWord}>{v.word}</span>
        <span className={styles.overallSummary}>{summary}</span>
      </div>

      <p className={styles.meta}>
        Read in {data.meta.latencyMs} ms
        {data.meta.cached && <span className={styles.cachePill}>cached</span>} · source: {data.meta.source}
        {data.meta.source === 'mock' && ' (sample data — no live model)'}
      </p>

      <ol className={styles.findings}>
        {data.verdicts.map((fv) => {
          const c = VERDICT[fv.verdict];
          return (
            <li key={fv.check} className={styles.finding}>
              <span className={`${styles.sym} ${c.cls}`} aria-hidden="true">{c.icon}</span>
              <div className={styles.fbody}>
                <div className={styles.fhead}>
                  <span className={styles.flabel}>{fv.label}</span>
                  <span className={`${styles.tag} ${c.cls}`}>{c.word}</span>
                </div>
                {(fv.declared != null || fv.extracted != null) && (
                  <p className={styles.compare}>
                    {fv.declared != null && <>Application: <b>{String(fv.declared)}</b>. </>}
                    {fv.extracted != null && <>Label: <b>{String(fv.extracted)}</b>.</>}
                  </p>
                )}
                <p className={styles.reason}>{fv.reason}</p>
                {fv.citation && (
                  <p className={styles.citation}>
                    <a href={fv.citation.authority} target="_blank" rel="noopener noreferrer">
                      {fv.citation.section} ↗
                    </a>{' '}
                    — {fv.citation.plainLanguage}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );
}
