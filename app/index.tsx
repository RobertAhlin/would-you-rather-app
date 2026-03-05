import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Sharing from "expo-sharing";
import ViewShot, { type ViewShot as ViewShotType } from "react-native-view-shot";

import { categories, questions } from "./data/questions";
import type { Category } from "./data/questions";

type VoteCounts = { a: number; b: number };
type VoteStats = Record<string, VoteCounts>;

const STORAGE_KEY = "wyr:votes:v1";

type Filter = "All" | Category;

function clampIndex(i: number, len: number) {
  return ((i % len) + len) % len;
}

function getCounts(stats: VoteStats, qid: string): VoteCounts {
  return stats[qid] ?? { a: 0, b: 0 };
}

function toPercents(counts: VoteCounts): { a: number; b: number } {
  const total = counts.a + counts.b;
  if (total <= 0) return { a: 50, b: 50 };
  const a = Math.round((counts.a / total) * 100);
  return { a, b: 100 - a };
}

const RESULT_BLOCK_HEIGHT = 132;
const CHOICE_MIN_HEIGHT = 150;

const accentPalette = ["#A259FF", "#39FF14", "#FF2D95", "#00E5FF"];

export default function Index() {
  const [index, setIndex] = useState(0);
  const [locked, setLocked] = useState(false);
  const [picked, setPicked] = useState<"A" | "B" | null>(null);

  const [filter, setFilter] = useState<Filter>("All");

  const [voteStats, setVoteStats] = useState<VoteStats>({});
  const [isLoaded, setIsLoaded] = useState(false);

  const nextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const RESULT_MS = 3000;

  const resultOpacity = useRef(new Animated.Value(0)).current;

  const shareShotRef = useRef<ViewShotType | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  const filteredQuestions = useMemo(() => {
    if (filter === "All") return questions;
    return questions.filter((q) => q.category === filter);
  }, [filter]);

  const q = useMemo(() => {
    const list = filteredQuestions.length ? filteredQuestions : questions;
    return list[clampIndex(index, list.length)];
  }, [index, filteredQuestions]);

  const accent = useMemo(() => {
    return accentPalette[clampIndex(index, accentPalette.length)];
  }, [index]);

  const countsForThisQuestion = useMemo(() => getCounts(voteStats, q.id), [voteStats, q.id]);
  const { a: percentA, b: percentB } = useMemo(() => toPercents(countsForThisQuestion), [countsForThisQuestion]);

  function clearTimer() {
    if (nextTimerRef.current) {
      clearTimeout(nextTimerRef.current);
      nextTimerRef.current = null;
    }
  }

  async function loadVotes() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as VoteStats;
      if (parsed && typeof parsed === "object") setVoteStats(parsed);
    } catch {
      // ignore
    }
  }

  async function saveVotes(next: VoteStats) {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  function nextQuestion() {
    clearTimer();

    // Fade out result first so nothing "blinks" during transition
    Animated.timing(resultOpacity, {
      toValue: 0,
      duration: 140,
      useNativeDriver: true,
    }).start(() => {
      setPicked(null);
      setLocked(false);
      setIndex((i) => i + 1);
    });
  }

  function showResult(choice: "A" | "B") {
    if (locked) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setPicked(choice);
    setLocked(true);

    setVoteStats((prev) => {
      const current = getCounts(prev, q.id);
      const nextCounts: VoteCounts =
        choice === "A"
          ? { a: current.a + 1, b: current.b }
          : { a: current.a, b: current.b + 1 };

      const next: VoteStats = { ...prev, [q.id]: nextCounts };
      void saveVotes(next);
      return next;
    });

    Animated.timing(resultOpacity, {
      toValue: 1,
      duration: 140,
      useNativeDriver: true,
    }).start();

    nextTimerRef.current = setTimeout(() => {
      nextQuestion();
    }, RESULT_MS);
  }

  function setFilterAndReset(next: Filter) {
    clearTimer();
    resultOpacity.setValue(0);
    setPicked(null);
    setLocked(false);
    setIndex(0);
    setFilter(next);
  }

  async function handleShare() {
    if (!picked || isSharing) return;

    try {
      setIsSharing(true);

      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) return;

      // Ensure the hidden ViewShot exists
      const uri = await shareShotRef.current?.capture?.();
      if (!uri) return;

      await Sharing.shareAsync(uri, {
        mimeType: "image/png",
        UTI: "public.png",
        dialogTitle: "Share",
      });
    } finally {
      setIsSharing(false);
    }
  }

  useEffect(() => {
    (async () => {
      await loadVotes();
      setIsLoaded(true);
    })();
    return () => clearTimer();
  }, []);

  const aSelected = picked === "A";
  const bSelected = picked === "B";

  return (
    <View style={styles.container}>
      <Text style={styles.title}>WOULD YOU RATHER</Text>

      {/* CATEGORY FILTER */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        <Pressable
          onPress={() => setFilterAndReset("All")}
          style={[
            styles.chip,
            filter === "All" && { borderColor: accent, borderWidth: 2, backgroundColor: "#161616" },
          ]}
        >
          <Text style={[styles.chipText, filter === "All" && { color: "#FFFFFF" }]}>ALL</Text>
        </Pressable>

        {categories.map((c) => (
          <Pressable
            key={c}
            onPress={() => setFilterAndReset(c)}
            style={[
              styles.chip,
              filter === c && { borderColor: accent, borderWidth: 2, backgroundColor: "#161616" },
            ]}
          >
            <Text style={[styles.chipText, filter === c && { color: "#FFFFFF" }]}>{c.toUpperCase()}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* ANSWERS FRAME */}
      <View style={[styles.answersFrame, { borderColor: accent }]}>
        <Text style={styles.categoryBadge}>{q.category.toUpperCase()}</Text>

        <Pressable
          disabled={!isLoaded || locked}
          onPress={() => showResult("A")}
          style={[
            styles.choice,
            aSelected && { borderColor: accent },
            locked && !aSelected && styles.choiceDim,
            !isLoaded && styles.choiceDim,
          ]}
        >
          <Text style={styles.choiceLabel}>A</Text>
          <Text style={styles.choiceText} numberOfLines={3}>
            {q.a}
          </Text>
        </Pressable>

        <Text style={styles.or}>OR</Text>

        <Pressable
          disabled={!isLoaded || locked}
          onPress={() => showResult("B")}
          style={[
            styles.choice,
            bSelected && { borderColor: accent },
            locked && !bSelected && styles.choiceDim,
            !isLoaded && styles.choiceDim,
          ]}
        >
          <Text style={styles.choiceLabel}>B</Text>
          <Text style={styles.choiceText} numberOfLines={3}>
            {q.b}
          </Text>
        </Pressable>
      </View>

      {/* RESULT AREA (reserved space, invisible until pick) */}
      <View style={styles.resultSlot}>
        <Animated.View style={[styles.resultWrap, { opacity: resultOpacity }]}>
          <View style={[styles.resultCard, { borderColor: accent }]}>
            <Text style={styles.resultTitle}>RESULT</Text>

            <View style={styles.resultRow}>
              <Text style={[styles.resultPct, aSelected && { color: accent }]}>A: {percentA}%</Text>
              <Text style={[styles.resultPct, bSelected && { color: accent }]}>B: {percentB}%</Text>
            </View>

            <View style={styles.resultButtons}>
              <Pressable disabled={!picked} onPress={nextQuestion} style={styles.resultBtn}>
                <Text style={styles.resultBtnText}>NEXT</Text>
              </Pressable>

              <Pressable disabled={!picked || isSharing} onPress={handleShare} style={[styles.resultBtn, { borderColor: accent }]}>
                <Text style={[styles.resultBtnText, { color: isSharing ? "#777" : "#FFFFFF" }]}>
                  {isSharing ? "SHARING…" : "SHARE"}
                </Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </View>

      {/* HIDDEN SHARE CARD (captured as image) */}
      <View style={styles.shareHidden}>
        <ViewShot
          ref={(r) => (shareShotRef.current = r)}
          options={{ format: "png", quality: 1, result: "tmpfile" }}
        >
          <View style={styles.shareCard}>
            <Text style={styles.shareTitle}>WOULD YOU RATHER</Text>
            <Text style={[styles.shareCategory, { color: accent }]}>{q.category.toUpperCase()}</Text>

            <View style={[styles.shareFrame, { borderColor: accent }]}>
              <View style={styles.shareChoice}>
                <Text style={styles.shareChoiceLabel}>A</Text>
                <Text style={styles.shareChoiceText}>{q.a}</Text>
                <Text style={[styles.sharePct, picked === "A" && { color: accent }]}>A: {percentA}%</Text>
              </View>

              <Text style={styles.shareOr}>OR</Text>

              <View style={styles.shareChoice}>
                <Text style={styles.shareChoiceLabel}>B</Text>
                <Text style={styles.shareChoiceText}>{q.b}</Text>
                <Text style={[styles.sharePct, picked === "B" && { color: accent }]}>B: {percentB}%</Text>
              </View>
            </View>

            <Text style={styles.shareFooter}>Pick yours → would-you-rather</Text>
          </View>
        </ViewShot>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F0F0F",
    justifyContent: "center",
    padding: 20,
    gap: 14,
  },
  title: {
    color: "white",
    fontSize: 22,
    letterSpacing: 2,
    textAlign: "center",
    marginBottom: 2,
  },

  // Chips
  chipsRow: {
    gap: 10,
    paddingVertical: 6,
    paddingRight: 6,
    alignItems: "center",
  },
  chip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    backgroundColor: "#0F0F0F",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "flex-start",
  },
  chipText: {
    color: "#8E8E8E",
    fontSize: 13,
    letterSpacing: 1,
    textTransform: "uppercase",
    lineHeight: 16,
  },

  // Answers
  answersFrame: {
    backgroundColor: "#111111",
    borderRadius: 22,
    borderWidth: 2,
    padding: 18,
    gap: 14,
  },
  categoryBadge: {
    color: "#9A9A9A",
    textAlign: "center",
    letterSpacing: 3,
    fontSize: 12,
    marginBottom: 2,
  },
  choice: {
    minHeight: CHOICE_MIN_HEIGHT,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    backgroundColor: "#171717",
    justifyContent: "center",
    gap: 10,
  },
  choiceDim: { opacity: 0.35 },
  choiceLabel: {
    color: "#9A9A9A",
    letterSpacing: 4,
    fontSize: 12,
    textAlign: "center",
  },
  choiceText: {
    color: "white",
    fontSize: 18,
    textAlign: "center",
    lineHeight: 24,
  },
  or: {
    color: "#777",
    textAlign: "center",
    letterSpacing: 4,
  },

  // Result
  resultSlot: {
    minHeight: RESULT_BLOCK_HEIGHT,
  },
  resultWrap: {
    flex: 1,
  },
  resultCard: {
    borderRadius: 18,
    borderWidth: 2,
    padding: 16,
    backgroundColor: "#0B0B0B",
    gap: 12,
  },
  resultTitle: {
    color: "white",
    textAlign: "center",
    letterSpacing: 2,
  },
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 6,
  },
  resultPct: {
    color: "#9A9A9A",
    fontSize: 16,
  },
  resultButtons: {
    flexDirection: "row",
    gap: 10,
  },
  resultBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
  },
  resultBtnText: {
    color: "#FFFFFF",
    letterSpacing: 2,
    fontSize: 12,
  },

  // Hidden share
  shareHidden: {
    position: "absolute",
    left: -9999,
    top: 0,
    width: 900,
    height: 1600,
    opacity: 0,
  },

  // Share card layout (9:16-ish)
  shareCard: {
    width: 900,
    height: 1600,
    backgroundColor: "#0B0B0B",
    padding: 64,
    gap: 24,
    justifyContent: "center",
  },
  shareTitle: {
    color: "#FFFFFF",
    fontSize: 52,
    letterSpacing: 6,
    textAlign: "center",
    marginBottom: 8,
  },
  shareCategory: {
    fontSize: 26,
    letterSpacing: 6,
    textAlign: "center",
    marginBottom: 12,
  },
  shareFrame: {
    borderWidth: 4,
    borderRadius: 40,
    padding: 40,
    gap: 28,
    backgroundColor: "#0F0F0F",
  },
  shareChoice: {
    borderWidth: 2,
    borderColor: "#222222",
    borderRadius: 28,
    backgroundColor: "#141414",
    padding: 34,
    gap: 18,
  },
  shareChoiceLabel: {
    color: "#9A9A9A",
    textAlign: "center",
    letterSpacing: 8,
    fontSize: 22,
  },
  shareChoiceText: {
    color: "#FFFFFF",
    textAlign: "center",
    fontSize: 44,
    lineHeight: 54,
  },
  sharePct: {
    color: "#9A9A9A",
    textAlign: "center",
    fontSize: 30,
    marginTop: 6,
  },
  shareOr: {
    color: "#777777",
    textAlign: "center",
    fontSize: 26,
    letterSpacing: 8,
  },
  shareFooter: {
    color: "#9A9A9A",
    textAlign: "center",
    fontSize: 22,
    letterSpacing: 2,
    marginTop: 10,
  },
});