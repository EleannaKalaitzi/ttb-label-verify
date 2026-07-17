'use client';

import { useRef, useState } from 'react';
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
  FLAG: { icon: '⚑', word: 'Needs your review', cls: styles.flag },
  FAIL: { icon: '✗', word: 'Fail', cls: styles.fail },
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [brand, setBrand] = useState('');
  const [classType, setClassType] = useState('');
  const [abv, setAbv] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return f ? URL.createObjectURL(f) : null;
    });
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
      const res = await fetch('/api/verify', { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong checking the label.');
      } else {
        setResult(data as VerifyResponse);
        // Move focus to the results so keyboard/screen-reader users land there.
        requestAnimationFrame(() => resultsRef.current?.focus());
      }
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1 className={styles.title}>TTB Label Verification</h1>
        <p className={styles.subtitle}>
          Check a distilled-spirits label against its application and the federal labeling
          rules. Every result shows its reason and its regulation.
        </p>
      </header>

      <div className={styles.columns}>
        {/* ---- Inputs ---- */}
        <section className={styles.panel} aria-labelledby="inputs-heading">
          <h2 id="inputs-heading" className={styles.panelHeading}>
            1. The label &amp; its application
          </h2>
          <form onSubmit={onSubmit} className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="image" className={styles.label}>
                Label image
              </label>
              <input
                id="image"
                name="image"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={onFileChange}
                className={styles.fileInput}
                aria-describedby="image-hint"
              />
              <p id="image-hint" className={styles.hint}>
                A photo or scan of the label. PNG, JPEG, WebP, or GIF.
              </p>
              {preview && (
                // eslint-disable-next-line @next/next/no-img-element -- local object URL, not a remote asset
                <img src={preview} alt="Selected label preview" className={styles.preview} />
              )}
            </div>

            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>Declared on the application</legend>

              <div className={styles.field}>
                <label htmlFor="brand" className={styles.label}>Brand name</label>
                <input id="brand" className={styles.input} value={brand}
                  onChange={(e) => setBrand(e.target.value)} placeholder="e.g. Stone's Throw" />
              </div>

              <div className={styles.field}>
                <label htmlFor="classType" className={styles.label}>Class / type</label>
                <input id="classType" className={styles.input} value={classType}
                  onChange={(e) => setClassType(e.target.value)}
                  placeholder="e.g. Kentucky Straight Bourbon Whiskey" />
              </div>

              <div className={styles.field}>
                <label htmlFor="abv" className={styles.label}>Alcohol content</label>
                <input id="abv" className={styles.input} value={abv}
                  onChange={(e) => setAbv(e.target.value)} placeholder="e.g. 45%"
                  inputMode="decimal" />
              </div>
            </fieldset>

            <button type="submit" className={styles.submit} disabled={loading} aria-busy={loading}>
              {loading ? 'Checking…' : 'Check this label'}
            </button>

            {error && (
              <p role="alert" className={styles.error}>{error}</p>
            )}
          </form>
        </section>

        {/* ---- Results ---- */}
        <section
          className={styles.panel}
          aria-labelledby="results-heading"
          aria-live="polite"
          aria-busy={loading}
        >
          <h2 id="results-heading" className={styles.panelHeading}>2. Result</h2>
          <div ref={resultsRef} tabIndex={-1} className={styles.resultsBody}>
            {!result && !loading && (
              <p className={styles.placeholder}>
                Choose a label and select “Check this label” to see the verdict.
              </p>
            )}
            {loading && <p className={styles.placeholder}>Reading the label…</p>}
            {result && <Results data={result} />}
          </div>
        </section>
      </div>
    </main>
  );
}

function Results({ data }: { data: VerifyResponse }) {
  const v = VERDICT[data.overall];
  return (
    <>
      <div className={`${styles.overall} ${v.cls}`} role="status">
        <span className={styles.overallIcon} aria-hidden="true">{v.icon}</span>
        <span className={styles.overallWord}>{v.word}</span>
      </div>

      <p className={styles.meta}>
        Read in {data.meta.latencyMs} ms
        {data.meta.cached && ' (from cache)'} · source: {data.meta.source}
        {data.meta.source === 'mock' && ' — sample data, no live model'}
      </p>

      <ol className={styles.verdictList}>
        {data.verdicts.map((fv) => {
          const c = VERDICT[fv.verdict];
          return (
            <li key={fv.check} className={styles.verdictItem}>
              <span className={`${styles.chip} ${c.cls}`}>
                <span aria-hidden="true">{c.icon}</span> {c.word}
              </span>
              <div className={styles.verdictBody}>
                <p className={styles.verdictLabel}>{fv.label}</p>
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
                      {fv.citation.section}
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
