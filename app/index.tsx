import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, ScrollView, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Sharing from "expo-sharing";
import ViewShot from "react-native-view-shot";

import { categories, questions } from "./data/questions";
import type { Category } from "./data/questions";

import { styles } from "./styles/indexStyles";

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

  const shareShotRef = useRef<ViewShot | null>(null);
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

            <View style={[styles.sharePickedBadge, { borderColor: accent }]}>
              <Text style={[styles.sharePickedText, { color: accent }]}>
                YOU CHOSE {picked}
              </Text>
            </View>

            <View style={[styles.shareFrame, { borderColor: accent }]}>
              <View style={styles.shareChoice}>
                <Text style={styles.shareChoiceLabel}>A</Text>
                <Text style={styles.shareChoiceText}>{q.a}</Text>
                <Text style={[styles.sharePct, picked === "A" && { color: accent }]}>
                  {percentA}% chose A
                </Text>
              </View>

              <Text style={styles.shareOr}>OR</Text>

              <View style={styles.shareChoice}>
                <Text style={styles.shareChoiceLabel}>B</Text>
                <Text style={styles.shareChoiceText}>{q.b}</Text>
                <Text style={[styles.sharePct, picked === "B" && { color: accent }]}>
                  {percentB}% chose B
                </Text>
              </View>
            </View>

            <Text style={[styles.shareFooter, { color: accent }]}>
              WHAT WOULD YOU PICK?
            </Text>
          </View>
        </ViewShot>
      </View>
    </View>
  );
}