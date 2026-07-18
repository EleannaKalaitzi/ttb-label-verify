'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { FieldVerdict, Verdict } from '@/lib/verdict/types';
import styles from './batch.module.css';

interface BatchItem {
  index: number;
  filename: string;
  status: 'pending' | 'done';
  overall: Verdict | null;
  verdicts: FieldVerdict[];
  error: string | null;
}
interface BatchJob {
  id: string;
  total: number;
  completed: number;
  status: 'running' | 'done';
  items: BatchItem[];
}

const VERDICT: Record<Verdict, { icon: string; word: string; cls: string }> = {
  PASS: { icon: '✓', word: 'Pass', cls: styles.pass },
  FLAG: { icon: '⚑', word: 'Review', cls: styles.flag },
  FAIL: { icon: '✗', word: 'Fail', cls: styles.fail },
};
const SEVERITY: Record<Verdict, number> = { FAIL: 0, FLAG: 1, PASS: 2 };

export default function Batch() {
  const [files, setFiles] = useState<File[]>([]);
  const [job, setJob] = useState<BatchJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [sampleMode, setSampleMode] = useState(false);
  const [previews, setPreviews] = useState<Map<string, string>>(new Map());
  const [expanded, setExpanded] = useState<BatchItem | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Drive the native <dialog> from state so it gets Escape-to-close, a backdrop,
  // and focus handling for free.
  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (expanded && !d.open) d.showModal();
    else if (!expanded && d.open) d.close();
  }, [expanded]);

  // Object URLs for uploaded files, so each finding can show a thumbnail without
  // the image ever being sent back or stored server-side. Revoked on change.
  useEffect(() => {
    const m = new Map<string, string>();
    for (const f of files) m.set(f.name, URL.createObjectURL(f));
    setPreviews(m);
    return () => {
      for (const url of m.values()) URL.revokeObjectURL(url);
    };
  }, [files]);

  // Sample labels are static files in public/samples; uploaded labels use their
  // local object URL (never sent back to the server).
  function thumbSrc(filename: string): string | undefined {
    return sampleMode ? `/samples/${encodeURIComponent(filename)}` : previews.get(filename);
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    setFiles(Array.from(list).filter((f) => f.type.startsWith('image/')));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (files.length === 0) {
      setError('Choose one or more label images first.');
      return;
    }
    setError(null);
    setJob(null);
    setSampleMode(false);
    const body = new FormData();
    for (const f of files) body.append('images', f);
    try {
      const res = await fetch('/api/batch', { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Could not start the batch.');
        return;
      }
      poll(data.jobId as string);
    } catch {
      setError('Could not reach the server. Please try again.');
    }
  }

  async function loadSample() {
    setError(null);
    setJob(null);
    setSampleMode(true);
    try {
      const res = await fetch('/api/batch/sample', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Could not load the sample labels.');
        return;
      }
      poll(data.jobId as string);
    } catch {
      setError('Could not reach the server. Please try again.');
    }
  }

  function poll(jobId: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    const tick = async () => {
      const res = await fetch(`/api/batch/${jobId}`);
      if (!res.ok) return;
      const data = (await res.json()) as BatchJob;
      setJob(data);
      if (data.status === 'done' && pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
    void tick();
    pollRef.current = setInterval(tick, 1500);
  }

  const attention = job
    ? job.items
        .filter((i) => i.status === 'done' && i.overall !== 'PASS')
        .sort((a, b) => SEVERITY[a.overall ?? 'FLAG'] - SEVERITY[b.overall ?? 'FLAG'])
    : [];
  const passItems = job ? job.items.filter((i) => i.overall === 'PASS') : [];
  const expandedSrc = expanded ? thumbSrc(expanded.filename) : undefined;

  return (
    <div className={styles.sheet}>
      <header className={styles.docHead}>
        <div className={styles.headRow}>
          <div>
            <p className={styles.kicker}>Official prototype · TTB Compliance Division</p>
            <h1 className={styles.docTitle}>Batch Label Review</h1>
          </div>
          <Link href="/" className={styles.navBtn}>
            <span className={styles.navIcon} aria-hidden="true">▭</span>
            <span>Single label</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
        <p className={styles.docMeta}>Alcohol beverages</p>
        <hr className={styles.ruleDouble} />
      </header>

      <form onSubmit={onSubmit} className={styles.section}>
        <h2 className={styles.secHead}>
          <span className={styles.secNo}>§ 1</span> Upload labels
        </h2>
        <div
          className={`${styles.dropzone} ${dragging ? styles.dragging : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            addFiles(e.dataTransfer.files);
          }}
        >
          <span className={styles.dropPrompt}>▸ Drag label images here, or</span>
          <input id="images" type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple
            className={styles.srOnly} onChange={(e) => addFiles(e.target.files)} />
          <label htmlFor="images" className={styles.bracketBtn}>[ Select files ]</label>
          <p className={styles.hint}>{files.length > 0 ? `${files.length} label(s) selected` : 'Up to 300 · PNG · JPEG · WebP · GIF'}</p>
        </div>
        <div className={styles.submitRow}>
          <button type="submit" className={styles.submit} disabled={job?.status === 'running'}>
            {job?.status === 'running' ? 'Screening…' : 'Screen batch'}
          </button>
          <button
            type="button"
            className={styles.sampleBtn}
            onClick={loadSample}
            disabled={job?.status === 'running'}
          >
            <span className={styles.sampleIcon} aria-hidden="true">▤</span> Load sample labels
          </button>
        </div>
        <p className={styles.sampleHint}>
          No labels handy? Load the built-in sample set to see the results view instantly.
        </p>
        {error && <p role="alert" className={styles.error}>{error}</p>}
      </form>

      <section className={styles.section} aria-live="polite">
        <h2 className={styles.secHead}>
          <span className={styles.secNo}>§ 2</span> Findings
        </h2>

        {!job && <p className={styles.empty}>— Upload labels and screen, or load the sample set above.</p>}

        {job && (
          <>
            <div className={styles.progress}>
              {job.status === 'running'
                ? `Screening ${job.completed} / ${job.total}…`
                : `Done — ${job.total} label(s) screened.`}
              {job.status === 'done' && (
                <a className={styles.csvBtn} href={`/api/batch/${job.id}/csv`} download>
                  ↓ Download CSV
                </a>
              )}
            </div>
            <div className={styles.progressBar} aria-hidden="true">
              <div className={styles.progressFill} style={{ width: `${(job.completed / job.total) * 100}%` }} />
            </div>

            {job.status === 'done' && (
              <p className={styles.summary}>
                {attention.length === 0
                  ? 'All labels are compliant on their own terms.'
                  : `${attention.length} of ${job.total} need your attention.`}
              </p>
            )}

            <ol className={styles.itemList}>
              {attention.map((item) => {
                const src = thumbSrc(item.filename);
                return (
                  <li key={item.index} className={styles.item}>
                    {src ? (
                      <button type="button" className={styles.thumbBtn} onClick={() => setExpanded(item)} title="Expand this label">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img className={styles.thumb} src={src} alt={`Label image: ${item.filename}`} />
                      </button>
                    ) : (
                      <div className={styles.thumbEmpty} aria-hidden="true">no image</div>
                    )}
                    <div className={styles.itemBody}>
                      <div className={styles.itemHead}>
                        <span className={`${styles.sym} ${VERDICT[item.overall ?? 'FLAG'].cls}`} aria-hidden="true">
                          {VERDICT[item.overall ?? 'FLAG'].icon}
                        </span>
                        <span className={styles.filename}>{item.filename}</span>
                        <span className={`${styles.tag} ${VERDICT[item.overall ?? 'FLAG'].cls}`}>
                          {VERDICT[item.overall ?? 'FLAG'].word}
                        </span>
                        <button type="button" className={styles.expandBtn} onClick={() => setExpanded(item)}>
                          <span aria-hidden="true">⤢</span> Expand
                        </button>
                      </div>
                      <ul className={styles.reasons}>
                        {item.verdicts
                          .filter((v) => v.verdict !== 'PASS')
                          .map((v) => (
                            <li key={v.check}>
                              <b>{v.label}:</b> {v.reason}{' '}
                              {v.citation && (
                                <a href={v.citation.authority} target="_blank" rel="noopener noreferrer">
                                  {v.citation.section} ↗
                                </a>
                              )}
                            </li>
                          ))}
                      </ul>
                    </div>
                  </li>
                );
              })}
            </ol>

            {passItems.length > 0 && (
              <details className={styles.passDisclosure}>
                <summary>{passItems.length} clean label(s) — compliant. Expand any to see why.</summary>
                <ul className={styles.passList}>
                  {passItems.map((item) => {
                    const src = thumbSrc(item.filename);
                    return (
                      <li key={item.index} className={styles.passItem}>
                        {src ? (
                          <button type="button" className={styles.passThumbBtn} onClick={() => setExpanded(item)} title="Expand this label">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img className={styles.passThumb} src={src} alt={`Label image: ${item.filename}`} />
                          </button>
                        ) : (
                          <span className={`${styles.sym} ${styles.pass}`} aria-hidden="true">✓</span>
                        )}
                        <span className={styles.passName}>{item.filename}</span>
                        <button type="button" className={styles.expandBtn} onClick={() => setExpanded(item)}>
                          <span aria-hidden="true">⤢</span> Why it passed
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </details>
            )}
          </>
        )}
      </section>

      <dialog
        ref={dialogRef}
        className={styles.modal}
        onClose={() => setExpanded(null)}
        onClick={(e) => {
          if (e.target === dialogRef.current) setExpanded(null);
        }}
      >
        {expanded && (
          <div className={styles.modalInner}>
            <div className={styles.modalHead}>
              <span className={`${styles.sym} ${VERDICT[expanded.overall ?? 'FLAG'].cls}`} aria-hidden="true">
                {VERDICT[expanded.overall ?? 'FLAG'].icon}
              </span>
              <span className={styles.modalTitle}>{expanded.filename}</span>
              <span className={`${styles.tag} ${VERDICT[expanded.overall ?? 'FLAG'].cls}`}>
                {VERDICT[expanded.overall ?? 'FLAG'].word}
              </span>
              <button type="button" className={styles.modalClose} onClick={() => setExpanded(null)} aria-label="Close">
                ✕
              </button>
            </div>
            {expandedSrc && (
              // eslint-disable-next-line @next/next/no-img-element
              <img className={styles.modalImg} src={expandedSrc} alt={`Label image: ${expanded.filename}`} />
            )}
            <ul className={styles.modalFindings}>
              {expanded.verdicts.map((v) => (
                <li key={v.check} className={styles.modalFinding}>
                  <span className={`${styles.sym} ${VERDICT[v.verdict].cls}`} aria-hidden="true">
                    {VERDICT[v.verdict].icon}
                  </span>
                  <div>
                    <b>{v.label}</b> — {v.reason}{' '}
                    {v.citation && (
                      <a href={v.citation.authority} target="_blank" rel="noopener noreferrer">
                        {v.citation.section} ↗
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </dialog>
    </div>
  );
}
