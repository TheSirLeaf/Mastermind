// components/Timeline/Timeline.tsx
// Linha do tempo das animações de entrada do slide atual (ou do elemento selecionado).
import {
  ANIMATION_DEFAULTS,
  animationDuration,
  animationPatch,
  normalizeAnimation,
  type ElementAnimation,
} from '@packages/core/animation';
import { keyframesEnd, keyframesPatch, type Keyframe } from '@packages/core/keyframes';
import type { PackageTimelineEvent } from '@packages/core/types';
import { itemAt, useDeckStore } from '@store/deckStore';
import { useUIStore } from '@stores/uiStore';
import { clsx } from 'clsx';
import { Link2, Play, Plus, Square } from 'lucide-react';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';

import { shinePatch } from '../../editor/elementFx';
import { type TextShine } from '../../editor/textFx';
import { RenameLabel } from '../common/RenameLabel';
import { Tooltip } from '../common/Tooltip';
import { updatePackageSpec } from '../Inspector/packageSpec';

import {
  comparePaths,
  KIND_COLORS,
  KIND_LABELS,
  SHINE_SWEEP,
  SHINE_COLOR,
  SNAP,
  labelOf,
  collectTracks,
  collectPackageTracks,
  collectShineTracks,
  collectKeyframeTracks,
  packageEvents,
  elementAt,
  round,
  fmt,
  keyframeTextSummary,
  type Track,
  type PackageTrack,
  type ElementGroup,
  type ShineTrack,
  type ShineDrag,
  type KeyframeTrack,
  type KeyframeDrag,
  type Scope,
  type PackageDrag,
  type DragState,
} from './timelineModel';

