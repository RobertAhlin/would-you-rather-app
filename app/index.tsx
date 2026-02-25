import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { categories, questions } from "./data/questions";
import type { Category } from "./data/questions";

type VoteCounts = { a: number; b: number };
type VoteStats = Record<string, VoteCounts>;

const STORAGE_KEY = "wyr:votes:v1";

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

type Filter = "All" | Category;

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

  const filteredQuestions = useMemo(() => {
    if (filter === "All") return questions;
    return questions.filter((q) => q.category === filter);
  }, [filter]);

  const q = useMemo(() => {
    const list = filteredQuestions.length ? filteredQuestions : questions;
    return list[clampIndex(index, list.length)];
  }, [index, filteredQuestions]);

  const accent = useMemo(() => {
    const accents = ["#A259FF", "#39FF14", "#FF2D95", "#00E5FF"];
    return accents[clampIndex(index, accents.length)];
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
    } catch {}
  }

  async function saveVotes(next: VoteStats) {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }

  function nextQuestion() {
    clearTimer();

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
        choice === "A" ? { a: current.a + 1, b: current.b } : { a: current.a, b: current.b + 1 };

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
    // reset state and index so it feels intentional
    clearTimer();
    resultOpacity.setValue(0);
    setPicked(null);
    setLocked(false);
    setIndex(0);
    setFilter(next);
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

  const hasFiltered = filteredQuestions.length > 0;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>WOULD YOU RATHER</Text>

            {/* CATEGORY FILTER */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
            >
              {/* ALL */}
              <Pressable
                onPress={() => setFilterAndReset("All")}
                style={[
                  styles.chip,
                  filter === "All" && { borderColor: accent, backgroundColor: "#171717", borderWidth: 2 },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    filter === "All" && { color: "#FFFFFF" },
                  ]}
                >
                  All
                </Text>
              </Pressable>

              {/* CATEGORIES */}
              {categories.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setFilterAndReset(c)}
                  style={[
                    styles.chip,
                    filter === c && { borderColor: accent, backgroundColor: "#171717", borderWidth: 2 },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      filter === c && { color: "#FFFFFF" },
                    ]}
                  >
                    {c}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

      {!hasFiltered && filter !== "All" ? (
        <View style={[styles.emptyState, { borderColor: accent }]}>
          <Text style={styles.emptyTitle}>No questions yet</Text>
          <Text style={styles.emptyText}>Add more questions to: {filter}</Text>
        </View>
      ) : (
        <>
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

          {/* RESULT AREA */}
          <View style={styles.resultSlot}>
            <Animated.View style={[styles.resultWrap, { opacity: resultOpacity }]}>
              <Pressable
                disabled={!picked}
                onPress={nextQuestion}
                style={[styles.resultCard, { borderColor: accent }]}
              >
                <Text style={styles.resultTitle}>RESULT</Text>

                <View style={styles.resultRow}>
                  <Text style={[styles.resultPct, aSelected && { color: accent }]}>A: {percentA}%</Text>
                  <Text style={[styles.resultPct, bSelected && { color: accent }]}>B: {percentB}%</Text>
                </View>

                <Text style={styles.resultFooter}>Tap to continue</Text>
              </Pressable>
            </Animated.View>
          </View>
        </>
      )}
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

  chipsRow: {
    gap: 10,
    paddingVertical: 6,
    paddingRight: 6,
  },
  chip: {
    borderWidth: 1,
    borderColor: "#2A2A2A",
    backgroundColor: "#0F0F0F",

    paddingHorizontal: 14,
    paddingVertical: 6, // 👈 mycket mindre

    borderRadius: 8, // 👈 mindre radie
    justifyContent: "center",
    alignItems: "center",
  },
  
  chipActive: {
    borderColor: "#FFFFFF",
    backgroundColor: "#1B1B1B",
  },

  chipText: {
    color: "#8E8E8E",
    fontSize: 13,
    letterSpacing: 1,
    textTransform: "uppercase",

    lineHeight: 16, // 👈 kontrollerar vertikal balans
    includeFontPadding: false, // 👈 Android fix
    textAlignVertical: "center", // 👈 Android fix
  },

  chipTextActive: {
    color: "#FFFFFF",
  },

  emptyState: {
    borderWidth: 2,
    borderColor: "#2A2A2A",
    backgroundColor: "#111111",
    borderRadius: 22,
    padding: 18,
    gap: 8,
  },
  emptyTitle: { color: "white", fontSize: 18, textAlign: "center" },
  emptyText: { color: "#9A9A9A", textAlign: "center" },

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
    gap: 10,
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
  resultFooter: {
    color: "#9A9A9A",
    textAlign: "center",
  },
});
