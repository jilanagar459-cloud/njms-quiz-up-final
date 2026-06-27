import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trophy, Clock, Zap, CheckCircle, XCircle, Play, Video, Image, FileText,
  Medal, Info, AlertTriangle, CheckCircle2, Siren, X, Megaphone, Wifi, WifiOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import {
  getActiveQuizSession,
  getQuestionsForSession,
  submitAnswer,
  getUserAnswersForSession,
  calculatePoints,
  getLeaderboard,
  upsertPresence,
  removePresence,
  getAppSetting,
} from '@/services/api';
import type { QuizSession, Question, UserAnswer, LeaderboardEntry, Broadcast } from '@/types/types';
import { cn, normalizeVideoUrl } from '@/lib/utils';

// ── Confetti component ───────────────────────────────────────────────────────
function Confetti() {
  const pieces = Array.from({ length: 60 }, (_, i) => i);
  const colors = [
    'bg-yellow-400', 'bg-primary', 'bg-pink-400', 'bg-green-400',
    'bg-blue-400', 'bg-purple-400', 'bg-orange-400', 'bg-red-400',
  ];
  return (
    <div className="fixed inset-0 pointer-events-none z-[190] overflow-hidden">
      {pieces.map(i => {
        const color = colors[i % colors.length];
        const left = `${(i * 1.7 + 3) % 100}%`;
        const delay = `${(i * 0.13) % 3}s`;
        const duration = `${2.5 + (i % 5) * 0.4}s`;
        const size = i % 3 === 0 ? 'w-2.5 h-2.5' : 'w-2 h-2';
        const shape = i % 4 === 0 ? 'rounded-full' : i % 4 === 1 ? 'rotate-45' : 'rounded-sm';
        return (
          <div
            key={i}
            className={`absolute top-0 ${size} ${color} ${shape} opacity-90`}
            style={{
              left,
              animation: `confettiFall ${duration} ${delay} ease-in forwards`,
            }}
          />
        );
      })}
    </div>
  );
}