export function Timeline() {
  const deck = useDeckStore((state) => state.deck);
  const currentIndex = useDeckStore((state) => state.currentIndex);
  const selection = useDeckStore((state) => state.selection);
  const [scope, setScope] = useState<Scope>('slide');
  const [time, setTime] = useState<number | null>(null);
  const [draft, setDraft] = useState<Record<string, ElementAnimation>>({});
  const trackAreaRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const pkgDragRef = useRef<PackageDrag | null>(null);
  const [pkgDraft, setPkgDraft] = useState<Record<string, Record<string, unknown>>>({});
  const rafRef = useRef<number | null>(null);

  const slide = itemAt(deck, currentIndex);
  const html = slide?.html ?? '';
  const selectedKey = selection ? selection.path.join('.') : null;

  const allTracks = useMemo(() => collectTracks(html, currentIndex), [html, currentIndex]);

  const tracks = useMemo(() => {
    if (scope === 'slide' || !selection) return allTracks;
    const prefix = `${selection.path.join('.')}`;
    const inSelection = allTracks.filter(
      (track) => track.key === prefix || track.key.startsWith(`${prefix}.`)
    );
    if (inSelection.some((track) => track.key === prefix)) return inSelection;
    const element = elementAt(html, selection.path);
    if (!element) return inSelection;
    // O elemento selecionado entra na lista mesmo sem animação, para poder animá-lo.
    return [
      {
        path: selection.path,
        key: prefix,
        label: selection.label || labelOf(element),
        depth: 0,
        animation: null,
      },
      ...inSelection,
    ];
  }, [allTracks, scope, selection, html]);

  const allPkgTracks = useMemo(
    () => collectPackageTracks(html, currentIndex),
    [html, currentIndex]
  );
  const pkgTracks = useMemo(() => {
    if (scope === 'slide' || !selection) return allPkgTracks;
    const prefix = selection.path.join('.');
    return allPkgTracks.filter((t) => t.key === prefix || t.key.startsWith(`${prefix}.`));
  }, [allPkgTracks, scope, selection]);
  const activeKeyframe = useUIStore((state) => state.activeKeyframe);
  const allKfTracks = useMemo(
    () => collectKeyframeTracks(html, currentIndex),
    [html, currentIndex]
  );
  const kfTracks = useMemo(() => {
    if (scope === 'slide' || !selection) return allKfTracks;
    const prefix = selection.path.join('.');
    return allKfTracks.filter((t) => t.key === prefix || t.key.startsWith(`${prefix}.`));
  }, [allKfTracks, scope, selection]);
  const allShineTracks = useMemo(
    () => collectShineTracks(html, currentIndex),
    [html, currentIndex]
  );
  const shineTracks = useMemo(() => {
    if (scope === 'slide' || !selection) return allShineTracks;
    const prefix = selection.path.join('.');
    return allShineTracks.filter((t) => t.key === prefix || t.key.startsWith(`${prefix}.`));
  }, [allShineTracks, scope, selection]);
  const [shineDraft, setShineDraft] = useState<Record<string, TextShine>>({});
  const shineDragRef = useRef<ShineDrag | null>(null);
  const shineOf = (track: ShineTrack): TextShine => shineDraft[track.key] ?? track.shine;
  const [kfDraft, setKfDraft] = useState<Record<string, Keyframe[]>>({});
  const kfDragRef = useRef<KeyframeDrag | null>(null);
  const kfsOf = (track: KeyframeTrack): Keyframe[] => kfDraft[track.key] ?? track.kfs;

  const specOf = (track: PackageTrack): Record<string, unknown> =>
    pkgDraft[track.key] ?? track.spec;

  const effective = (track: Track): ElementAnimation | null => draft[track.key] ?? track.animation;

  // Um elemento com mais de uma ocorrência (entrada + digitação, por exemplo) vira um bloco só.
  const groups = useMemo(() => {
    const byKey = new Map<string, ElementGroup>();
    for (const track of tracks) {
      byKey.set(track.key, { key: track.key, path: track.path, label: track.label, anim: track });
    }
    for (const pkg of pkgTracks) {
      const found = byKey.get(pkg.key);
      if (found) found.pkg = pkg;
      else byKey.set(pkg.key, { key: pkg.key, path: pkg.path, label: pkg.label, pkg });
    }
    for (const kf of kfTracks) {
      const found = byKey.get(kf.key);
      if (found) found.kf = kf;
      else byKey.set(kf.key, { key: kf.key, path: kf.path, label: kf.label, kf });
    }
    for (const sh of shineTracks) {
      const found = byKey.get(sh.key);
      if (found) found.shine = sh;
      else byKey.set(sh.key, { key: sh.key, path: sh.path, label: sh.label, shine: sh });
    }
    return Array.from(byKey.values()).sort((a, b) => comparePaths(a.path, b.path));
  }, [tracks, pkgTracks, kfTracks, shineTracks]);

  const pkgEnd = Math.max(
    0,
    ...pkgTracks.flatMap((track) =>
      packageEvents(track, specOf(track)).map((e) => e.start + e.duration)
    )
  );
  const kfEnd = Math.max(0, ...kfTracks.map((track) => keyframesEnd(kfsOf(track))));
  // O brilho repete para sempre: na conta do tempo total entra a primeira passada.
  const shineEnd = Math.max(
    0,
    ...shineTracks.map((track) => shineOf(track).delay + shineOf(track).seconds * SHINE_SWEEP)
  );
  const total = Math.max(
    pkgEnd,
    kfEnd,
    shineEnd,
    ...tracks.map((track) => animationDuration(effective(track)) / 1000)
  );
  const span = Math.max(3, Math.ceil((total + 0.4) * 2) / 2);

  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    },
    []
  );

  // Ao trocar de slide, para a reprodução e descarta rascunhos.
  useEffect(() => {
    setTime(null);
    setDraft({});
    setPkgDraft({});
    setKfDraft({});
    useUIStore.getState().setActiveKeyframe(null);
  }, [currentIndex]);

  const stop = (): void => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setTime(null);
  };

  const play = (): void => {
    if (time !== null) {
      stop();
      return;
    }
    useUIStore.getState().replayAnimations();
    const started = performance.now();
    const end = Math.max(total, 0.3) + 0.2;
    const tick = (now: number): void => {
      const elapsed = (now - started) / 1000;
      if (elapsed >= end) {
        stop();
        return;
      }
      setTime(elapsed);
      rafRef.current = requestAnimationFrame(tick);
    };
    setTime(0);
    rafRef.current = requestAnimationFrame(tick);
  };

  const commit = (track: Track, animation: ElementAnimation | null): void => {
    useDeckStore.getState().patchElement(track.path, animationPatch(animation));
  };

  const beginDrag = (event: ReactPointerEvent, track: Track, mode: DragState['mode']): void => {
    const animation = effective(track);
    if (!animation) return;
    event.preventDefault();
    event.stopPropagation();
    useDeckStore.getState().requestSelection(track.path);
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    dragRef.current = {
      key: track.key,
      mode,
      startX: event.clientX,
      base: animation,
      path: track.path,
    };
  };

  const moveDrag = (event: ReactPointerEvent): void => {
    const drag = dragRef.current;
    const area = trackAreaRef.current;
    if (!drag || !area) return;
    const seconds = ((event.clientX - drag.startX) / area.clientWidth) * span;
    const next =
      drag.mode === 'move'
        ? normalizeAnimation({ ...drag.base, delay: round(Math.max(0, drag.base.delay + seconds)) })
        : normalizeAnimation({
            ...drag.base,
            duration: round(Math.max(SNAP, drag.base.duration + seconds)),
          });
    setDraft((prev) => ({ ...prev, [drag.key]: next }));
  };

  const endDrag = (): void => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;
    const final = draft[drag.key];
    setDraft((prev) => {
      const rest = { ...prev };
      delete rest[drag.key];
      return rest;
    });
    if (final && (final.delay !== drag.base.delay || final.duration !== drag.base.duration)) {
      useDeckStore.getState().patchElement(drag.path, animationPatch(final));
    }
  };

  const beginPkgDrag = (
    event: ReactPointerEvent,
    track: PackageTrack,
    item: PackageTimelineEvent,
    mode: PackageDrag['mode']
  ): void => {
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    pkgDragRef.current = { track, event: item, mode, startX: event.clientX };
  };

  const movePkgDrag = (event: ReactPointerEvent): void => {
    const drag = pkgDragRef.current;
    const area = trackAreaRef.current;
    if (!drag || !area || !drag.track.def.timeline) return;
    const seconds = ((event.clientX - drag.startX) / area.clientWidth) * span;
    const change =
      drag.mode === 'move'
        ? { start: round(Math.max(0, drag.event.start + seconds)) }
        : { duration: round(Math.max(SNAP, drag.event.duration + seconds)) };
    const base = drag.track.spec;
    const patch = drag.track.def.timeline.move(base, drag.event.id, change);
    if (patch) setPkgDraft((prev) => ({ ...prev, [drag.track.key]: { ...base, ...patch } }));
  };

  const endPkgDrag = (): void => {
    const drag = pkgDragRef.current;
    pkgDragRef.current = null;
    if (!drag) return;
    const next = pkgDraft[drag.track.key];
    setPkgDraft((prev) => {
      const rest = { ...prev };
      delete rest[drag.track.key];
      return rest;
    });
    if (next) updatePackageSpec({ path: drag.track.path }, next);
  };

  const ticks: number[] = [];
  for (let t = 0; t <= span + 1e-6; t += 0.5) ticks.push(t);

  const rename = (path: number[], name: string): void => {
    useDeckStore.getState().patchElement(path, { attrs: { 'data-name': name || null } });
  };

  /** Célula do nome: clique seleciona, duplo clique renomeia. */
  const nameCell = (path: number[], label: string, selected: boolean, indent: number) => (
    <RenameLabel
      value={label}
      onClick={() => useDeckStore.getState().requestSelection(path)}
      onCommit={(name) => rename(path, name)}
      className={clsx(
        'flex w-[190px] shrink-0 items-center overflow-hidden border-r border-payday-border pr-2 text-left text-[11px] transition hover:text-payday-text',
        selected ? 'text-accent' : 'text-payday-textMuted'
      )}
      style={{ paddingLeft: indent }}
    />
  );

  const beginKfDrag = (event: ReactPointerEvent, track: KeyframeTrack, index: number): void => {
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    kfDragRef.current = { track, index, startX: event.clientX, moved: false };
  };

  const moveKfDrag = (event: ReactPointerEvent): void => {
    const drag = kfDragRef.current;
    const area = trackAreaRef.current;
    if (!drag || !area) return;
    const base = drag.track.kfs[drag.index];
    if (!base) return;
    if (!drag.moved && Math.abs(event.clientX - drag.startX) < 4) return;
    drag.moved = true;
    const seconds = ((event.clientX - drag.startX) / area.clientWidth) * span;
    const t = round(Math.max(0, base.t + seconds));
    setKfDraft((prev) => ({
      ...prev,
      [drag.track.key]: drag.track.kfs.map((k, i) => (i === drag.index ? { ...k, t } : k)),
    }));
  };

  const endKfDrag = (): void => {
    const drag = kfDragRef.current;
    kfDragRef.current = null;
    if (!drag) return;
    const next = kfDraft[drag.track.key];
    setKfDraft((prev) => {
      const rest = { ...prev };
      delete rest[drag.track.key];
      return rest;
    });
    const ui = useUIStore.getState();
    if (!drag.moved || !next) {
      // Clique: seleciona o elemento e mostra o keyframe no palco (para ver e editar a pose).
      useDeckStore.getState().requestSelection(drag.track.path);
      ui.setActiveKeyframe({ path: drag.track.path, index: drag.index });
      return;
    }
    useDeckStore.getState().patchElement(drag.track.path, keyframesPatch(next));
    // O keyframe arrastado pode ter mudado de posição na lista ordenada.
    const movedT = next[drag.index]?.t;
    const sorted = [...next].sort((a, b) => a.t - b.t);
    const newIndex = sorted.findIndex((k) => k.t === movedT);
    const active = ui.activeKeyframe;
    if (active && active.path.join('.') === drag.track.key && active.index === drag.index) {
      ui.setActiveKeyframe({ path: drag.track.path, index: Math.max(0, newIndex) });
    }
  };

  const beginShineDrag = (
    event: ReactPointerEvent,
    track: ShineTrack,
    mode: 'move' | 'resize'
  ): void => {
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    shineDragRef.current = { track, mode, startX: event.clientX };
    useDeckStore.getState().requestSelection(track.path);
  };
  const moveShineDrag = (event: ReactPointerEvent): void => {
    const drag = shineDragRef.current;
    const area = trackAreaRef.current;
    if (!drag || !area) return;
    const seconds = ((event.clientX - drag.startX) / area.clientWidth) * span;
    const base = drag.track.shine;
    const next: TextShine =
      drag.mode === 'move'
        ? { ...base, delay: round(Math.max(0, base.delay + seconds)) }
        : // a ponta da barra é o fim da passada (60% do intervalo)
          { ...base, seconds: Math.max(0.6, round(base.seconds + seconds / SHINE_SWEEP)) };
    setShineDraft((prev) => ({ ...prev, [drag.track.key]: next }));
  };
  const endShineDrag = (): void => {
    const drag = shineDragRef.current;
    shineDragRef.current = null;
    if (!drag) return;
    const next = shineDraft[drag.track.key];
    setShineDraft((prev) => {
      const rest = { ...prev };
      delete rest[drag.track.key];
      return rest;
    });
    if (next) useDeckStore.getState().patchElement(drag.track.path, shinePatch(next));
  };

  /** Linha do brilho que passa: uma barra por passada (a primeira é a que se arrasta). */
  const shineRow = (track: ShineTrack, sub?: string) => {
    const shine = shineOf(track);
    const selected = selectedKey === track.key;
    const sweep = shine.seconds * SHINE_SWEEP;
    const starts: number[] = [];
    for (let t = shine.delay; t < span && starts.length < 60; t += shine.seconds) starts.push(t);
    return (
      <div
        key={`shine-${track.key}`}
        data-testid="timeline-shine"
        className={clsx(
          'flex h-8',
          !sub && 'border-b border-payday-border/40',
          selected && 'bg-accent/[0.07]'
        )}
      >
        {sub ? (
          <div
            className="w-[190px] shrink-0 truncate border-r border-payday-border pr-2 text-[11px] leading-8 text-payday-textDim"
            style={{ paddingLeft: 26 }}
          >
            ↳ {sub}
          </div>
        ) : (
          nameCell(track.path, track.label, selected, 12)
        )}
        <div className="relative min-w-0 flex-1 overflow-hidden">
          {gridLines}
          {starts.map((start, index) => (
            <div
              key={index}
              className="absolute top-1.5 h-5"
              style={{
                left: `${(start / span) * 100}%`,
                width: `${Math.max(1.2, (sweep / span) * 100)}%`,
                opacity: index === 0 ? 1 : 0.45,
              }}
            >
              {index === 0 ? (
                <Tooltip
                  title={`Brilho · começa em ${fmt(shine.delay)} · repete a cada ${fmt(shine.seconds)}`}
                  description="Arraste a barra para mudar o começo e a ponta para o intervalo. As barras claras são as repetições."
                  side="top"
                  className="h-full w-full"
                >
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label={`Brilho de ${track.label}`}
                    onPointerDown={(event) => beginShineDrag(event, track, 'move')}
                    onPointerMove={moveShineDrag}
                    onPointerUp={endShineDrag}
                    onPointerCancel={endShineDrag}
                    className="relative flex h-full w-full cursor-grab touch-none items-center overflow-hidden rounded-[5px] border border-black/30 px-1.5 text-[10px] font-medium text-black/70 active:cursor-grabbing"
                    style={{ background: SHINE_COLOR }}
                  >
                    <span className="truncate">Brilho ∞</span>
                    <span
                      aria-hidden="true"
                      onPointerDown={(event) => beginShineDrag(event, track, 'resize')}
                      onPointerMove={moveShineDrag}
                      onPointerUp={endShineDrag}
                      className="absolute inset-y-0 right-0 w-2 cursor-ew-resize bg-black/25"
                    />
                  </div>
                </Tooltip>
              ) : (
                <div
                  className="h-full w-full rounded-[5px] border border-black/30"
                  style={{ background: SHINE_COLOR }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const gridLines = ticks.map((t) => (
    <span
      key={t}
      className="absolute top-0 h-full border-l border-payday-border/30"
      style={{ left: `${(t / span) * 100}%` }}
    />
  ));

  /** Linha de uma animação de entrada (`sub` = linha dentro de um bloco de mesmo elemento). */
  const animRow = (track: Track, sub?: string) => {
    const animation = effective(track);
    const selected = selectedKey === track.key;
    return (
      <div
        key={`anim-${track.key}`}
        className={clsx(
          'flex h-8',
          !sub && 'border-b border-payday-border/40',
          selected && 'bg-accent/[0.07]'
        )}
      >
        {sub ? (
          <div
            className="w-[190px] shrink-0 truncate border-r border-payday-border pr-2 text-[11px] leading-8 text-payday-textDim"
            style={{ paddingLeft: 26 }}
          >
            ↳ {sub}
          </div>
        ) : (
          nameCell(track.path, track.label, selected, 12 + track.depth * 12)
        )}
        <div className="relative min-w-0 flex-1">
          {gridLines}
          {animation ? (
            <div
              className="absolute top-1.5 h-5"
              style={{
                left: `${(animation.delay / span) * 100}%`,
                width: `${Math.max(1.2, (animation.duration / span) * 100)}%`,
              }}
            >
              <Tooltip
                title={`${KIND_LABELS[animation.kind]} · ${fmt(animation.duration)}`}
                description={`Começa em ${fmt(animation.delay)} e termina em ${fmt(animation.delay + animation.duration)}.`}
                side="top"
                className="h-full w-full"
              >
                <div
                  role="button"
                  tabIndex={0}
                  aria-label={`Animação de ${track.label}`}
                  onPointerDown={(event) => beginDrag(event, track, 'move')}
                  onPointerMove={moveDrag}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  className={clsx(
                    'relative flex h-full w-full cursor-grab touch-none items-center overflow-hidden rounded-[5px] border px-1.5 text-[10px] font-medium text-black/70 active:cursor-grabbing',
                    selected ? 'border-white/80' : 'border-black/30'
                  )}
                  style={{ background: KIND_COLORS[animation.kind] }}
                >
                  <span className="truncate">{KIND_LABELS[animation.kind]}</span>
                  <span
                    aria-hidden="true"
                    onPointerDown={(event) => beginDrag(event, track, 'resize')}
                    onPointerMove={moveDrag}
                    onPointerUp={endDrag}
                    className="absolute inset-y-0 right-0 w-2 cursor-ew-resize bg-black/25"
                  />
                </div>
              </Tooltip>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => commit(track, ANIMATION_DEFAULTS)}
              className="absolute left-2 top-1.5 inline-flex h-5 items-center gap-1 rounded border border-dashed border-payday-border px-2 text-[10px] text-payday-textMuted transition hover:border-accent/50 hover:text-accent"
            >
              <Plus className="h-3 w-3" /> Animar
            </button>
          )}
        </div>
      </div>
    );
  };

  /** Linha da interpolação: uma faixa com um losango por keyframe. */
  const kfRow = (track: KeyframeTrack, sub?: string) => {
    const kfs = kfsOf(track);
    const selected = selectedKey === track.key;
    const first = Math.min(...kfs.map((k) => k.t));
    const last = Math.max(...kfs.map((k) => k.t));
    return (
      <div
        key={`kf-${track.key}`}
        className={clsx(
          'flex h-8',
          !sub && 'border-b border-payday-border/40',
          selected && 'bg-accent/[0.07]'
        )}
      >
        {sub ? (
          <div
            className="w-[190px] shrink-0 truncate border-r border-payday-border pr-2 text-[11px] leading-8 text-payday-textDim"
            style={{ paddingLeft: 26 }}
          >
            ↳ {sub}
          </div>
        ) : (
          nameCell(track.path, track.label, selected, 12)
        )}
        <div className="relative min-w-0 flex-1">
          {gridLines}
          <div
            className="absolute top-[15px] h-[3px] rounded bg-[#B9A6E8]/60"
            style={{
              left: `${(first / span) * 100}%`,
              width: `${Math.max(0.5, ((last - first) / span) * 100)}%`,
            }}
          />
          {kfs.map((k, index) => (
            <div
              key={index}
              className="absolute top-2 h-4 w-4 -translate-x-1/2"
              style={{ left: `${(k.t / span) * 100}%` }}
            >
              <Tooltip
                title={`Keyframe ${index + 1} · ${fmt(k.t)}`}
                description={`X ${k.x}, Y ${k.y} · escala ${Math.round(k.s * 100)}% · giro ${k.r}° · opacidade ${Math.round(k.o * 100)}%${keyframeTextSummary(k)}. Arraste para mudar o tempo.`}
                side="top"
                className="h-full w-full"
              >
                <div
                  role="button"
                  tabIndex={0}
                  aria-label={`Keyframe ${index + 1} de ${track.label}`}
                  aria-pressed={
                    activeKeyframe?.path.join('.') === track.key && activeKeyframe.index === index
                  }
                  onPointerDown={(event) => beginKfDrag(event, track, index)}
                  onPointerMove={moveKfDrag}
                  onPointerUp={endKfDrag}
                  onPointerCancel={endKfDrag}
                  className={clsx(
                    'h-full w-full rotate-45 cursor-grab touch-none rounded-[3px] border active:cursor-grabbing',
                    activeKeyframe?.path.join('.') === track.key && activeKeyframe.index === index
                      ? 'border-white bg-accent shadow-[0_0_8px_rgba(247,217,139,0.9)]'
                      : 'border-black/40 bg-[#B9A6E8]'
                  )}
                />
              </Tooltip>
            </div>
          ))}
        </div>
      </div>
    );
  };

  /** Linha dos eventos de um pacote (digitação, destaques, entrada do gráfico…). */
  const pkgRow = (track: PackageTrack, sub?: string) => {
    const events = packageEvents(track, specOf(track));
    const selected = selectedKey === track.key;
    return (
      <div
        key={`pkg-${track.key}`}
        className={clsx(
          'flex h-8',
          !sub && 'border-b border-payday-border/40',
          selected && 'bg-accent/[0.07]'
        )}
      >
        {sub ? (
          <div
            className="w-[190px] shrink-0 truncate border-r border-payday-border pr-2 text-[11px] leading-8 text-payday-textDim"
            style={{ paddingLeft: 26 }}
          >
            ↳ {sub}
          </div>
        ) : (
          nameCell(track.path, track.label, selected, 12)
        )}
        <div className="relative min-w-0 flex-1">
          {gridLines}
          {events.map((item) => (
            <div
              key={item.id}
              className="absolute top-1.5 h-5"
              style={{
                left: `${(item.start / span) * 100}%`,
                width: `${Math.max(1.6, (item.duration / span) * 100)}%`,
              }}
            >
              <Tooltip
                title={`${item.label} · começa em ${fmt(item.start)}`}
                description={
                  item.resizable
                    ? 'Arraste a barra para o atraso e a ponta para a duração.'
                    : 'Arraste a barra para mudar o momento do destaque.'
                }
                side="top"
                className="h-full w-full"
              >
                <div
                  role="button"
                  tabIndex={0}
                  aria-label={`${item.label} de ${track.label}`}
                  onPointerDown={(event) => beginPkgDrag(event, track, item, 'move')}
                  onPointerMove={movePkgDrag}
                  onPointerUp={endPkgDrag}
                  onPointerCancel={endPkgDrag}
                  className="relative flex h-full w-full cursor-grab touch-none items-center overflow-hidden rounded-[5px] border border-black/30 px-1.5 text-[10px] font-medium text-black/70 active:cursor-grabbing"
                  style={{ background: item.color ?? '#F7D98B' }}
                >
                  <span className="truncate">{item.label}</span>
                  {item.resizable ? (
                    <span
                      aria-hidden="true"
                      onPointerDown={(event) => beginPkgDrag(event, track, item, 'resize')}
                      onPointerMove={movePkgDrag}
                      onPointerUp={endPkgDrag}
                      className="absolute inset-y-0 right-0 w-2 cursor-ew-resize bg-black/25"
                    />
                  ) : null}
                </div>
              </Tooltip>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div
      id="timeline"
      className="flex h-[236px] shrink-0 select-none flex-col border-t border-payday-border bg-[#0f0f10]"
    >
      <div className="flex h-9 shrink-0 items-center gap-3 border-b border-payday-border px-3">
        <Tooltip
          title={time !== null ? 'Parar' : 'Reproduzir'}
          description="Executa as animações do slide no palco."
          side="top"
        >
          <button
            type="button"
            aria-label={time !== null ? 'Parar' : 'Reproduzir'}
            onClick={play}
            disabled={
              tracks.every((track) => !effective(track)) &&
              pkgTracks.length === 0 &&
              kfTracks.length === 0 &&
              shineTracks.length === 0
            }
            className="grid h-7 w-7 place-items-center rounded-md bg-accent/15 text-accent transition hover:bg-accent/25 disabled:pointer-events-none disabled:opacity-35"
          >
            {time !== null ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </button>
        </Tooltip>
        <span className="w-14 font-mono text-xs tabular-nums text-payday-textMuted">
          {fmt(time ?? 0)} / {fmt(total)}
        </span>

        <div
          className="flex rounded-md border border-payday-border p-0.5"
          role="group"
          aria-label="Escopo"
        >
          {(
            [
              ['slide', 'Slide'],
              ['selection', 'Seleção'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={scope === id}
              onClick={() => setScope(id)}
              className={clsx(
                'rounded px-2.5 py-0.5 text-[11px] transition',
                scope === id
                  ? 'bg-white/10 text-payday-text'
                  : 'text-payday-textMuted hover:text-payday-text'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {activeKeyframe ? (
          <span className="inline-flex items-center gap-2 rounded-md border border-accent/40 bg-accent/10 px-2 py-0.5 text-[11px] text-accent">
            Editando o keyframe {activeKeyframe.index + 1} — arraste o elemento no palco
            <button
              type="button"
              onClick={() => useUIStore.getState().setActiveKeyframe(null)}
              className="rounded border border-accent/40 px-1.5 text-[10px] hover:bg-accent/20"
            >
              Sair
            </button>
          </span>
        ) : null}

        <span className="ml-auto truncate text-[11px] text-payday-textDim">
          Slide {currentIndex + 1} · {allTracks.length + allPkgTracks.length + allKfTracks.length}{' '}
          animaç
          {allTracks.length + allPkgTracks.length + allKfTracks.length === 1 ? 'ão' : 'ões'}
          {' · '}arraste a barra para o atraso, a ponta para a duração
        </span>
      </div>

      <div className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        {/* Régua de tempo */}
        <div className="sticky top-0 z-10 flex h-6 border-b border-payday-border/60 bg-[#0f0f10]">
          <div className="w-[190px] shrink-0 border-r border-payday-border px-3 text-[10px] uppercase leading-6 tracking-wider text-payday-textDim">
            Elemento
          </div>
          <div ref={trackAreaRef} className="relative min-w-0 flex-1">
            {ticks.map((t) => (
              <span
                key={t}
                className="absolute top-0 h-full border-l border-payday-border/70 pl-1 text-[10px] leading-6 text-payday-textDim"
                style={{ left: `${(t / span) * 100}%` }}
              >
                {Number.isInteger(t) ? `${t}s` : ''}
              </span>
            ))}
          </div>
        </div>

        {groups.length === 0 ? (
          <div className="grid h-[calc(100%-24px)] place-items-center px-6 text-center text-xs text-payday-textDim">
            Nenhum elemento animado neste slide. Selecione um elemento e use “Animar” — ou escolha
            “Seleção” para ver só o que está selecionado.
          </div>
        ) : (
          groups.map((group) => {
            const parts = [group.anim, group.pkg, group.kf, group.shine].filter(Boolean).length;
            if (parts >= 2) {
              const selected = selectedKey === group.key;
              const events =
                (group.anim ? 1 : 0) +
                (group.pkg ? packageEvents(group.pkg, specOf(group.pkg)).length : 0) +
                (group.kf ? group.kf.kfs.length : 0) +
                (group.shine ? 1 : 0);
              return (
                <div
                  key={group.key}
                  data-testid="timeline-group"
                  className="border-b border-payday-border/40 border-l-2 border-l-accent/70 bg-white/[0.025]"
                >
                  <div className={clsx('flex h-6', selected && 'bg-accent/[0.07]')}>
                    {nameCell(group.path, group.label, selected, 10)}
                    <div className="flex min-w-0 flex-1 items-center gap-2 px-2 text-[10px] text-payday-textDim">
                      <Link2 className="h-3 w-3" />
                      mesmo elemento · {events} eventos
                    </div>
                  </div>
                  {group.anim ? animRow(group.anim, 'Entrada') : null}
                  {group.pkg ? pkgRow(group.pkg, group.pkg.def.name) : null}
                  {group.kf ? kfRow(group.kf, 'Interpolação') : null}
                  {group.shine ? shineRow(group.shine, 'Brilho') : null}
                </div>
              );
            }
            if (group.anim) return animRow(group.anim);
            if (group.pkg) return pkgRow(group.pkg);
            if (group.kf) return kfRow(group.kf);
            return group.shine ? shineRow(group.shine) : null;
          })
        )}

        {time !== null ? (
          <div className="pointer-events-none absolute bottom-0 left-[190px] right-0 top-0">
            <div
              className="absolute top-0 h-full w-px bg-accent shadow-[0_0_6px_rgba(247,217,139,0.8)]"
              style={{ left: `${Math.min(100, (time / span) * 100)}%` }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
