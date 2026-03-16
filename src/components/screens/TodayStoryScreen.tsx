import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, Sparkles } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../store/useAppStore';

type TodayStoryScreenProps = {
  storyDayIndex: number;
  onBack: () => void;
};

type StoryBlock =
  | { type: 'paragraph'; content: string }
  | { type: 'heading'; content: string }
  | { type: 'quote'; content: string }
  | { type: 'highlight'; content: string }
  | { type: 'divider'; content: string };

const splitStoryContent = (content: string) => {
  const normalized = content.trim();
  if (!normalized) {
    return { lead: '', blocks: [] as StoryBlock[] };
  }

  const explicitParagraphs = normalized
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const classifyBlock = (block: string): StoryBlock => {
    if (/^#{1,3}\s+/.test(block)) {
      return { type: 'heading', content: block.replace(/^#{1,3}\s+/, '').trim() };
    }

    if (/^>\s+/.test(block)) {
      return { type: 'quote', content: block.replace(/^>\s+/gm, '').trim() };
    }

    if (/^(-{3,}|\*{3,})$/.test(block)) {
      return { type: 'divider', content: '' };
    }

    if ((block.length <= 70 && !/[.!?]$/.test(block)) || block.endsWith(':')) {
      return { type: 'heading', content: block.replace(/:$/, '').trim() };
    }

    if (block.length <= 120) {
      return { type: 'highlight', content: block };
    }

    return { type: 'paragraph', content: block };
  };

  if (explicitParagraphs.length > 1) {
    return {
      lead: explicitParagraphs[0],
      blocks: explicitParagraphs.slice(1).map(classifyBlock)
    };
  }

  const sentences =
    normalized.match(/[^.!?]+[.!?]*/g)?.map((sentence) => sentence.trim()).filter(Boolean) ?? [normalized];

  if (sentences.length <= 2) {
    return {
      lead: normalized,
      blocks: []
    };
  }

  return {
    lead: sentences.slice(0, 2).join(' ').trim(),
    blocks: sentences.slice(2).reduce<string[]>((chunks, sentence, index) => {
      if (index % 2 === 0) {
        chunks.push(sentence);
        return chunks;
      }

      chunks[chunks.length - 1] = `${chunks[chunks.length - 1]} ${sentence}`.trim();
      return chunks;
    }, []).map(classifyBlock)
  };
};

const resolveStoryByDay = <T extends { day: number }>(items: T[], storyDayIndex: number) =>
  items.find((item) => item.day === storyDayIndex) ?? items[storyDayIndex] ?? null;

const TodayStoryScreen: React.FC<TodayStoryScreenProps> = React.memo(({ storyDayIndex, onBack }) => {
  const { gaurkoIstoriak, loadingGaurkoIstoriak } = useAppStore(useShallow((state) => ({
    gaurkoIstoriak: state.gaurkoIstoriak,
    loadingGaurkoIstoriak: state.loadingGaurkoIstoriak
  })));

  const activeStory = React.useMemo(
    () => resolveStoryByDay(gaurkoIstoriak, storyDayIndex),
    [gaurkoIstoriak, storyDayIndex]
  );
  const storyContent = React.useMemo(
    () => splitStoryContent(activeStory?.content ?? ''),
    [activeStory?.content]
  );

  return (
    <div className="flex-1 w-full max-w-3xl mx-auto flex flex-col px-4 pb-10 pt-4 sm:px-6 sm:pt-6 overflow-y-auto custom-scrollbar">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full space-y-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-sky-700">
              <Sparkles size={12} />
              Gaurko istorioa
            </div>
            <h2 className="mt-3 text-3xl font-black uppercase italic tracking-tight text-slate-900">
              Irakurri gaurko pasartea
            </h2>
          </div>

          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-slate-50 hover:text-slate-700"
            aria-label="Itzuli"
            title="Itzuli"
          >
            <ArrowLeft size={20} strokeWidth={2.5} />
          </button>
        </div>

        <section className="glassmorphism overflow-hidden rounded-[2rem] border border-white/70 p-6 shadow-[0_24px_70px_-34px_rgba(15,23,42,0.28)] sm:p-8">
          {loadingGaurkoIstoriak ? (
            <div className="animate-pulse space-y-4">
              <div className="h-3 w-32 rounded-full bg-sky-100" />
              <div className="h-8 w-3/4 rounded-2xl bg-slate-200" />
              <div className="space-y-3">
                <div className="h-3 rounded-full bg-slate-200" />
                <div className="h-3 rounded-full bg-slate-200" />
                <div className="h-3 w-5/6 rounded-full bg-slate-200" />
                <div className="h-3 w-4/6 rounded-full bg-slate-200" />
              </div>
            </div>
          ) : activeStory ? (
            <div className="relative">
              <div className="absolute right-0 top-0 text-sky-100/80">
                <BookOpen size={88} strokeWidth={1.5} />
              </div>
              <div className="relative z-10">
                <h3 className="max-w-2xl text-3xl font-black leading-tight text-slate-900 sm:text-4xl">
                  {activeStory.title}
                </h3>
                <div className="mt-6 space-y-5">
                  <div className="rounded-[1.75rem] border border-sky-100 bg-[linear-gradient(180deg,rgba(240,249,255,0.95),rgba(255,255,255,0.88))] p-5 shadow-inner sm:p-6">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 h-12 w-1.5 shrink-0 rounded-full bg-gradient-to-b from-sky-400 via-cyan-400 to-teal-300" />
                      <p className="text-lg font-semibold leading-8 text-slate-800 sm:text-[1.15rem]">
                        {storyContent.lead}
                      </p>
                    </div>
                  </div>

                  {storyContent.blocks.length > 0 && (
                    <div className="rounded-[1.75rem] border border-white/80 bg-white/75 p-5 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.35)] sm:p-6">
                      <div className="space-y-5">
                        {storyContent.blocks.map((block, blockIndex) => (
                          <React.Fragment key={`${block.type}-${blockIndex}-${block.content.slice(0, 24)}`}>
                            {block.type === 'heading' && (
                              <div className="pt-1">
                                <h4 className="text-xl font-black uppercase tracking-tight text-slate-900 sm:text-2xl">
                                  {block.content}
                                </h4>
                              </div>
                            )}

                            {block.type === 'highlight' && (
                              <div className="rounded-[1.5rem] border border-amber-100 bg-[linear-gradient(180deg,#fff9ed,#fffdf8)] px-5 py-4 shadow-sm">
                                <p className="text-[1.02rem] font-semibold leading-8 text-slate-800">
                                  {block.content}
                                </p>
                              </div>
                            )}

                            {block.type === 'quote' && (
                              <blockquote className="rounded-[1.5rem] border-l-4 border-fuchsia-400 bg-fuchsia-50/80 px-5 py-4 text-[1.02rem] font-semibold italic leading-8 text-slate-800">
                                {block.content}
                              </blockquote>
                            )}

                            {block.type === 'divider' && (
                              <div className="flex items-center gap-3 py-2">
                                <div className="h-px flex-1 bg-slate-200" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">
                                  KORRIKA
                                </span>
                                <div className="h-px flex-1 bg-slate-200" />
                              </div>
                            )}

                            {block.type === 'paragraph' && (
                              <p className="text-base font-medium leading-8 text-slate-700 sm:text-[1.02rem]">
                                {block.content}
                              </p>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 px-2 pt-1">
                    <div className="h-px flex-1 bg-slate-200" />
                    <span className="text-[10px] font-black uppercase tracking-[0.34em] text-sky-500">
                      Istorioa
                    </span>
                    <div className="h-px flex-1 bg-slate-200" />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-white/70 px-5 py-10 text-center">
              <BookOpen className="mx-auto text-slate-300" size={36} />
              <p className="mt-4 text-lg font-black text-slate-700">
                Ez dago gaurko istoriorik egun honetarako.
              </p>
              <p className="mt-2 text-sm font-medium text-slate-500">
                Edukia kargatuta dagoenean hemen irakurri ahal izango da.
              </p>
            </div>
          )}
        </section>
      </motion.div>
    </div>
  );
});

TodayStoryScreen.displayName = 'TodayStoryScreen';

export default TodayStoryScreen;