// ── Pre-quiz countdown ───────────────────────────────────────────────────────
function CountdownScreen({ onDone }: { onDone: () => void }) {
  const [count, setCount] = useState(5);
  const [phase, setPhase] = useState<'number' | 'go'>('number');
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playTick = (isGo = false) => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = isGo ? 880 : 440 + count * 40;
      osc.type = isGo ? 'sine' : 'square';
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (isGo ? 0.6 : 0.15));
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + (isGo ? 0.6 : 0.18));
    } catch {
      // AudioContext not available — silent fallback
    }
  };

  useEffect(() => {
    playTick();
    if (count <= 0) return;
    const t = setTimeout(() => {
      if (count === 1) {
        setPhase('go');
        playTick(true);
        setTimeout(onDone, 900);
      } else {
        setCount(c => c - 1);
      }
    }, 900);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  return (
    <div className="fixed inset-0 z-[150] flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm">
      {/* Radial glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="rounded-full bg-primary/20 blur-3xl"
          style={{ width: 380, height: 380, animation: 'countdownPulse 0.9s ease-in-out infinite' }}
        />
      </div>

      {phase === 'number' ? (
        <div className="relative flex flex-col items-center gap-6 z-10">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary/80">Get Ready!</p>
          <div
            key={count}
            className="w-40 h-40 rounded-full border-4 border-primary flex items-center justify-center shadow-2xl shadow-primary/40"
            style={{ animation: 'countdownPop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards' }}
          >
            <span className="text-8xl font-black text-white tabular-nums mono-num leading-none">{count}</span>
          </div>
          <div className="flex gap-2">
            {[5, 4, 3, 2, 1].map(n => (
              <span
                key={n}
                className={cn(
                  'w-2 h-2 rounded-full transition-colors duration-300',
                  n >= count ? 'bg-primary' : 'bg-white/20'
                )}
              />
            ))}
          </div>
          <p className="text-white/50 text-sm text-balance text-center px-8">
            Quiz starts in {count} second{count !== 1 ? 's' : ''}
          </p>
        </div>
      ) : (
        <div
          className="z-10 text-center"
          style={{ animation: 'countdownPop 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards' }}
        >
          <p className="text-7xl font-black text-primary drop-shadow-lg">GO!</p>
          <p className="text-white/60 text-base mt-2">Good luck!</p>
        </div>
      )}
    </div>
  );
}

// ── Winners podium ───────────────────────────────────────────────────────────
function WinnersPodium({
  entries, topN, totalPoints, onViewLeaderboard
}: {
  entries: LeaderboardEntry[];
  topN: number;
  totalPoints: number;
  onViewLeaderboard: () => void;
}) {
  const winners = entries.slice(0, topN);
  const [showConfetti, setShowConfetti] = useState(true);
  const MEDALS = ['🥇', '🥈', '🥉'];
  const podiumHeights = ['h-32', 'h-24', 'h-20', 'h-16', 'h-14'];
  const podiumOrder = topN >= 3 ? [1, 0, 2, ...(topN > 3 ? Array.from({ length: topN - 3 }, (_, i) => i + 3) : [])] : [0, ...(topN > 1 ? [1] : [])];

  useEffect(() => {
    const t = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="fixed inset-0 z-[180] bg-gradient-to-b from-black/95 via-black/90 to-background/95 flex flex-col items-center justify-start overflow-y-auto py-8 px-4">
      {showConfetti && <Confetti />}

      <div className="w-full max-w-lg flex flex-col items-center gap-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <p className="text-4xl">🏆</p>
          <h2 className="text-2xl font-black text-white text-balance">Quiz Ended!</h2>
          <p className="text-primary font-semibold text-balance">Top {topN} Winners</p>
        </div>

        {/* Podium visual — top 3 in podium order, rest as list */}
        {winners.length >= 1 && (
          <div className="w-full">
            {/* Podium bars (up to 3) */}
            <div className="flex items-end justify-center gap-2 mb-6">
              {podiumOrder.slice(0, Math.min(3, winners.length)).map((idx) => {
                const entry = winners[idx];
                if (!entry) return null;
                const height = podiumHeights[idx] ?? 'h-12';
                const isFirst = idx === 0;
                return (
                  <div key={entry.user_id} className="flex flex-col items-center gap-1 flex-1 max-w-[120px]">
                    <span className="text-2xl">{MEDALS[idx] ?? '🏅'}</span>
                    <div className={cn(
                      'w-full rounded-t flex flex-col items-center justify-end pb-2 px-1',
                      height,
                      isFirst
                        ? 'bg-yellow-400/20 border border-yellow-400/50'
                        : idx === 1 ? 'bg-slate-400/20 border border-slate-400/50'
                        : 'bg-amber-600/20 border border-amber-600/50'
                    )}>
                      <p className="text-xs font-bold text-white text-center truncate w-full text-center">{entry.name}</p>
                      <p className="text-[10px] text-white/60 mono-num">{entry.total_points.toLocaleString()}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* All winners list */}
            <Card className="border-border bg-card/80 backdrop-blur-sm w-full">
              <CardContent className="p-0 divide-y divide-border">
                {winners.map((entry, i) => (
                  <div key={entry.user_id} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-lg w-7 text-center shrink-0">
                      {i < 3 ? MEDALS[i] : '🏅'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate">
                        {entry.name} {entry.surname}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{entry.tehsil}</p>
                    </div>
                    <Badge variant="secondary" className="mono-num shrink-0">
                      {entry.total_points.toLocaleString()} pts
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {winners.length === 0 && (
          <div className="text-center text-white/50 py-8">
            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No results yet</p>
          </div>
        )}

        {/* My score */}
        <Card className="w-full border-primary/30 bg-primary/5">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Your Score</p>
            <p className="text-3xl font-black text-primary mono-num">{totalPoints.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">points</p>
          </CardContent>
        </Card>

        <Button onClick={onViewLeaderboard} className="w-full h-12 font-bold gap-2 text-base">
          <Trophy className="w-5 h-5" /> View Full Leaderboard
        </Button>
      </div>
    </div>
  );
}

// ── Full-screen ad overlay ───────────────────────────────────────────────────
function FullScreenAdOverlay({ session }: { session: QuizSession }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const url = session.video_url ? normalizeVideoUrl(session.video_url) : null;
  if (!url) return null;

  const isEmbedUrl = /youtube\.com\/embed|youtu\.be|vimeo\.com\/video/.test(url);

  const embedSrc = (() => {
    if (!isEmbedUrl) return url;
    try {
      const u = new URL(url);
      u.searchParams.set('autoplay', '1');
      u.searchParams.set('mute', '0');
      u.searchParams.set('rel', '0');
      u.searchParams.set('modestbranding', '1');
      return u.toString();
    } catch {
      return url;
    }
  })();

  return (
    <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center" style={{ touchAction: 'none' }}>
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-white/60 border border-white/20 rounded px-2 py-0.5">
          Sponsored
        </span>
      </div>
      {isEmbedUrl ? (
        <iframe
          src={embedSrc}
          className="w-screen h-screen"
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          allowFullScreen
          title="Video Ad"
        />
      ) : (
        <video
          ref={videoRef}
          src={url}
          autoPlay
          playsInline
          controls
          className="w-screen h-screen object-contain"
          style={{ maxWidth: '100vw', maxHeight: '100vh' }}
        />
      )}
    </div>
  );
}

type AnswerState = 'idle' | 'correct' | 'wrong' | 'timeout';

// ── Question media renderer ──────────────────────────────────────────────────
function QuestionMedia({ question }: { question: Question }) {
  if (question.media_type === 'photo' && question.media_url) {
    return (
      <div className="w-full rounded overflow-hidden border border-border bg-secondary">
        <img
          src={question.media_url}
          alt="Question image"
          className="w-full max-h-64 object-contain"
        />
      </div>
    );
  }
  if (question.media_type === 'video' && question.media_url) {
    return (
      <div className="w-full aspect-video rounded overflow-hidden border border-border">
        <iframe
          src={question.media_url}
          className="w-full h-full"
          allow="autoplay; fullscreen"
          allowFullScreen
          title="Question video"
        />
      </div>
    );
  }
  return null;
}

// ── Media type badge ─────────────────────────────────────────────────────────
function MediaTypeBadge({ type }: { type: string }) {
  if (!type || type === 'text') return null;
  return (
    <Badge variant="secondary" className="gap-1 text-xs py-0 h-5">
      {type === 'photo' ? <Image className="w-3 h-3" /> : <Video className="w-3 h-3" />}
      <span className="capitalize">{type}</span>
    </Badge>
  );
}

export default function QuizPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [session, setSession] = useState<QuizSession | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [myAnswers, setMyAnswers] = useState<UserAnswer[]>([]);
  const [timeLeft, setTimeLeft] = useState(15);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>('idle');
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [ads, setAds] = useState<{ id: string; title: string; content: string | null; image_url: string | null; link_url: string | null }[]>([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [miniLeaderboard, setMiniLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [questionKey, setQuestionKey] = useState(0);
  const [realtimeConnected, setRealtimeConnected] = useState(true);

  // Countdown: shown while status='waiting' once quiz is near-start
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdownDone, setCountdownDone] = useState(false);

  // Podium: shown when status='ended'
  const [podiumEntries, setPodiumEntries] = useState<LeaderboardEntry[]>([]);
  const [topN, setTopN] = useState(5);
  const [showPodium, setShowPodium] = useState(false);

  // Broadcast banner state
  const [activeBroadcast, setActiveBroadcast] = useState<Broadcast | null>(null);
  const broadcastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const submittedRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);

  const currentQuestion = session && (session.current_question_index ?? -1) >= 0
    ? questions[session.current_question_index] ?? null
    : null;

  const alreadyAnswered = currentQuestion
    ? myAnswers.some(a => a.question_id === currentQuestion.id)
    : false;

  const loadData = useCallback(async () => {
    if (!user) return;
    const s = await getActiveQuizSession();
    setSession(s);
    sessionIdRef.current = s?.id ?? null;
    if (s) {
      const qs = await getQuestionsForSession(s.id);
      setQuestions(qs);
      const ans = await getUserAnswersForSession(user.id, s.id);
      setMyAnswers(ans);
      setTotalPoints(ans.reduce((sum, a) => sum + a.points, 0));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
    supabase
      .from('advertisements')
      .select('id,title,content,image_url,link_url')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .limit(10)
      .then(({ data }) => { if (data) setAds(data); });
    // Load top_winners_count setting
    getAppSetting('top_winners_count').then(val => {
      if (val) setTopN(Math.max(1, Math.min(10, Number(val))));
    });
  }, [loadData]);

  // Presence heartbeat — upsert every 30s while page is open
  useEffect(() => {
    if (!user || !session) return;
    upsertPresence(session.id, user.id);
    const interval = setInterval(() => upsertPresence(session.id, user.id), 30000);
    return () => {
      clearInterval(interval);
      removePresence(session.id, user.id);
    };
  }, [user, session?.id]);  // eslint-disable-line react-hooks/exhaustive-deps

  // Rotate ads
  useEffect(() => {
    if (ads.length < 2) return;
    const interval = setInterval(() => setCurrentAdIndex(i => (i + 1) % ads.length), 5000);
    return () => clearInterval(interval);
  }, [ads.length]);

  // When status transitions to 'active', show the countdown once
  useEffect(() => {
    if (session?.status === 'active' && !countdownDone && !showCountdown) {
      setShowCountdown(true);
    }
  }, [session?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // When quiz ends, load leaderboard for podium
  useEffect(() => {
    if (session?.status === 'ended' && session.id) {
      getLeaderboard(session.id).then(lb => {
        setPodiumEntries(lb);
        setShowPodium(true);
      });
    }
  }, [session?.status, session?.id]);

  // Realtime: quiz_sessions changes
  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout>;

    const subscribe = () => {
      const channel = supabase
        .channel('quiz-session-live', { config: { broadcast: { ack: true } } })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'quiz_sessions' }, async (payload) => {
          const updated = payload.new as QuizSession;
          if (sessionIdRef.current && updated.id !== sessionIdRef.current) return;
          sessionIdRef.current = updated.id;
          const freshQs = await getQuestionsForSession(updated.id);
          setQuestions(freshQs);
          setSession(updated);
          setSelectedOption(null);
          setAnswerState('idle');
          setMiniLeaderboard([]);
          submittedRef.current = false;
          startTimeRef.current = Date.now();
          setTimeLeft(15);
          setQuestionKey(k => k + 1);
        })
        .on('system', {}, (status) => {
          if (status.extension === 'postgres_changes') return;
          if ((status as unknown as { status: string }).status === 'SUBSCRIBED') {
            setRealtimeConnected(true);
          } else if ((status as unknown as { status: string }).status === 'CHANNEL_ERROR' ||
                     (status as unknown as { status: string }).status === 'TIMED_OUT') {
            setRealtimeConnected(false);
            loadData();
            reconnectTimer = setTimeout(() => {
              supabase.removeChannel(channel);
              subscribe();
            }, 3000);
          }
        })
        .subscribe((status) => {
          setRealtimeConnected(status === 'SUBSCRIBED');
        });

      return channel;
    };

    const ch = subscribe();
    return () => {
      clearTimeout(reconnectTimer);
      supabase.removeChannel(ch);
    };
  }, [loadData]);

  // Realtime: broadcasts — show banner when admin sends a message
  useEffect(() => {
    const channel = supabase
      .channel('broadcasts-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'broadcasts' }, (payload) => {
        const b = payload.new as Broadcast;
        setActiveBroadcast(b);
        // Auto-dismiss after 8 s (urgent stays 12 s)
        if (broadcastTimerRef.current) clearTimeout(broadcastTimerRef.current);
        broadcastTimerRef.current = setTimeout(
          () => setActiveBroadcast(null),
          b.type === 'urgent' ? 12000 : 8000
        );
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
      if (broadcastTimerRef.current) clearTimeout(broadcastTimerRef.current);
    };
  }, []);

  // Timer — keyed to questionKey so it always restarts on question advance
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!session || session.status !== 'active' || alreadyAnswered) return;

    startTimeRef.current = Date.now();
    submittedRef.current = false;
    setTimeLeft(15);

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          if (!submittedRef.current) {
            submittedRef.current = true;
            setAnswerState('timeout');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionKey, session?.status]);

  const handleSelectOption = async (optionId: string, isCorrect: boolean) => {
    if (!user || !currentQuestion || !session || alreadyAnswered || answerState !== 'idle' || submittedRef.current) return;
    submittedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);

    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    const timeTaken = Math.min(elapsed, 15);
    const points = isCorrect ? calculatePoints(timeTaken, 15) : 0;

    setSelectedOption(optionId);
    setAnswerState(isCorrect ? 'correct' : 'wrong');

    await submitAnswer({
      user_id: user.id,
      question_id: currentQuestion.id,
      quiz_session_id: session.id,
      option_id: optionId,
      time_taken: timeTaken,
      points,
      is_correct: isCorrect,
    });

    const newAnswer: UserAnswer = {
      id: crypto.randomUUID(),
      user_id: user.id,
      question_id: currentQuestion.id,
      quiz_session_id: session.id,
      option_id: optionId,
      time_taken: timeTaken,
      points,
      is_correct: isCorrect,
      created_at: new Date().toISOString(),
    };
    if (isCorrect) setTotalPoints(p => p + points);
    setMyAnswers(prev => [...prev, newAnswer]);

    // Fetch mini-leaderboard immediately after submitting
    const lb = await getLeaderboard(session.id);
    setMiniLeaderboard(lb.slice(0, 5));
  };

  // ── Not signed in ─────────────────────────────────────────────────────────
  if (!user || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
        <div className="w-12 h-12 bg-primary rounded flex items-center justify-center">
          <Zap className="w-7 h-7 text-primary-foreground" />
        </div>
        <p className="text-foreground font-semibold text-lg">Please sign in to join the quiz</p>
        <Button onClick={() => navigate('/login')} className="h-11">Sign In</Button>
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm">Loading quiz...</p>
        </div>
      </div>
    );
  }

  // ── No session ────────────────────────────────────────────────────────────
  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-4">
        <div className="w-16 h-16 bg-primary/10 rounded flex items-center justify-center">
          <Trophy className="w-8 h-8 text-primary" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground text-balance">No Active Quiz</h2>
          <p className="text-muted-foreground mt-1 text-pretty">Waiting for admin to start a quiz...</p>
        </div>
        {ads.length > 0 && (
          <Card className="w-full max-w-md border-border bg-card mt-4">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Sponsored</p>
              <p className="font-semibold text-foreground">{ads[currentAdIndex]?.title}</p>
              {ads[currentAdIndex]?.content && (
                <p className="text-sm text-muted-foreground mt-1">{ads[currentAdIndex].content}</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // ── Ended — show podium then leaderboard ──────────────────────────────────
  if (session.status === 'ended') {
    if (showPodium) {
      return (
        <WinnersPodium
          entries={podiumEntries}
          topN={topN}
          totalPoints={totalPoints}
          onViewLeaderboard={() => navigate('/leaderboard')}
        />
      );
    }
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-4">
        <div className="w-16 h-16 bg-primary/10 rounded flex items-center justify-center">
          <Trophy className="w-8 h-8 text-primary" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground text-balance">Quiz Ended!</h2>
          <p className="text-muted-foreground mt-1 text-pretty">You scored {totalPoints} points!</p>
        </div>
        <Button onClick={() => navigate('/leaderboard')} className="h-11 px-8 font-semibold">
          <Trophy className="w-4 h-4 mr-2" /> View Leaderboard
        </Button>
      </div>
    );
  }

  const timerPercent = (timeLeft / 15) * 100;
  const timerColor = timeLeft > 8 ? 'bg-primary' : timeLeft > 4 ? 'bg-warning' : 'bg-destructive';

  // Broadcast banner meta
  const BROADCAST_META = {
    info:    { icon: Info,           color: 'text-blue-600 dark:text-blue-400',   bg: 'bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700' },
    warning: { icon: AlertTriangle,  color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950 border-amber-300 dark:border-amber-700' },
    success: { icon: CheckCircle2,   color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950 border-green-300 dark:border-green-700' },
    urgent:  { icon: Siren,          color: 'text-red-600 dark:text-red-400',     bg: 'bg-red-50 dark:bg-red-950 border-red-300 dark:border-red-700' },
  };

  // Side-ad indices — left shows ads[0,2,4…], right shows ads[1,3,5…]
  const leftAdIdx  = ads.length > 0 ? (currentAdIndex * 2)     % ads.length : 0;
  const rightAdIdx = ads.length > 1 ? (currentAdIndex * 2 + 1) % ads.length : leftAdIdx;

  /** Reusable side-banner panel */
  const SideAdBanner = ({ adIndex }: { adIndex: number }) => {
    const ad = ads[adIndex];
    if (!ad) return (
      <div className="hidden xl:flex flex-col items-center justify-center w-44 shrink-0 rounded-xl border border-dashed border-border bg-card/40 min-h-[320px] gap-2 text-muted-foreground/40">
        <FileText className="w-6 h-6" />
        <span className="text-xs">Ad space</span>
      </div>
    );
    return (
      <div className="hidden xl:flex flex-col w-44 shrink-0 rounded-xl border border-border bg-card shadow-sm overflow-hidden min-h-[320px] self-start sticky top-24">
        <div className="px-3 py-2 border-b border-border bg-secondary/30">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest text-center font-medium">Sponsored</p>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-3 text-center">
          {ad.image_url ? (
            <div className="w-full aspect-square rounded-lg overflow-hidden bg-secondary">
              <img src={ad.image_url} alt={ad.title} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-full aspect-square rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Megaphone className="w-8 h-8 text-primary/40" />
            </div>
          )}
          <p className="text-xs font-semibold text-foreground leading-snug text-balance">{ad.title}</p>
          {ad.content && (
            <p className="text-[11px] text-muted-foreground leading-snug line-clamp-4 text-pretty">{ad.content}</p>
          )}
          {ad.link_url && (
            <a
              href={ad.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-auto w-full text-center text-[11px] font-medium text-primary-foreground bg-primary rounded-md py-1.5 hover:bg-primary/90 transition-colors"
            >
              Learn More
            </a>
          )}
        </div>
        {/* Dot indicators */}
        {ads.length > 1 && (
          <div className="flex justify-center gap-1 pb-2">
            {ads.map((_, i) => (
              <span key={i} className={cn('w-1.5 h-1.5 rounded-full transition-colors', i === adIndex ? 'bg-primary' : 'bg-border')} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-background pb-16">
      {/* ── Broadcast Banner ─────────────────────────────────────────────────── */}
      {activeBroadcast && (() => {
        const meta = BROADCAST_META[activeBroadcast.type] ?? BROADCAST_META.info;
        const Icon = meta.icon;
        return (
          <div className={cn(
            'sticky top-14 z-50 w-full border-b px-4 py-2.5 flex items-start gap-3 transition-all',
            meta.bg
          )}>
            <Icon className={cn('w-4 h-4 mt-0.5 shrink-0', meta.color)} />
            <p className={cn('flex-1 text-sm font-medium', meta.color)}>{activeBroadcast.message}</p>
            <button
              className={cn('shrink-0 opacity-60 hover:opacity-100 transition-opacity', meta.color)}
              onClick={() => setActiveBroadcast(null)}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })()}

      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-card border-b border-border px-4 py-2">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground truncate max-w-[140px] md:max-w-xs">
              {session.title}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="mono-num gap-1">
              <Trophy className="w-3 h-3" />
              {totalPoints.toLocaleString()}
            </Badge>
            {/* Realtime connection indicator */}
            <span
              title={realtimeConnected ? 'Live — connected' : 'Reconnecting…'}
              className="shrink-0"
            >
              {realtimeConnected
                ? <Wifi className="w-3.5 h-3.5 text-green-500" />
                : <WifiOff className="w-3.5 h-3.5 text-destructive animate-pulse" />
              }
            </span>
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => navigate('/leaderboard')}>
              <Trophy className="w-4 h-4" />
            </Button>
          </div>
        </div>
        {/* Timer bar */}
        <div className="mt-2 max-w-2xl mx-auto">
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full timer-bar', timerColor)}
              style={{ width: `${session.status === 'active' ? timerPercent : 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Three-column layout: left ad | quiz | right ad ─────────────────── */}
      <div className="flex-1 flex justify-center gap-4 px-4 py-6 w-full max-w-6xl mx-auto">
        {/* Left side banner */}
        <SideAdBanner adIndex={leftAdIdx} />

        {/* ── Main quiz column ───────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col items-center max-w-2xl w-full gap-4">

        {/* ── Full-screen video ad overlay (admin-controlled) ── */}
        {session.show_video && session.video_url && (
          <FullScreenAdOverlay session={session} />
        )}

        {/* ── Countdown overlay (shown once when quiz goes active) ── */}
        {showCountdown && !countdownDone && (
          <CountdownScreen onDone={() => { setShowCountdown(false); setCountdownDone(true); }} />
        )}

        {/* ── Waiting ─────────────────────────────────────────────── */}
        {session.status === 'waiting' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center py-12">
            <div className="w-16 h-16 bg-primary/10 rounded flex items-center justify-center">
              <Play className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Quiz Starting Soon</h2>
              <p className="text-muted-foreground mt-1">Admin is preparing the quiz...</p>
            </div>
            {ads.length > 0 && (
              <Card className="w-full border-border bg-card mt-4">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Sponsored</p>
                  <p className="font-semibold text-foreground">{ads[currentAdIndex]?.title}</p>
                  {ads[currentAdIndex]?.content && (
                    <p className="text-sm text-muted-foreground mt-1">{ads[currentAdIndex].content}</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ── Paused ──────────────────────────────────────────────── */}
        {session.status === 'paused' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center py-12">
            <div className="w-16 h-16 bg-primary/10 rounded flex items-center justify-center">
              <Video className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Quiz Paused</h2>
            <p className="text-muted-foreground">Admin will resume shortly...</p>
          </div>
        )}

        {/* ── Active quiz ──────────────────────────────────────────── */}
        {session.status === 'active' && currentQuestion && (
          <div className="fade-in w-full space-y-4">
            {/* Q header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                  Question {(session.current_question_index ?? 0) + 1} / {questions.length}
                </span>
                <MediaTypeBadge type={currentQuestion.media_type ?? 'text'} />
              </div>
              <div className={cn(
                'flex items-center gap-1.5 mono-num text-sm font-bold px-3 py-1 rounded',
                timeLeft > 8 ? 'bg-primary/10 text-primary'
                  : timeLeft > 4 ? 'bg-warning/10 text-warning'
                  : 'bg-destructive/10 text-destructive'
              )}>
                <Clock className="w-3.5 h-3.5" />{timeLeft}s
              </div>
            </div>

            {/* Question media (photo or video) */}
            <QuestionMedia question={currentQuestion} />

            {/* Question text */}
            <Card className="border-border bg-card">
              <CardContent className="p-5">
                {(!currentQuestion.media_type || currentQuestion.media_type === 'text') && (
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Text Question</span>
                  </div>
                )}
                <p className="text-lg font-semibold text-foreground leading-relaxed text-balance">
                  {currentQuestion.question_text}
                </p>
              </CardContent>
            </Card>

            {/* Options */}
            <div className="grid gap-3">
              {(currentQuestion.options ?? []).map((opt, i) => {
                const isSelected = selectedOption === opt.id;
                const revealed = answerState !== 'idle' || alreadyAnswered;
                const existingAnswer = myAnswers.find(a => a.question_id === currentQuestion.id);
                const wasSelected = existingAnswer?.option_id === opt.id;

                let btnClass = 'w-full text-left px-4 py-3.5 rounded border transition-colors text-sm font-medium';
                if (revealed || alreadyAnswered) {
                  if (opt.is_correct)
                    btnClass += ' border-[hsl(142_71%_45%)] bg-[hsl(142_71%_45%/0.15)] text-[hsl(142_71%_65%)]';
                  else if (isSelected || wasSelected)
                    btnClass += ' border-destructive bg-destructive/15 text-destructive';
                  else
                    btnClass += ' border-border bg-secondary/30 text-muted-foreground';
                } else {
                  btnClass += ' border-border bg-secondary hover:border-primary hover:bg-primary/10 hover:text-primary text-foreground';
                }

                return (
                  <button
                    key={opt.id}
                    className={btnClass}
                    onClick={() => handleSelectOption(opt.id, opt.is_correct)}
                    disabled={revealed || alreadyAnswered}
                  >
                    <span className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded shrink-0 border border-current flex items-center justify-center text-xs font-bold">
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className="flex-1 text-left">{opt.option_text}</span>
                      {(revealed || alreadyAnswered) && opt.is_correct && <CheckCircle className="w-4 h-4 shrink-0" />}
                      {(isSelected || wasSelected) && !opt.is_correct && (revealed || alreadyAnswered) && (
                        <XCircle className="w-4 h-4 shrink-0" />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Answer feedback */}
            {(answerState !== 'idle' || alreadyAnswered) && (() => {
              const existingAnswer = myAnswers.find(a => a.question_id === currentQuestion.id);
              const wasCorrect = answerState === 'correct' || (alreadyAnswered && existingAnswer?.is_correct);
              return (
                <div className={cn(
                  'flex items-center gap-3 p-4 rounded border text-sm font-medium',
                  wasCorrect
                    ? 'border-[hsl(142_71%_45%/0.4)] bg-[hsl(142_71%_45%/0.1)] text-[hsl(142_71%_65%)]'
                    : answerState === 'timeout'
                    ? 'border-border bg-secondary/30 text-muted-foreground'
                    : 'border-destructive/40 bg-destructive/10 text-destructive'
                )}>
                  {wasCorrect
                    ? <><CheckCircle className="w-4 h-4 shrink-0" /> Correct! +{existingAnswer?.points ?? 0} pts</>
                    : answerState === 'timeout'
                    ? <><Clock className="w-4 h-4 shrink-0" /> Time's up! The correct answer is highlighted above.</>
                    : <><XCircle className="w-4 h-4 shrink-0" /> Wrong! The correct answer is highlighted above.</>
                  }
                </div>
              );
            })()}

            {/* ── Mini Leaderboard (shown after answering) ── */}
            {(answerState !== 'idle' || alreadyAnswered) && (
              <Card className="border-border bg-card">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-primary" />
                      <span className="text-sm font-semibold text-foreground">Live Rankings</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground h-7 px-2"
                      onClick={() => navigate('/leaderboard')}
                    >
                      View all →
                    </Button>
                  </div>

                  {miniLeaderboard.length === 0 ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {miniLeaderboard.map((entry, idx) => {
                        const isMe = entry.user_id === user?.id;
                        const medalColors = ['text-yellow-400', 'text-slate-400', 'text-amber-600'];
                        return (
                          <div
                            key={entry.user_id}
                            className={cn(
                              'flex items-center gap-3 px-3 py-2 rounded text-sm',
                              isMe ? 'bg-primary/10 border border-primary/30' : 'bg-secondary/40'
                            )}
                          >
                            {/* Rank */}
                            <span className={cn('w-5 shrink-0 text-center font-bold', medalColors[idx] ?? 'text-muted-foreground')}>
                              {idx < 3 ? <Medal className="w-4 h-4 inline" /> : idx + 1}
                            </span>
                            {/* Name */}
                            <span className={cn('flex-1 min-w-0 truncate font-medium', isMe ? 'text-primary' : 'text-foreground')}>
                              {entry.name
                                ? `${entry.name}${entry.surname ? ' ' + entry.surname : ''}`
                                : entry.phone ?? 'Player'}
                              {isMe && <span className="ml-1 text-xs text-primary/70">(you)</span>}
                            </span>
                            {/* Points */}
                            <span className="mono-num text-xs font-semibold text-foreground shrink-0">
                              {entry.total_points.toLocaleString()} pts
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground text-center mt-3">
                    Waiting for admin to advance to next question...
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Active but no question yet */}
        {session.status === 'active' && !currentQuestion && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center py-12">
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground">Waiting for next question...</p>
          </div>
        )}
        </div> {/* end inner quiz column */}

        {/* Right side banner */}
        <SideAdBanner adIndex={rightAdIdx} />
      </div> {/* end three-column flex */}

      {/* ── PERMANENT AD BANNER (always visible at bottom) ── */}
      {ads.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border px-4 py-2">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground shrink-0 border border-border rounded px-1.5 py-0.5">
              Ad
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate leading-tight">
                {ads[currentAdIndex]?.title}
              </p>
              {ads[currentAdIndex]?.content && (
                <p className="text-xs text-muted-foreground truncate leading-tight">
                  {ads[currentAdIndex].content}
                </p>
              )}
            </div>
            {ads.length > 1 && (
              <div className="flex gap-1 shrink-0">
                {ads.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentAdIndex(i)}
                    className={cn(
                      'w-1.5 h-1.5 rounded-full transition-colors',
                      i === currentAdIndex ? 'bg-primary' : 'bg-border'
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
